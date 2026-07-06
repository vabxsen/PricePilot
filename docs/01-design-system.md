# 01 — Branding, Design System & Information Architecture

## 1. Brand

**Name:** PricePilot — connotes guidance, control, and automation ("autopilot for prices").

**Personality:** Confident, precise, friendly-expert. Think "a calm co-pilot," not a loud coupon site. Trust and clarity over hype.

**Voice & tone:**
- Clear and plain: "Price dropped $40 — now at its lowest ever."
- Encouraging, never pushy: "Looks like a good time to buy" not "BUY NOW!!!".
- Numeric and honest: always show the real data behind a claim.

**Logo concept:** A stylized paper-plane / navigation cursor merged with a downward price arrow. Wordmark in a geometric sans. Provide SVG mark (monochrome + full color), favicon, and app icon set.

### Color palette (tokens, not raw hex in components)

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--brand-primary` | `#2563EB` (blue-600) | `#3B82F6` | Primary actions, logo |
| `--brand-accent` | `#06B6D4` (cyan-500) | `#22D3EE` | Highlights, sparklines |
| `--success` | `#16A34A` | `#22C55E` | Price drops, good deals |
| `--warning` | `#D97706` | `#F59E0B` | Rising prices, near-limit |
| `--danger` | `#DC2626` | `#EF4444` | Price increase, errors |
| `--bg` / `--surface` | `#FFFFFF` / `#F8FAFC` | `#0B1120` / `#111827` | Page / cards |
| `--text` / `--muted` | `#0F172A` / `#64748B` | `#E2E8F0` / `#94A3B8` | Text |

Semantic pairing rule: **green = cheaper/good**, **red = pricier/bad** — consistent everywhere (charts, badges, deltas). Verified for WCAG AA contrast in both themes.

### Typography
- **UI/body:** `Inter` (variable) — excellent legibility, tabular numerals for prices.
- **Numerals:** enable `font-variant-numeric: tabular-nums` for all price displays so columns align.
- **Display/marketing:** `Cabinet Grotesk` or `Satoshi` for hero headings.
- Type scale (rem): 0.75 / 0.875 / 1 / 1.125 / 1.25 / 1.5 / 2 / 2.5 / 3.

### Spacing, radius, elevation
- 4px base spacing scale (4,8,12,16,24,32,48,64).
- Radius: `sm 6px`, `md 10px`, `lg 16px`, `full`.
- Elevation: soft, low-spread shadows; rely on borders in dark mode.

## 2. Design tokens & theming
- Tokens defined once as CSS variables + a `tokens.ts` export; consumed by Tailwind config (`theme.extend`) and shadcn/ui.
- Single source of truth in a `@pricepilot/design-tokens` package so web, extension, and emails share values.
- Dark mode via `prefers-color-scheme` + manual toggle (persisted). All components authored theme-aware.
- Motion: `prefers-reduced-motion` respected; default transitions 150–250ms ease-out.

## 3. Component library / design system
- **Base:** shadcn/ui (Radix primitives) — accessible, unstyled-then-tokenized, owned in-repo (not a black-box dependency).
- **Charts:** Recharts (or visx for custom) for price history; consistent color semantics; accessible tooltips, keyboard focus, and a data-table fallback.
- Core components: `Button`, `Input`, `Card`, `PriceTag`, `Delta` (▲▼ with color), `Sparkline`, `PriceChart`, `AlertRuleForm`, `ProductCard`, `DealScoreBadge`, `EmptyState`, `Toast`, `CommandPalette` (⌘K), `DataTable`.
- Documented in **Storybook** with a11y addon; visual regression via Chromatic/Playwright snapshots.
- Follow the `dataviz` skill for every chart: one coherent color system, light/dark parity, accessible legends/axes.

## 4. Accessibility (WCAG 2.2 AA)
- Semantic HTML, ARIA only where needed, full keyboard nav, visible focus rings.
- Color never the sole signal (pair with ▲/▼ icons and text).
- Charts have text/table equivalents; alerts readable by screen readers.
- Target contrast ≥ 4.5:1 body, 3:1 large text/UI.

## 5. Information architecture

```
Marketing (unauth)
├── / (landing, live URL-paste demo)
├── /how-it-works, /pricing, /deals (public trending drops — SEO)
├── /p/:slug  (public product pages — SEO goldmine)
└── /login, /signup

App (auth)
├── /dashboard              → watchlist grid, filters, summary stats
├── /product/:id            → detail: chart, stats, forecast, alerts, retailers
├── /add                    → add-product flow (URL/search/bulk)
├── /alerts                 → all alert rules + history
├── /lists/:id              → collections/tags
├── /settings
│   ├── /profile, /notifications, /billing, /api-keys, /security
├── /workspace/:id (Business) → team, members, shared watchlists
└── /admin (internal)       → scraper health, retailer adapters, moderation
```

**Navigation:** Left sidebar (collapsible) in-app; top bar with ⌘K command palette, notifications bell, account menu. Mobile: bottom tab bar (Dashboard, Add, Alerts, Settings).

**SEO strategy:** Public `/p/:slug` and `/deals` pages are server-rendered, indexable, and drive organic acquisition ("iPhone 16 price history") — a major growth channel and a competitive moat (CamelCamelCamel's traffic is largely SEO).

## 6. Key screens (spec highlights)
- **Landing:** hero with a real, working URL-paste demo → instant price + teaser chart. Social proof, "how it works," pricing.
- **Dashboard:** dense-but-calm card grid; each card = image, name, current price, delta since add, target progress, retailer, quick actions (pause, edit alert, open). Summary bar: total tracked, dropped this week, potential savings.
- **Product detail:** big price chart (range toggles 1M/6M/1Y/All), stat tiles (current, all-time low/high, avg, since-added delta), deal score, forecast band, alert rule editor, alternative retailers table, out-link "Buy" button.
- **Add flow:** paste URL → resolver preview card (confirm it's the right product/variant) → set alert → done. Progressive, one primary action per step.
- **Empty states:** friendly, instructive, with a sample product to try.
