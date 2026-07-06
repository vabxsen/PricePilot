# 04 — Data Layer: Schema, Time-Series, Caching

## 1. Datastore choices

| Store | Tech | Purpose |
|-------|------|---------|
| Primary OLTP | **PostgreSQL 16** | Users, products, listings, trackers, alert rules, billing |
| Time-series | **TimescaleDB** (Postgres extension) | Price history (hypertables, compression, continuous aggregates) |
| Cache / queue / pub-sub | **Redis 7** | Cache, BullMQ queues, rate limits, realtime fan-out, sessions |
| Object storage | **S3 / Cloudflare R2** | Product images, raw HTML snapshots, exports |
| Search | **Postgres FTS → Meilisearch/Typesense** | Product search/autocomplete at scale |
| Analytics warehouse (later) | **ClickHouse / BigQuery** | Product-event analytics, ML feature store |

**Why Timescale over a separate TSDB (InfluxDB, etc.)?** Price history is naturally relational (joins to listings/products), moderate write volume, and benefits from SQL + one operational surface. Timescale gives hypertables, native compression, and continuous aggregates without leaving Postgres.

## 2. Core relational schema (Prisma-style, abbreviated)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  emailVerified DateTime?
  name          String?
  imageUrl      String?
  plan          Plan     @default(FREE)
  createdAt     DateTime @default(now())
  trackers      Tracker[]
  accounts      Account[]      // OAuth (Auth.js)
  sessions      Session[]
  apiKeys       ApiKey[]
  prefs         NotificationPref?
  workspaces    WorkspaceMember[]
}

model Retailer {
  id          String  @id @default(cuid())
  name        String
  domain      String  @unique
  adapterKey  String            // which adapter handles it
  affiliateTag String?
  status      RetailerStatus @default(ACTIVE) // ACTIVE|DEGRADED|DISABLED
}

// Canonical product (deduped across retailers)
model Product {
  id          String   @id @default(cuid())
  slug        String   @unique          // for /p/:slug SEO
  title       String
  brand       String?
  category    String?
  imageUrl    String?
  gtin        String?  @unique           // barcode when known
  listings    ProductListing[]
  createdAt   DateTime @default(now())
  @@index([category])
}

// A specific offer at a specific retailer (the scrape target)
model ProductListing {
  id            String   @id @default(cuid())
  productId     String
  retailerId    String
  url           String
  externalId    String                 // retailer's SKU/ASIN
  variant       Json?                  // color/size/seller
  currency      String                 // ISO 4217
  currentPrice  Decimal? @db.Decimal(12,2)
  inStock       Boolean  @default(true)
  lastCheckedAt DateTime?
  nextCheckAt   DateTime?
  checkInterval Int      @default(86400) // seconds; adaptive
  status        ListingStatus @default(ACTIVE)
  product       Product  @relation(fields: [productId], references: [id])
  retailer      Retailer @relation(fields: [retailerId], references: [id])
  trackers      Tracker[]
  @@unique([retailerId, externalId, variantHash])
  @@index([nextCheckAt, status])        // scheduler hot path
}

// A user's subscription to a listing
model Tracker {
  id          String   @id @default(cuid())
  userId      String
  listingId   String
  priceAtAdd  Decimal  @db.Decimal(12,2)
  paused      Boolean  @default(false)
  tags        String[]
  alertRules  AlertRule[]
  createdAt   DateTime @default(now())
  @@unique([userId, listingId])
  @@index([userId])
}

model AlertRule {
  id          String   @id @default(cuid())
  trackerId   String
  type        AlertType            // TARGET_PRICE|PERCENT_DROP|ALL_TIME_LOW|BACK_IN_STOCK|PRICE_INCREASE
  threshold   Decimal? @db.Decimal(12,2)   // target price or percent
  channels    Channel[]            // EMAIL|WEB_PUSH|MOBILE_PUSH|SMS
  repeat      Boolean  @default(false) // once vs. every drop
  snoozeUntil DateTime?
  lastFiredAt DateTime?
}

model Notification {
  id          String   @id @default(cuid())
  userId      String
  alertRuleId String?
  channel     Channel
  status      NotifStatus @default(QUEUED) // QUEUED|SENT|DELIVERED|BOUNCED|FAILED
  payload     Json
  idempotencyKey String @unique
  createdAt   DateTime @default(now())
  @@index([userId, createdAt])
}

model ApiKey {
  id        String @id @default(cuid())
  userId    String
  hashedKey String @unique   // store hash only
  scopes    String[]
  lastUsed  DateTime?
  revokedAt DateTime?
}
// + Workspace, WorkspaceMember, Subscription/Billing, AuditLog, PushSubscription
```

## 3. Time-series: price history (TimescaleDB)

```sql
CREATE TABLE price_point (
  listing_id  text        NOT NULL,
  ts          timestamptz NOT NULL,
  price       numeric(12,2) NOT NULL,
  currency    text        NOT NULL,
  in_stock    boolean     NOT NULL,
  source      text        NOT NULL,   -- api|jsonld|render
  PRIMARY KEY (listing_id, ts)
);
SELECT create_hypertable('price_point', 'ts', chunk_time_interval => INTERVAL '7 days');
SELECT add_compression_policy('price_point', INTERVAL '30 days');

-- Precomputed daily rollups for fast charts & stats
CREATE MATERIALIZED VIEW price_daily
WITH (timescaledb.continuous) AS
SELECT listing_id,
       time_bucket('1 day', ts) AS day,
       first(price, ts) AS open, last(price, ts) AS close,
       min(price) AS low, max(price) AS high
FROM price_point GROUP BY listing_id, day;
```

- **Write policy:** append a point only when price/stock changes (plus periodic heartbeat), keeping the series compact.
- **Read policy:** charts read from `price_daily` (or coarser rollups for long ranges); recent detail from raw. Downsample server-side to the requested range/interval — never ship the full raw series to the client.
- **Retention by plan:** Free 6 months, Pro 2 years, Business unlimited (compressed cold storage).
- **Anomaly guard:** ingestion flags implausible jumps (e.g., 90% off from a parsing bug) for review before they become "all-time lows".

## 4. Caching strategy (multi-layer)

| Layer | What | TTL / invalidation |
|-------|------|--------------------|
| CDN edge | Public `/p/:slug`, `/deals`, images, assets | ISR revalidate on `price.updated`; long TTL for images |
| Redis | Current price per listing, resolved-URL cache, history query results, stats/deal-score, session, rate-limit counters | Seconds–minutes; write-through on new price point |
| App/RSC | React Query client cache; Next.js data cache | Per-route; background refetch |
| DB | Timescale continuous aggregates (materialized) | Auto-refresh policy |

- **Cache keys** namespaced & versioned (`v1:listing:{id}:price`). Invalidate precisely on price change.
- **Thundering-herd protection:** single-flight/locking on resolver + history queries.
- **Idempotent resolver cache:** repeated URL submissions dedupe to one resolution within a window.

## 5. Data lifecycle & governance
- **Migrations:** Prisma Migrate; forward-only, reviewed, run in CI with a shadow DB.
- **Backups:** automated daily snapshots + PITR (managed provider); periodic restore drills.
- **PII:** minimal (email, name, hashed secrets). GDPR/CCPA: export & delete endpoints; data retention policy; encrypt at rest & in transit.
- **Auditability:** `AuditLog` for security-sensitive actions; raw HTML snapshots retained short-term (debug) then purged.
- **Analytics separation:** product events → warehouse (ClickHouse/BigQuery) via event stream, not the OLTP DB.
