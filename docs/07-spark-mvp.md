# 07 — Spark-Plan MVP (the $0 build we're shipping first)

> The blueprint in docs 00–06 is the **scale target**. This doc is the **buildable MVP** that runs entirely on free tiers, constrained to the **Firebase Spark plan**. Nothing here is throwaway — it's the first rung, and the migration path to the full stack is called out at the end.

## 1. Why the architecture changed

Firebase **Spark (free)** gives us **static hosting only** — Cloud Functions and App Hosting both require **Blaze**. There is no server-side compute, no Postgres, no Redis, no Playwright fleet on Firebase. A price tracker needs scheduled outbound scraping, so we move the "engine" **off Firebase** onto another free tier: **GitHub Actions cron**.

## 2. Architecture

```
  ┌─────────────────────────┐        reads/writes (client SDK,
  │  Web app (Vite + React)  │◄──────  guarded by security rules)
  │  Firebase Hosting (free) │────────────────┐
  └─────────────────────────┘                 ▼
             ▲                          ┌──────────────┐
        Firebase Auth  ◄────────────────│   Firestore   │
        (Google/email)                  │  (free tier)  │
                                        └──────▲────────┘
                                               │ writes (Admin SDK)
                              ┌────────────────┴─────────────────┐
                              │   GitHub Actions cron (~hourly)   │
                              │   scraper: fetch + JSON-LD parse  │
                              │   → write price points            │
                              │   → evaluate alerts               │
                              │   → send FCM push + Resend email  │
                              └───────────────────────────────────┘
```

- **No backend server.** The web app talks to Firestore directly; Firestore **security rules** enforce per-user access.
- **Live UI for free** via Firestore realtime listeners.
- **The scraper is the only "backend,"** and it's a scheduled CI job.

## 3. Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Web | **Vite + React 19 + TypeScript** | Pure static SPA → clean fit for Spark Hosting (no SSR gotchas). Tailwind + shadcn/ui + design tokens reused from the blueprint. |
| Routing | React Router | SPA routing; Firebase Hosting rewrite `**` → `/index.html`. |
| Data/client | Firebase JS SDK v10 (modular) + **TanStack Query** wrapping Firestore reads | Caching + realtime listeners. |
| Auth | **Firebase Auth** | Google + email/password + magic link. |
| DB | **Cloud Firestore** | Document model below. |
| Push | **FCM** (Web Push via VAPID) | Sent from the Actions job through Admin SDK. |
| Email | **Resend** (100/day) or **Brevo** (300/day) free tier | From the Actions job. |
| Scraper | **Node 22 + TypeScript**, `undici` fetch + `cheerio`/JSON-LD; **Playwright only when needed** | Runs in GitHub Actions. |
| Hosting | **Firebase Hosting** (Spark) | `firebase deploy --only hosting` from CI. |
| CI/CD | **GitHub Actions** | One workflow deploys web, one runs the scrape cron. |

## 4. Firestore data model

Firestore is document-oriented; we denormalize for cheap reads.

```
users/{uid}
  email, displayName, plan, createdAt, notificationPrefs, fcmTokens[]

products/{productId}                    // canonical, deduped by URL hash
  title, brand, imageUrl, retailer, url, externalId,
  currency, currentPrice, inStock, lastCheckedAt, nextCheckAt,
  allTimeLow, allTimeHigh, trackerCount

products/{productId}/history/{yyyy-mm-dd or autoId}
  ts, price, inStock, source                // append only on change

users/{uid}/trackers/{trackerId}
  productId, priceAtAdd, paused, tags[], createdAt,
  alertRules: [{ type, threshold, channels[], repeat, lastFiredAt, snoozeUntil }]

users/{uid}/notifications/{id}
  productId, channel, status, payload, createdAt
```

**Write-minimization (Spark quota = ~20k writes/day):**
- History point written **only when price/stock changes**.
- Shared `products/{id}` scraped **once** regardless of how many users track it (`trackerCount` fan-in) — the same dedupe win as the full blueprint.
- Batch writes in the scraper.

