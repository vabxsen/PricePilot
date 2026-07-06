# 05 — Auth, Security, Infra, Observability, CI/CD, Testing

## 1. Authentication & authorization

| Concern | Choice | Why |
|---------|--------|-----|
| Auth framework | **Auth.js (NextAuth)** self-hosted, or **Clerk** if buying speed | OAuth + email + passkeys, session mgmt, adapters for Prisma |
| Methods | OAuth (Google, Apple), **magic link**, **passkeys (WebAuthn)**, email+password (argon2id) | Low-friction signup drives activation; passkeys = modern & phishing-resistant |
| Sessions/tokens | Short-lived **JWT access** (~15m) + **rotating refresh** tokens (httpOnly, secure, SameSite) | Stateless API auth + rev-ocable refresh |
| API auth | Bearer JWT (app) + hashed **API keys** with scopes (third parties) | Separate trust domains |
| Authorization | **RBAC** (user/admin) + workspace roles (owner/admin/member) + resource ownership checks (CASL/policy guards) | Team features + least privilege |
| MFA | TOTP + passkeys; enforced for admin | Protect sensitive accounts |

- CSRF protection on cookie-based flows; token binding; refresh rotation with reuse detection (revoke on replay).
- Admin panel behind SSO + IP allowlist + audit logging.

## 2. Security (defense in depth)
- **Transport:** TLS everywhere, HSTS, secure cookies.
- **App:** input validation (Zod) on every boundary; output encoding; parameterized queries (Prisma) → no SQLi; strict CSP, X-Frame-Options, Referrer-Policy; rate limiting & bot protection (WAF/Cloudflare) on public + auth endpoints.
- **Secrets:** never in code; managed via cloud secrets manager / Doppler; rotated; least-privilege IAM.
- **Dependencies:** Dependabot/Renovate, `npm audit`, SCA (Snyk), SBOM; pinned lockfiles.
- **AppSec in CI:** SAST (CodeQL/Semgrep), secret scanning (gitleaks), DAST on staging, container image scanning (Trivy).
- **Data:** encryption at rest (DB, object store), field-level encryption for sensitive tokens, hashed API keys & passwords (argon2id).
- **Abuse/anti-fraud:** signup rate limits, disposable-email checks, per-plan quotas, proxy-cost guards, alert flood protection.
- **Scraping compliance:** documented per-retailer policy, prefer official APIs, respect robots/ToS where legally required, honor takedown/opt-out, PII-free scraping. Legal review for jurisdictions.
- **Payments:** PCI handled by **Stripe** (no card data touches our servers).
- **Privacy:** GDPR/CCPA data export & deletion, cookie consent, DPA with subprocessors, clear privacy policy.

## 3. Infrastructure & deployment

| Component | Recommendation | Alt |
|-----------|----------------|-----|
| Web (Next.js) | **Vercel** (edge, ISR, previews) | Cloudflare Pages / self-host on ECS |
| API + workers | **Fly.io** or **AWS ECS Fargate** (containers) | GKE/EKS at larger scale |
| Postgres+Timescale | **Timescale Cloud** or **Neon + Timescale**, else RDS + extension | Self-managed only if needed |
| Redis | **Upstash** (serverless) or **ElastiCache** | — |
| Object store | **Cloudflare R2** (no egress fees) or **S3** | — |
| Proxies | Bright Data / Oxylabs / Smartproxy | — |
| DNS/CDN/WAF | **Cloudflare** | — |
| Email/Push/SMS | Resend / FCM / Twilio | Postmark / SNS |
| Payments | **Stripe** | — |

- **IaC:** **Terraform** for all cloud resources; environment parity (dev/staging/prod) via workspaces.
- **Containers:** Docker multi-stage builds; distroless runtime images; separate images for api / worker / scheduler.
- **Config:** 12-factor; env-driven; feature flags via **flagsmith/Unleash** or LaunchDarkly.
- **Autoscaling:** API on RPS/CPU; workers on **queue depth** (KEDA); scheduler is a singleton (leader election).
- **Zero-downtime:** rolling deploys, health checks, DB migrations gated & backward-compatible (expand/contract pattern).

## 4. Observability

| Signal | Tooling |
|--------|---------|
| Tracing | **OpenTelemetry** → Grafana Tempo / Honeycomb (trace a request across API→queue→worker→provider) |
| Metrics | **Prometheus + Grafana** (RED/USE dashboards; queue depth; scrape success rate per retailer; alert latency) |
| Logs | Structured JSON (pino) → Loki / Datadog; correlation IDs |
| Errors | **Sentry** (frontend + backend, release-tagged) |
| Product analytics | **PostHog** (funnels, retention, feature flags, session replay) |
| Uptime | Synthetic checks (Checkly/BetterStack) on critical flows |

**Key domain SLOs & alerts:**
- ≥ 99% of scheduled listing checks complete within their window.
- Alert-trigger → notification-sent p95 < 60s.
- Per-retailer scrape success rate; page-alert when adapter health drops (layout change).
- API availability 99.9%; error-budget-based alerting.

## 5. CI/CD

**GitHub Actions + Turborepo remote caching:**
1. **PR pipeline:** install (pnpm) → lint/format (Biome) → typecheck → unit/component tests (Vitest) → build (affected only) → SAST/secret scan → Lighthouse/a11y budgets → preview deploy (Vercel + ephemeral API).
2. **Merge to main:** full E2E (Playwright) on staging → migration check (shadow DB) → build & push Docker images → deploy staging.
3. **Release:** manual/auto promote to prod → run migrations (expand/contract) → canary → full rollout → smoke tests → Sentry release + source maps.
4. **Rollback:** image pinning + one-click revert; migrations designed reversible.

- Trunk-based with short-lived branches; required checks; Renovate for deps.
- Preview environments per PR (web + isolated API + seeded DB) for real testing.

## 6. Testing strategy (test pyramid)
- **Unit (Vitest):** pure logic — alert evaluation, price normalization, deal-score, currency, adapters' parsers.
- **Adapter golden tests:** each retailer adapter runs against saved HTML/JSON fixtures; catches breakage without live scraping. Nightly **live smoke** against real pages flags drift early.
- **Integration:** API + DB (Testcontainers Postgres/Redis) — trackers, alerts, auth, rate limits.
- **Contract tests:** OpenAPI schema ↔ SDK; tRPC types compile-checked.
- **E2E (Playwright):** signup → track product → price drop (simulated) → alert delivered → dashboard reflects it.
- **Load tests (k6):** scheduler throughput, worker scaling, history-read latency.
- **Chaos/resilience:** proxy failure, provider outage, queue backlog → graceful degradation.
- **Accessibility:** axe-core in component + E2E tests.
- Coverage gates on core engine modules; flaky-test quarantine.
