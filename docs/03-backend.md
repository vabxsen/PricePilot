# 03 — Backend Architecture, APIs & Price-Tracking Engine

## 1. Stack & justification

| Concern | Choice | Why |
|---------|--------|-----|
| Runtime/lang | **Node.js 22 + TypeScript** | Shared language/types with frontend; excellent for I/O-bound scraping & async jobs; huge ecosystem |
| Framework | **NestJS** | Opinionated, modular, DI, testable; scales from monolith to microservices; first-class validation/guards/interceptors |
| Internal API | **tRPC** | End-to-end type safety with the Next.js app, zero drift |
| Public API | **REST + OpenAPI 3** (Zod → OpenAPI) | Language-agnostic for third parties; documented, versioned |
| Validation | **Zod** (shared with frontend) | One schema, both sides |
| ORM | **Prisma** (+ raw SQL/Kysely for hot paths & Timescale) | Type-safe, great DX, migrations; escape hatch for time-series queries |
| Jobs/queues | **BullMQ (Redis)** | Reliable delayed/repeatable jobs, rate limiting, priorities — ideal for scheduled scraping & notifications |
| Scraping | **Playwright** fleet + lightweight HTTP (undici/got) + retailer API adapters | Handle JS-heavy sites and simple ones efficiently |
| Realtime | **Socket.IO / SSE** | Push price & alert events |
| Search | **Postgres FTS → Meilisearch/Typesense** (scale) | Product search/autocomplete |

**Why not a serverless-only backend?** Scraping needs long-running, stateful, rate-limited workers with browser processes and proxy pools — a poor fit for short-lived lambdas. We run **stateless API on managed containers** + **dedicated worker pools**. Serverless is used selectively (webhooks, image processing).

## 2. Service topology

Start as a **modular monolith** (NestJS modules), deployable as one service, with clean boundaries so heavy parts split out later:

```
API service (stateless, autoscaled)
  ├── auth module
  ├── products module (catalog, resolver)
  ├── tracking module (watchlists, alert rules)
  ├── pricing module (history read APIs, stats, forecast)
  ├── notifications module (dispatch API)
  ├── billing module (Stripe)
  └── admin module

Worker services (separate deployables, scaled independently)
  ├── scrape-worker      (Playwright + adapters + proxies)
  ├── scheduler          (enqueues due checks)
  ├── notify-worker      (email/push/sms fan-out)
  ├── forecast-worker    (batch stats & ML predictions)
  └── ingest-worker      (normalize/dedupe/write price points)
```

Communication: HTTP/tRPC for sync, **BullMQ queues** for async, **Redis pub/sub** for realtime fan-out.

## 3. The price-tracking engine (the heart)

### 3.1 Product resolution
1. User submits URL (or extension sends structured data).
2. **Retailer detector** maps domain → adapter.
3. **Adapter** extracts canonical product ID + variant (color/size/seller), title, image, price, currency, availability.
4. **Deduplication:** normalize into a `Product` (canonical) + `ProductListing` (per-retailer offer). Multiple users tracking the same listing share one scrape target (huge efficiency win).

### 3.2 Retailer adapters (pluggable)
- Interface: `resolve(url) → ProductRef`, `fetchPrice(listing) → PriceSnapshot`.
- Three extraction tiers, tried in order:
  1. **Official/affiliate API** (e.g., Amazon Product Advertising API, Best Buy API) — most reliable/legal where available.
  2. **Structured data** — JSON-LD (`schema.org/Product/Offer`), OpenGraph, microdata (cheap, no browser).
  3. **Headless render** (Playwright) with per-site selectors + heuristics — fallback for JS-rendered prices.
- Each adapter is versioned, self-testing (golden fixtures), and health-monitored. When a site changes layout, the adapter's success rate drops → alert → fix. Store raw HTML snapshots for debugging/replay.

### 3.3 Scraping infrastructure
- **Playwright** browsers pooled per worker; reuse contexts, block images/fonts/ads to cut bandwidth.
- **Proxy rotation:** pool of residential/datacenter proxies (Bright Data/Oxylabs/Smartproxy) selected per retailer; sticky sessions where needed.
- **Anti-bot etiquette & resilience:** realistic headers/UA, per-domain concurrency & rate limits, randomized jitter, exponential backoff, CAPTCHA detection → route to solver or mark degraded.
- **Politeness & compliance:** respect `robots.txt` where legally expected, throttle per domain, cache aggressively, prefer official APIs. Document a compliance policy per retailer (see security doc).
- **Cost control:** dedupe shared listings, tier check frequency by plan, use cheap HTTP/JSON-LD path before spinning a browser.

