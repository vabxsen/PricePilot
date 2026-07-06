# 01 — Branding, Design System & Information Architecture

## 1. Brand

**Name:** PricePilot — connotes guidance, control, and automation ("autopilot for prices").

**Personality:** Confident, precise, friendly-expert. Think "a calm co-pilot," not a loud coupon site. Trust and clarity over hype.

**Voice & tone:**
- Clear and plain: "Price dropped $40 — now at its lowest ever."
- Encouraging, never pushy: "Looks like a good time to buy" not "BUY NOW!!!".
- Numeric and honest: always show the real data behind a claim.

**Logo concept:** A stylized paper-plane / navigation cursor merged with a downward price arrow. Wordmark in a geometric sans. Provide SVG mark (monochrome + full color), favicon, and app icon set.

### Color palette — v2 (2026-07-06 brand refresh)

The app now runs on **one deliberate dark theme** built from two brand colors, rather than a light/dark toggle:

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#020202` | Page background |
| `--surface` | `#121212` (0 0% 7%) | Cards, inputs |
| `--surface-raised` | `#1c1c1c` (0 0% 11%) | Hover states |
| `--brand` | `#ff2500` | Logo, CTAs, links, price-drop signal, focus rings |
| `--brand-hover` | `#e01f00` (9 100% 44%) | Hover/active on brand elements |
| `--warning` | `#ffc61a` (40 100% 55%) | Sparse caution states (e.g. "no price detected") |
| `--text` / `--text-muted` / `--text-faint` | `#f5f5f5` / `#9e9e9e` / `#666666` | Primary / secondary / tertiary text |

**Semantic pairing rule (revised):** red is the brand's hero color, so it's reserved for the *exciting* signal — **price drops** — following retail convention (sale tags are red, not green). Price **increases** are deliberately quiet/muted gray: this product is about drops, so increases don't compete for attention. Errors/form validation also use brand red, disambiguated by context (icon, copy, placement) rather than a second red hue — keeps the palette to exactly the two given brand colors plus neutrals.

Implementation: CSS custom properties in `apps/web/src/index.css`, mapped to Tailwind tokens (`bg`, `surface`, `surface-raised`, `brand`, `brand-hover`, `warning`, `ink`/`ink-muted`/`ink-faint`) in `apps/web/tailwind.config.ts`. `danger` is aliased to `brand` for continuity in older component code.

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
