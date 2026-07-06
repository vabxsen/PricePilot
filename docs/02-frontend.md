# 02 — Frontend Architecture

## 1. Stack & justification

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | **Next.js 15 (App Router) + React 19** | SSR/ISR for SEO-critical public pages, RSC for fast dashboards, edge-ready, huge ecosystem, first-class Vercel hosting |
| Language | **TypeScript (strict)** | Type safety end-to-end (shared types with backend via tRPC/Zod) |
| Styling | **Tailwind CSS + shadcn/ui** | Token-driven, fast, consistent, accessible; owned components |
| Data fetching | **TanStack Query** (client) + RSC/server actions (server) | Caching, background refetch, optimistic updates, WS/SSE integration |
| API client | **tRPC** (internal) + generated REST client (public API) | End-to-end type safety with zero codegen drift for our own app |
| State | **Zustand** for UI state; server state lives in TanStack Query | Minimal, avoids Redux boilerplate |
| Forms | **React Hook Form + Zod** | Performant, schema validation shared with backend |
| Charts | **Recharts / visx** | Price history with semantic colors; accessible |
| Realtime | **WebSocket (Socket.IO) or SSE** | Live price/alert updates on dashboard |
| PWA | **next-pwa / Serwist** | Installable, offline shell, push notifications |
| i18n | **next-intl** | Locale + currency formatting (critical for prices) |
| Tables | **TanStack Table** | Virtualized watchlists for power users |
| Testing | **Vitest + Testing Library + Playwright** | Unit/component/E2E |
| Tooling | **Turborepo + pnpm + Biome/ESLint + Prettier** | Monorepo, fast lint/format |

## 2. Monorepo layout (Turborepo)

```
apps/
  web/              # Next.js app (marketing + app)
  extension/        # Browser extension (WXT + React)
  mobile/           # (roadmap) Expo/React Native
  api/              # NestJS backend
  workers/          # BullMQ scraping/notification workers
packages/
  ui/               # shared component library (shadcn-based)
  design-tokens/    # colors, spacing, type scale
  config/           # eslint/tsconfig/tailwind presets
  types/            # shared Zod schemas & TS types
  sdk/              # public API client (generated from OpenAPI)
  emails/           # React Email templates
```

## 3. Rendering strategy
- **Marketing + `/p/:slug` + `/deals`:** SSG/ISR (revalidate on price update webhook) → indexable, cacheable at the edge.
- **Dashboard & product detail:** RSC for the shell + streamed data; client components for interactive charts and live updates.
- **Personalized data:** fetched per-request (auth) with edge/CDN cache bypass; heavy price history served from a cached, pre-aggregated endpoint.
- **Optimistic UI:** adding/pausing a tracker updates instantly, reconciled on server response.

## 4. Performance budget
- LCP < 2.0s, INP < 200ms, CLS < 0.1 (Core Web Vitals — also SEO ranking factors).
- Route-level code splitting; ship < 90KB JS on marketing routes.
- Images via `next/image` + object-store CDN; blur placeholders.
- Price charts lazy-loaded; history data paginated/downsampled server-side.
- Prefetch on hover/intent; TanStack Query cache warm on navigation.

## 5. Realtime & live updates
- Dashboard subscribes to a per-user channel; server pushes `price.updated` / `alert.triggered` events.
- Fallback to polling (TanStack Query `refetchInterval`) when WS unavailable.
- Web Push for background alerts even when the tab is closed (Service Worker + VAPID).

## 6. Browser extension (a top acquisition channel)
- Built with **WXT** (modern web-extension framework) + React, sharing `packages/ui` and `design-tokens`.
- Content script injects a "Track on PricePilot" button and an inline price-history badge on supported retailer product pages.
- Uses the same public API + a scoped extension token.
- MV3, cross-browser (Chrome, Edge, Firefox).

## 7. Frontend quality gates
- Storybook + Chromatic visual regression.
- Playwright E2E for critical flows (add product, set alert, receive alert).
- axe-core a11y checks in CI.
- Lighthouse CI budget enforcement on PRs.
