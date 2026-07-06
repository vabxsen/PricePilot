# 00 — Product Vision & Strategy

## 1. Vision

**PricePilot helps people never overpay again.** It turns the chaotic, retailer-controlled world of online pricing into a transparent, user-controlled feed: track anything, understand its price history, and act at the right moment.

**Mission statement:** *Give every shopper the pricing intelligence that only retailers and resellers have today.*

**Positioning:** A consumer-grade, cross-retailer price tracker with the polish of a modern SaaS product — faster and more trustworthy than legacy tools (CamelCamelCamel, Keepa), broader than single-retailer trackers, and more actionable than browser-only extensions.

### Why now
- Dynamic/personalized pricing is expanding — shoppers feel the information asymmetry.
- Headless-browser scraping + cheap object storage + time-series DBs make historical tracking affordable.
- Push/email infra (Resend, FCM) and edge hosting let a small team run a polished product cheaply.

## 2. Target users & personas

| Persona | Need | Key feature |
|---------|------|-------------|
| **Deal Hunter Dana** | Buy at the lowest possible price | Target-price alerts, price history, deal score |
| **Big-Purchase Ben** | Timing a laptop/appliance buy | Forecasts, "is this a good time to buy?" signal |
| **Reseller Rita** | Monitor many SKUs for arbitrage | Bulk import, API access, CSV export, watchlists |
| **Gifter Grace** | Casual, occasional tracker | One-click track via extension, simple email alerts |
| **Business Bea (B2B)** | Competitor price monitoring | Team workspaces, API, dashboards, SLAs |

## 3. Core value propositions
1. **Track anything, anywhere** — any retailer via URL, extension, or API.
2. **Trustworthy history** — verified, tamper-evident price timelines (not retailer-manipulated "was" prices).
3. **Smart alerts** — target price, % drop, all-time-low, back-in-stock, price-drop forecasts.
4. **Beautiful, fast UX** — sub-second dashboards, dark mode, mobile-first PWA.

## 4. Primary user flows

### 4.1 Onboarding → first tracked product (the "aha" in < 60s)
1. Land on marketing page → "Track a price free" CTA.
2. Paste a product URL (no signup required to preview).
3. PricePilot resolves the product, shows current price + a teaser of history.
4. Prompt: "Set an alert" → lightweight signup (OAuth/passkey/magic link).
5. User sets target price → confirmation + first alert scheduled.

**Design principle:** deliver value *before* asking for signup. Anonymous preview → convert on intent.

### 4.2 Add a product to track
- **URL paste** (web): resolver identifies retailer + product, dedupes against catalog.
- **Browser extension**: one-click "Track on PricePilot" on any product page; injects a price badge showing history inline.
- **API / bulk CSV** (power users/B2B).
- **Share sheet / mobile PWA** ("Add to PricePilot").

### 4.3 Managing alerts
- Per-product: target price, % drop from current, all-time-low, back-in-stock.
- Global defaults + per-product overrides.
- Snooze, pause, and "notify once vs. every drop".
- Channel selection: email, web push, mobile push, SMS (paid).

### 4.4 Receiving an alert
- Notification deep-links to the product's PricePilot page with a "Buy now" out-link (affiliate-tagged).
- Alert includes: current price, drop amount/%, history sparkline, and confidence ("all-time low ✅").

### 4.5 Dashboard / watchlist
- Grid/list of tracked products with live price, delta since add, target progress bar.
- Filters: dropped, near target, back-in-stock, retailer, tag/list.
- Product detail: full price chart (with events), stats (min/max/avg/median), forecast, price-drop probability, alternative retailers for the same product.

## 5. Monetization

| Tier | Price | Limits & features |
|------|-------|-------------------|
| **Free** | $0 | Up to 20 tracked products, email alerts, daily checks, 6-month history |
| **Pro** | ~$5–8/mo | 500 products, hourly checks, push+SMS, 2-yr history, forecasts, no ads, API (rate-limited) |
| **Business** | ~$49+/mo | Team workspace, 10k+ SKUs, near-real-time checks, full API, exports, SSO, SLA |
| **Affiliate revenue** | — | Out-links to retailers via affiliate programs (Amazon Associates, Skimlinks/Impact) — primary revenue at consumer scale |

**Guiding rule:** monetize *convenience and scale* (frequency, volume, channels, API), never *access to the data a user already tracks*.

## 6. Success metrics (North Star + supporting)
- **North Star:** *Weekly Active Trackers* (users with ≥1 product checked & viewed in the week).
- Activation: % of signups who track ≥1 product within 24h.
- Retention: W4 retention of activated users.
- Alert quality: alert → out-click conversion; false-alert rate.
- Revenue: free→paid conversion, affiliate EPC (earnings per click), MRR.
- Reliability: % of tracked products successfully refreshed on schedule (SLO).

## 7. Non-goals (v1)
- Not a marketplace or checkout — we out-link to retailers.
- Not a coupon/cashback engine (roadmap, not v1).
- No manual/crowdsourced price entry in v1 (trust & abuse risk).
