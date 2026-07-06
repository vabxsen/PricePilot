# PricePilot

> Track any product's price across the web. Get alerted the moment it drops.

PricePilot is a modern price-tracking web application. Users paste a product URL (or add via browser extension), set a target price or discount threshold, and receive alerts (email, push, SMS) when the price moves. A rich dashboard shows price history, forecasts, and deal insights.

This repository contains the **complete production blueprint**. Start here, then read the detailed architecture.

## Documentation

| Doc | What's inside |
|-----|---------------|
| [`docs/00-product-vision.md`](docs/00-product-vision.md) | Vision, personas, user flows, monetization |
| [`docs/01-design-system.md`](docs/01-design-system.md) | Branding, design tokens, UI/UX system, IA |
| [`docs/02-frontend.md`](docs/02-frontend.md) | Frontend architecture & stack |
| [`docs/03-backend.md`](docs/03-backend.md) | Backend services, APIs, engine, scheduling |
| [`docs/04-data.md`](docs/04-data.md) | Database schema, caching, data lifecycle |
| [`docs/05-platform.md`](docs/05-platform.md) | Auth, security, infra, observability, CI/CD |
| [`docs/06-roadmap.md`](docs/06-roadmap.md) | Milestones with dependencies, roadmap |

## The 30-second architecture

```
                 ┌───────────────┐        ┌────────────────────┐
  Browser ─────► │  Next.js web  │ ─────► │   API (NestJS)     │
  Extension ───► │  (Vercel/Edge)│  REST/ │   REST + tRPC      │
                 └───────────────┘  WS    └─────────┬──────────┘
                                                     │
        ┌────────────────────────────────────────────┼───────────────────────┐
        │                       │                     │                       │
   ┌────▼─────┐          ┌───────▼──────┐      ┌───────▼──────┐        ┌───────▼──────┐
   │ Postgres │          │    Redis     │      │  BullMQ jobs │        │  Object store│
   │+TimescaleDB         │ cache/queues │      │  workers     │        │  (S3/R2)     │
   └──────────┘          └──────────────┘      └───────┬──────┘        └──────────────┘
                                                       │
                                            ┌──────────▼──────────┐
                                            │  Scraping fleet     │
                                            │  (Playwright +      │
                                            │  proxy rotation +   │
                                            │  retailer adapters) │
                                            └─────────────────────┘
```

## Recommended stack (TL;DR)

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind + shadcn/ui + TanStack Query
- **Backend:** NestJS (Node 22, TypeScript) + tRPC/REST + BullMQ workers
- **Data:** PostgreSQL 16 + TimescaleDB (price history) + Redis 7 + S3-compatible object store
- **Scraping:** Playwright fleet + retailer API adapters + residential proxy rotation
- **Auth:** Auth.js (NextAuth) or Clerk; JWT access + rotating refresh; OAuth + passkeys
- **Notifications:** Resend (email) + Firebase Cloud Messaging / Web Push + Twilio (SMS)
- **Infra:** Vercel (web) + Fly.io/AWS ECS (API & workers) + managed Postgres/Redis (Neon/Upstash or RDS/ElastiCache)
- **Observability:** OpenTelemetry + Grafana/Prometheus + Sentry + PostHog
- **CI/CD:** GitHub Actions + Turborepo + Docker + Terraform

See [`docs/06-roadmap.md`](docs/06-roadmap.md) for the milestone-by-milestone build order.