**Security rules (sketch):** users read/write only their own `users/{uid}/**`; `products/**` is world-readable, writable only by the Admin SDK (server); never writable by clients.

## 5. The scraper (GitHub Actions engine)

`.github/workflows/scrape.yml` — `schedule: cron` (start hourly) + manual `workflow_dispatch`:

1. Load Firebase Admin SDK using a **service-account secret** (`FIREBASE_SERVICE_ACCOUNT` in repo secrets).
2. Query `products` where `nextCheckAt <= now` (adaptive interval per product).
3. For each: fetch page (cheap `undici` first; Playwright fallback), extract price via **JSON-LD `schema.org/Offer`** → OpenGraph → per-retailer selector.
4. Sanity-check (not $0, plausible vs. history) → write a history point **only if changed**; update product summary + `nextCheckAt`.
5. Evaluate each tracking user's alert rules → send **FCM** + **Resend** email; record notification; respect `repeat`/`snooze`.

**Constraints we design around:**
- Cron is best-effort (~5-min floor, sometimes delayed). Hourly is realistic and plenty for MVP.
- Public repo = unlimited Actions minutes; keep the job fast (prefer HTTP over Playwright).
- **No proxies** → start with scraping-tolerant retailers that expose JSON-LD. Amazon/aggressive sites are out until Blaze + proxies.
- Keep secrets in **GitHub Secrets**, never in the repo.

## 6. Repo structure (pnpm workspace)

```
apps/web/                 Vite React SPA (the app + marketing)
services/scraper/         Node/TS scraper run by GitHub Actions
packages/shared/          Firestore types + Zod schemas + price logic (shared web↔scraper)
packages/config/          tsconfig / eslint / tailwind presets
firestore.rules           security rules
firebase.json             hosting + rules config
.github/workflows/
  deploy-web.yml          build + firebase deploy --only hosting
  scrape.yml              scheduled scrape engine
```

Sharing `packages/shared` means the alert-evaluation and price logic is written **once** and used by both the web app (preview/optimistic UI) and the scraper (authoritative).

## 7. Spark-flavored milestones (supersedes docs 06 for the MVP)

- **S0 — Scaffold:** pnpm workspace, Vite web app shell, Firebase project wiring, shared package, CI skeleton. *(no Firebase creds needed to build UI)*
- **S1 — Auth + Firestore + rules:** Firebase Auth (Google/email), user doc bootstrap, security rules, protected dashboard route. *(needs your Firebase project)*
- **S2 — Add & track:** URL submit → resolve via JSON-LD (client-side preview) → create `product` + `tracker`; dashboard reads trackers live.
- **S3 — Scraper engine:** `services/scraper` + `scrape.yml` cron; writes history, updates products; adapters for 2–3 tolerant retailers with golden fixtures.
- **S4 — History & insights UI:** product detail with price chart (Recharts), stat tiles, all-time-low badge.
- **S5 — Alerts & notifications:** alert-rule editor, alert evaluation in scraper, FCM web push + Resend email, preferences.
- **S6 — Polish & deploy:** empty states, PWA/installable, `deploy-web.yml` auto-deploy to Firebase Hosting, docs.

Dependencies are linear S0→S6; adapters (part of S3) continue growing after.

## 8. Migration path to the full blueprint (when you outgrow free)
1. **Scraper → Cloud Run** (Blaze) with BullMQ/Redis when cron/volume limits bite.
2. **Firestore → Postgres + TimescaleDB** if you need heavy history queries/analytics (dual-write, then cut over).
3. **Add proxies** to unlock aggressive retailers.
4. **SSR/SEO:** move web to Next.js on App Hosting/Cloud Run for `/p/:slug` indexable pages.

Each step is independent and incremental — the Firestore schema and shared logic port over cleanly.
