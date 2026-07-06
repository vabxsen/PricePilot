# 06 — Development Milestones & Roadmap

Milestones are ordered so each builds on the last. **Dependencies** are listed explicitly. Build them one at a time; each ends in a shippable, testable increment.

## Legend
- 🎯 Goal · 📦 Deliverables · 🔗 Depends on · ✅ Done-when

---

### M0 — Foundations & scaffolding
🎯 A working monorepo, CI, and deploy pipeline with a "hello world" web + API.
📦
- Turborepo + pnpm workspace; `apps/web` (Next.js), `apps/api` (NestJS), shared `packages/{ui,design-tokens,types,config}`.
- Docker images, Terraform for base infra (Postgres+Timescale, Redis, object store, DNS/CDN).
- GitHub Actions CI (lint, typecheck, test, build, preview deploy).
- Auth.js skeleton, Prisma connected, `/health` endpoints, Sentry + OTel wired.
🔗 none.
✅ PR opens a preview env; `main` deploys to staging automatically.

---

### M1 — Design system & app shell
🎯 The visual foundation and navigable (empty) app.
📦
- Design tokens, Tailwind config, shadcn/ui base components, Storybook.
- Branding: logo, favicon, color/type system, dark mode.
- App shell: marketing landing, auth screens, dashboard layout, sidebar/nav, ⌘K palette, empty states.
🔗 M0.
✅ Storybook published; app navigable; Lighthouse/a11y budgets pass on marketing routes.

---

### M2 — Auth & accounts
🎯 Real users can sign up, log in, manage profile.
📦
- OAuth (Google/Apple) + magic link + passkeys; sessions, JWT + refresh rotation.
- User/session/account schema; profile & security settings; RBAC scaffolding.
🔗 M1.
✅ End-to-end signup→login→logout works; E2E test green; MFA available.

---

### M3 — Product resolution + first retailer adapter
🎯 Paste a URL → get a real product + current price.
📦
- Retailer detector + adapter interface; **one** adapter (start with a JSON-LD-friendly retailer, e.g. a major store or Amazon via PA-API).
- Product/ProductListing schema + dedupe; resolver cache (Redis); anonymous URL-paste preview on landing.
🔗 M2 (schema/infra); core engine interfaces from doc 03.
✅ Landing demo resolves a real URL to product + price; adapter golden tests pass.

---

### M4 — Tracking & price history storage
🎯 Users track products; prices are recorded over time.
📦
- Tracker + AlertRule schema; "add to track" flow (URL → confirm → set alert).
- TimescaleDB `price_point` hypertable + daily continuous aggregate; ingest-worker writes points on change.
- Dashboard watchlist (live current price, delta since add); product detail with price chart + stat tiles.
🔗 M3.
✅ Track a product, see it on dashboard with a (short) history chart; retention policy applied.

---

### M5 — Scheduling & scraping fleet
🎯 Prices refresh automatically on a schedule, at scale.
📦
- BullMQ queues; scheduler enqueues due checks via `nextCheckAt`; scrape-worker (Playwright pool + HTTP/JSON-LD fast path); proxy rotation; adaptive frequency by plan + volatility.
- Adapter health monitoring; anomaly guard in ingestion; 3–5 top retailer adapters.
🔗 M4.
✅ Tracked listings refresh unattended; scrape success rate dashboarded; workers autoscale on queue depth.

---

### M6 — Alerts & notifications
🎯 Users get notified when prices hit their rules.
📦
- Alert evaluation on new price points (target/percent/all-time-low/back-in-stock); debounce/dedupe/snooze.
- notify-worker + channels: email (Resend + React Email), web push (VAPID/Service Worker). Preferences, quiet hours, digests, unsubscribe.
- Realtime dashboard updates (WS/SSE) + PWA installable.
🔗 M5.
✅ Simulated drop → alert delivered p95 < 60s; notification status tracked; preferences respected.

---

### M7 — Billing & plans
🎯 Monetization live.
📦
- Stripe subscriptions (Free/Pro/Business), plan-gated limits (tracked count, check frequency, channels, history retention), billing portal, webhooks.
- Affiliate out-link tagging on all "Buy" links.
🔗 M6.
✅ Upgrade/downgrade works; limits enforced; affiliate links attributed.

---

### M8 — Public API, SDK & browser extension
🎯 Power users, third parties, and a key acquisition channel.
📦
- Versioned REST `/v1` + OpenAPI + generated SDK; API keys + scopes + rate limits.
- Browser extension (WXT): one-click track + inline price-history badge.
🔗 M7 (plan-gated API), M3–M6 engine.
✅ Third-party can resolve/track/read history via API; extension tracks from a retailer page.

---

### M9 — Insights, forecasts & SEO growth
🎯 Differentiation + organic growth engine.
📦
- Deal score, percentile, drop-cadence stats (v1); forecast-worker with price-drop probability (v2 ML).
- Public SEO pages `/p/:slug` (ISR) + `/deals` trending drops; structured data; sitemap.
🔗 M4 (history), M5 (data volume).
✅ Product pages indexable & fast; forecasts shown; organic traffic measurable in PostHog/GSC.

---

### M10 — Teams, hardening & scale
🎯 Business tier + production-grade reliability.
📦
- Workspaces, roles, shared watchlists, outbound webhooks, SSO, exports.
- Full observability SLOs/alerts, load & chaos testing, DR drills, security review (SAST/DAST/pen test), multi-region reads.
🔗 M7, M8.
✅ SLOs met under load; security review passed; Business tier GA.

---

## Critical path
`M0 → M1 → M2 → M3 → M4 → M5 → M6` is the backbone (a working, alerting price tracker). M7–M10 layer on monetization, distribution, differentiation, and scale. M9's SEO pages can begin as soon as M4 has data.

## Parallelization opportunities (once M4 lands)
- Extension (M8) can develop against the API in parallel with M5/M6.
- SEO public pages (M9) parallel with M6/M7.
- Adapter development is continuous — add retailers throughout.

## Post-v1 roadmap
- Mobile apps (Expo/React Native) sharing `packages/{ui,sdk}`.
- Coupons/cashback, camelizer-style browser price overlays.
- Price-prediction "best time to buy" model v3; category trend reports.
- Marketplace/reseller B2B analytics; competitor-monitoring dashboards.
- International expansion: multi-currency, regional retailers, localized SEO.
- AI shopping assistant ("find me the best time & place to buy X") over the pricing graph.

## Team & sequencing note
A lean team can ship M0–M6 (the core product) then monetize (M7) before investing in M8–M10. Prioritize **adapter reliability** and **alert trustworthiness** above feature breadth — they are the product's credibility.