### 3.4 Scheduling
- **Scheduler** service runs on a cron tick (e.g., every minute) and enqueues due checks based on each listing's `next_check_at`.
- **Adaptive frequency:**
  - Base cadence by plan (Free: daily, Pro: hourly, Business: ~15 min).
  - **Volatility-aware:** frequently-changing prices checked more often; stable ones backed off (saves cost, catches drops).
  - **Event-aware:** boost frequency near known sale events (Black Friday, Prime Day) and when a user's target is close.
- Jobs are **idempotent** and de-duplicated (one job per listing per window) via BullMQ job IDs.
- Spread load with jitter to avoid thundering herds against a retailer.

### 3.5 Ingestion & price-point writing
1. `scrape-worker` produces a `PriceSnapshot` (raw).
2. `ingest-worker` validates (sanity checks: not $0, within plausible band vs. history → flags anomalies/scrape errors), normalizes currency, and **writes a price point only if changed** (or a heartbeat "still same" at reduced granularity).
3. On change → emit `price.updated` event → triggers alert evaluation + realtime push + ISR revalidation of public page.

### 3.6 Alert evaluation
- On each new price point, evaluate matching alert rules for that listing:
  - `target_price` reached, `percent_drop` from reference, `all_time_low`, `back_in_stock`, `price_increase` (for sellers).
- Debounce & dedupe (don't re-alert on the same drop; respect "notify once vs. every drop" and snooze).
- Matched rules → enqueue notification jobs (per channel).

### 3.7 Forecasting & insights (progressive)
- **v1 (stats):** all-time min/max/avg/median, percentile of current price, "deal score" (how good is now vs. history), typical drop cadence.
- **v2 (ML):** price-drop probability & short-horizon forecast using Timescale continuous aggregates → gradient-boosted models (LightGBM) or a lightweight time-series model, run in `forecast-worker` on a batch schedule. Features: seasonality, retailer sale patterns, days-since-last-drop, category trends.
- Serve precomputed insights; never block request path on ML.

## 4. Notification system
- **Channels:** Email (**Resend** + React Email templates), Web Push (VAPID/Service Worker), Mobile Push (**FCM**), SMS (**Twilio**, paid tiers), plus optional Slack/Discord/webhook for Business.
- **Dispatch pipeline:** alert match → `notify-worker` → per-channel provider adapter → provider → delivery/bounce webhooks update status.
- **Preferences & quiet hours:** per-user channel prefs, digest vs. instant, quiet hours, per-product overrides.
- **Anti-spam & batching:** coalesce multiple drops into a **digest** when many fire together; global rate caps per user; unsubscribe/manage links.
- **Reliability:** at-least-once with idempotency keys; retries with backoff; dead-letter queue; delivery status tracked per notification.
- **Templating:** shared `packages/emails` (React Email) → consistent branding, dark-mode emails, tested rendering.

## 5. API design

### 5.1 Public REST API (versioned `/v1`)
Resource-oriented, cursor-paginated, `Idempotency-Key` on writes, `ETag`/conditional GETs, RFC-7807 problem+json errors.

```
POST   /v1/products/resolve      { url } → product + listing preview
GET    /v1/products/:id          product + listings
GET    /v1/products/:id/history  ?range=6m&interval=1d  (downsampled)
POST   /v1/trackers              { listingId, alertRules }
GET    /v1/trackers              user watchlist (paginated)
PATCH  /v1/trackers/:id          update alert rules / pause
DELETE /v1/trackers/:id
GET    /v1/alerts                alert history
POST   /v1/webhooks              (Business) register outbound webhooks
```

- **Auth:** Bearer JWT (app) or API key (third parties); scopes per key.
- **Rate limiting:** token-bucket in Redis, per user/key/plan; `429` + `Retry-After` + rate headers.
- **Docs:** auto-generated OpenAPI → Swagger UI + typed SDK in `packages/sdk`.

### 5.2 Internal API
- **tRPC** routers mirror modules; consumed by Next.js with full type inference and React Query integration.

### 5.3 Webhooks (outbound, Business tier)
- Signed (HMAC), retried with backoff, event types: `price.updated`, `alert.triggered`, `tracker.stock_changed`.

## 6. Scalability
- **Stateless API** behind a load balancer → horizontal autoscale on CPU/RPS.
- **Worker pools scale independently** by queue depth (KEDA/queue-length autoscaling). Scraping is the bottleneck — scale scrape-workers on backlog.
- **Shared-listing dedupe** means cost scales with *unique products*, not *users* — a structural efficiency.
- **Read scaling:** Postgres read replicas for history/analytics; Redis for hot reads; CDN for public pages.
- **Backpressure:** queue rate limits protect retailers and our proxies; graceful degradation (extend cadence) under overload.
- **Multi-region** (later): read replicas + edge rendering; workers near proxy egress.
