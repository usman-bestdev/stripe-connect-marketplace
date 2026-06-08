# Stripe Connect Marketplace

**A production-grade reference implementation of a multi-party marketplace** — seller onboarding, cross-seller checkout, webhook-driven order lifecycle, and operator-controlled fund release — built entirely on Next.js 16 App Router with zero external services beyond Stripe and Docker.

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Stripe Connect](https://img.shields.io/badge/Stripe-Connect%20Express-6772E5?logo=stripe&logoColor=white)](https://stripe.com/connect)
[![Prisma 7](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose)

---

## Why this exists

Stripe Connect is notoriously difficult to implement correctly. Most tutorials stop at "create an account link." This project demonstrates the **complete financial lifecycle** a real marketplace must handle:

- Seller KYC and onboarding via Stripe-hosted Express flow
- Multi-seller cart resolved into a single Stripe Checkout Session
- Webhook-verified payment confirmation with idempotency-safe order state
- Platform escrow — funds held until an operator explicitly releases them
- Per-seller transfer calculation with configurable platform fee retention
- Live account status reconciled directly from Stripe on every page load

Everything runs in a single Docker container with a SQLite database. No Redis, no queues, no separate API server. Swap the datasource string and you have a Postgres-ready production service.

---

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Browser (React 19 + Tailwind v4)            │
│                                                                 │
│   /seller (dashboard)    /buyer (catalog + cart)    /platform  │
└──────────────┬─────────────────────┬──────────────────┬────────┘
               │    HTTPS / fetch    │                  │
┌──────────────▼─────────────────────▼──────────────────▼────────┐
│              Next.js 16 App Router — Route Handlers             │
│                                                                 │
│  /api/stripe/connect     → Express account creation + linking  │
│  /api/stripe/webhook     → HMAC-verified event ingestion       │
│  /api/stripe/transfer    → Operator-triggered fund release     │
│  /api/stripe/accounts    → Live account management             │
│  /api/checkout           → Checkout Session orchestration      │
│  /api/orders             → Order read model                    │
│  /api/products           → Product CRUD                        │
│  /api/admin/db           → Dev tooling (DB wipe + Stripe clean)│
│  /api/admin/sync         → DB ↔ Stripe account reconciliation  │
└──────────────┬─────────────────────────────────────┬───────────┘
               │                                     │
       Stripe Connect API                     Prisma 7 + SQLite
       ─────────────────                     ──────────────────
       Express Accounts                      SellerAccount
       Checkout Sessions                     Product
       Account Links                         Order
       Transfers                             OrderItem
       Webhooks
```

### Money flow

```
Buyer pays → Stripe Checkout Session
                    │
         checkout.session.completed
                    │
         Order status → "paid"   (funds held on platform)
                    │
         Operator reviews /platform
                    │
         POST /api/stripe/transfer
                    │
         ┌──────────┴──────────┐
    Stripe Transfer         Stripe Transfer       (one per seller)
    Seller A net amount     Seller B net amount
         │                       │
    Seller A Stripe         Seller B Stripe
    Connect account         Connect account
```

Platform fee is deducted per transfer, calculated server-side. Buyers see the full amount; sellers receive `subtotal × (1 − fee%)`.

---

## Technical decisions

| Decision | What we chose | Why |
|---|---|---|
| **Checkout flow** | Stripe Checkout Session | Hosted payment page delivers SCA, Apple Pay, Google Pay, and Link with zero client-side Stripe.js. Eliminates the `NEXT_PUBLIC_` publishable key dependency at Docker build time. |
| **Stripe client init** | Lazy Proxy singleton | Next.js module-level code runs at build time. Throwing on a missing env var at import scope breaks `next build` in Docker where secrets aren't present. The Proxy defers client creation to the first request. |
| **Prisma v7 adapter** | `@prisma/adapter-better-sqlite3` | Prisma 7 dropped the binary query engine. All SQLite access now goes through the synchronous `better-sqlite3` driver adapter — no wasm, no spawned processes. |
| **Base image** | `node:20-slim` (Debian/glibc) | `better-sqlite3` compiles a native `.node` binding against glibc. Alpine (musl libc) is binary-incompatible at runtime — `ld-linux-x86-64.so.2` simply does not exist. |
| **Font delivery** | `geist` npm package | `next/font/google` fetches font files from Google's CDN during `next build`. Docker containers have no outbound internet during image build. Bundling fonts via npm is the only reliable path. |
| **`.dockerignore`** | Excludes `node_modules` | Without it, `COPY . .` overwrites the container's native modules (compiled for Node 20 / glibc) with the host machine's (compiled for a different version). Results in `NODE_MODULE_VERSION` mismatches at runtime. |
| **Migrations** | `prisma migrate deploy` in `CMD` | Migrations run against the live volume-mounted database at container start, not during image build where the database file does not exist yet. |
| **Fund release** | Explicit operator action | Funds stay on the platform until a human approves the release. This is the industry-standard pattern for dispute protection and fraud prevention. |

---

## Data model

```
SellerAccount          Product               Order
─────────────          ───────────           ─────
id (cuid)              id (cuid)             id (cuid)
stripeAccountId        name                  buyerEmail
accountName            price (cents)         totalAmount (cents)
email                  imageUrl              platformFee (cents)
onboardingComplete     sellerId ──┐          status
createdAt              createdAt  │          createdAt
    │                             │              │
    └──── products ───────────────┘          items ────── OrderItem
                                                          ──────────
                                                          id (cuid)
                                                          orderId
                                                          productId
                                                          quantity
                                                          amount (cents)
                                                          transferStatus
```

All monetary values are stored in **cents** (integers) — no floating-point currency arithmetic anywhere in the codebase.

---

## Getting started

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Docker Desktop | Latest | Only requirement for the containerised path |
| Node.js | 20.x LTS | Only needed for local dev without Docker |
| Stripe CLI | Latest | Required for webhook forwarding in dev |
| Stripe account | Test mode | Free — no real money involved |

### 1 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```bash
# From dashboard.stripe.com → Developers → API keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Fill this after step 3
STRIPE_WEBHOOK_SECRET=whsec_...

# Platform fee percentage (integer)
PLATFORM_FEE_PERCENT=10

# Must match where the app is reachable (used for Stripe redirect URLs)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# SQLite file path — must be inside the Docker volume mount
DATABASE_URL=file:./prisma/dev.db
```

### 2 — Start the app

```bash
docker compose up --build
```

The container will:
1. Install dependencies (`npm ci`)
2. Generate the Prisma client (`prisma generate`)
3. Build Next.js with `NEXT_PUBLIC_*` vars inlined (`next build`)
4. Run pending migrations against the live database (`prisma migrate deploy`)
5. Start the server (`npm start`)

App available at **http://localhost:3000**

> **Why build args?** `NEXT_PUBLIC_*` variables are inlined into the JavaScript bundle at build time, not injected at runtime. `docker-compose.yml` forwards them as Docker build args from your `.env` file so they are present when `next build` runs inside the container.

### 3 — Forward webhooks

Stripe cannot reach `localhost` directly. In a separate terminal:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_` signing secret that appears on startup, paste it into `.env` as `STRIPE_WEBHOOK_SECRET`, then restart the container:

```bash
docker compose restart
```

> Without a valid webhook secret, the `/api/stripe/webhook` endpoint will reject all events and orders will never advance from `pending` to `paid`.

### Local development (no Docker)

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

---

## Environment variables

| Variable | Build-time¹ | Required | Description |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | No | Yes | `sk_test_...` — server-only, never sent to browser |
| `STRIPE_WEBHOOK_SECRET` | No | Yes | `whsec_...` — from `stripe listen` output |
| `PLATFORM_FEE_PERCENT` | No | Yes | Integer percentage retained per transfer, e.g. `10` |
| `DATABASE_URL` | No | Yes | SQLite path, e.g. `file:./prisma/dev.db` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **Yes** | Yes | `pk_test_...` — safe to expose, Stripe's design |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Yes | Base URL for Checkout Session redirect URLs |

¹ *Build-time variables must be present when `next build` executes. In Docker they are forwarded via build args in `docker-compose.yml`.*

---

## API reference

All routes use the Next.js 16 Route Handler convention. Dynamic `params` is a `Promise` (Next.js 15+ breaking change) and must be `await`ed.

### Core flows

#### `POST /api/stripe/connect`
Creates a new Stripe Express account and returns a hosted onboarding URL.

**Request**
```json
{ "accountName": "Acme Store", "email": "seller@example.com" }
```
**Response**
```json
{ "accountId": "acct_...", "onboardingUrl": "https://connect.stripe.com/..." }
```

#### `GET /api/stripe/connect?account_id=acct_...`
Generates a fresh onboarding link for an **existing** account. Does not create a new account.

**Response**
```json
{ "onboardingUrl": "https://connect.stripe.com/..." }
```

#### `POST /api/checkout`
Creates an `Order` + `OrderItems` in the database, then creates a Stripe Checkout Session spanning products from multiple sellers.

**Request**
```json
{
  "items": [{ "productId": "...", "quantity": 2 }],
  "buyerEmail": "buyer@example.com"
}
```
**Response**
```json
{ "url": "https://checkout.stripe.com/...", "orderId": "..." }
```
Client redirects to `url`. On payment completion, Stripe calls the webhook.

#### `POST /api/stripe/webhook`
Receives and verifies Stripe events (HMAC signature check). Handles:
- `checkout.session.completed` — advances `Order.status` to `"paid"` when `payment_status === "paid"`
- `payment_intent.succeeded` — fallback handler for direct PaymentIntent flows

#### `POST /api/stripe/transfer`
Releases funds for a `"paid"` order. Calculates per-seller net amounts, creates one Stripe Transfer per seller, marks items as `"transferred"`.

**Request**
```json
{ "orderId": "..." }
```
**Response**
```json
{ "transferred": 8100 }
```

### Account management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stripe/accounts` | Live account list from Stripe with `restricted` status flag |
| `DELETE` | `/api/stripe/accounts` | Delete restricted/incomplete accounts |
| `DELETE` | `/api/stripe/accounts?all=true` | Delete all connected accounts |
| `DELETE` | `/api/stripe/accounts?db-only=true` | Purge local DB only, skip Stripe |
| `DELETE` | `/api/stripe/accounts/:id` | Delete a single account |

### Products and orders

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sellers` | Onboarded sellers with their products |
| `GET` | `/api/products` | All products with seller details |
| `POST` | `/api/products` | Create product — `{ name, price, imageUrl?, sellerId }` |
| `GET` | `/api/products/:id` | Single product |
| `PUT` | `/api/products/:id` | Partial update — `{ name?, price?, imageUrl? }` |
| `DELETE` | `/api/products/:id` | Delete product — `204 No Content` |
| `GET` | `/api/orders` | All orders with nested items, products, seller |

### Developer tooling

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Validates all required env vars |
| `DELETE` | `/api/admin/db` | Wipe all DB tables (FK-safe order) |
| `DELETE` | `/api/admin/db?stripe=completed` | Wipe DB + delete completed Stripe accounts |
| `POST` | `/api/admin/sync` | Re-import all Stripe accounts into DB (idempotent upsert) |

---

## User flows

### Seller

1. `/seller` — dashboard shows live account stats (total / active / restricted) and account table
2. **Add seller** → name + email → redirect to Stripe-hosted KYC
3. Complete identity verification on Stripe → redirect back to `/seller/products`
4. Add products with name, price (USD), optional image URL
5. **Resume onboarding** for restricted accounts — generates a new link without creating a duplicate account
6. **Delete accounts** — bulk remove restricted or all accounts with confirmation

### Buyer

1. `/buyer` — product catalog across all fully onboarded sellers
2. Add items from multiple sellers to a persistent in-memory cart
3. `/buyer/checkout` → enter email → **Checkout with Stripe** → Stripe-hosted payment page
4. Card number, billing, SCA handled entirely by Stripe
5. On success → `/buyer/checkout/success` with order confirmation

### Platform operator

1. `/platform` — GMV overview, pending releases, platform fees earned
2. Orders in three states: **Awaiting release** / **Transferred** / **Pending payment**
3. **Release Funds** on any `"paid"` order → per-seller transfers execute, order advances to `"transferred"`

---

## Test cards

| Scenario | Number | Expiry | CVC |
|---|---|---|---|
| Successful payment | `4242 4242 4242 4242` | Any future | Any |
| Card declined | `4000 0000 0000 0002` | Any future | Any |
| Requires 3D Secure | `4000 0025 0000 3155` | Any future | Any |
| Insufficient funds | `4000 0000 0000 9995` | Any future | Any |

---

## Project structure

```
stripe-connect-marketplace/
│
├── app/
│   ├── layout.tsx                        # CartProvider, Nav, Sonner toaster
│   ├── page.tsx                          # Role selector + Clean DB shortcut
│   │
│   ├── seller/
│   │   ├── page.tsx                      # Account dashboard (stats, table, dialogs)
│   │   └── products/page.tsx             # Product CRUD per seller
│   │
│   ├── buyer/
│   │   ├── page.tsx                      # Product catalog
│   │   └── checkout/
│   │       ├── page.tsx                  # Cart + Stripe redirect
│   │       └── success/page.tsx          # Post-payment confirmation
│   │
│   ├── platform/
│   │   └── page.tsx                      # Order management + fund release
│   │
│   └── api/
│       ├── health/route.ts
│       ├── sellers/route.ts
│       ├── products/route.ts
│       ├── products/[id]/route.ts
│       ├── orders/route.ts
│       ├── checkout/route.ts             # Checkout Session orchestration
│       ├── admin/
│       │   ├── db/route.ts               # DB wipe (optional Stripe cleanup)
│       │   └── sync/route.ts             # Stripe → DB account reconciliation
│       └── stripe/
│           ├── accounts/route.ts         # Bulk list + bulk delete
│           ├── accounts/[id]/route.ts    # Single account delete
│           ├── connect/route.ts          # Account creation (POST) + link refresh (GET)
│           ├── connect/callback/route.ts # Post-onboarding redirect handler
│           ├── webhook/route.ts          # Event ingestion + signature verification
│           └── transfer/route.ts         # Fund release
│
├── components/
│   ├── nav.tsx                           # Sticky nav with live cart badge
│   ├── clean-db-button.tsx               # Client component used on home page
│   └── ui/                               # shadcn/ui component library (Base UI)
│
├── context/
│   └── cart-context.tsx                  # Cart state via React Context + useReducer
│
├── lib/
│   ├── stripe.ts                         # Lazy Proxy singleton (deferred init)
│   ├── prisma.ts                         # Lazy Proxy singleton (deferred init)
│   └── utils/currency.ts                 # formatCents, dollarsToCents, calcPlatformFee
│
├── types/index.ts                        # Shared request/response interfaces
│
├── prisma/
│   ├── schema.prisma                     # 4 models, SQLite datasource
│   └── migrations/                       # Versioned SQL — applied on container start
│
├── prisma.config.ts                      # Prisma v7 config-file datasource
├── .dockerignore                         # Excludes node_modules, .next, .env, *.db
├── Dockerfile                            # node:20-slim + build args for NEXT_PUBLIC_*
├── docker-compose.yml                    # Build arg forwarding + ./prisma volume mount
└── .env.example
```

---

## Key engineering challenges solved

### Build-time vs. runtime environment variables

Next.js has two distinct phases: **build** (where `NEXT_PUBLIC_*` vars are statically inlined into the JS bundle) and **runtime** (where `process.env` reads live values). In Docker these phases run in separate contexts. The solution:

- `NEXT_PUBLIC_*` vars are passed as Docker build args in `docker-compose.yml`, sourced from `.env` via Compose variable substitution
- Runtime secrets (`STRIPE_SECRET_KEY`, `DATABASE_URL`, etc.) are injected via `env_file` at container start
- Neither set of vars ever appears in the image layer cache

### Module-scope initialization crash at build time

`next build` imports every route module to analyse the route tree. Code at module scope runs during this import — including `new Stripe(process.env.STRIPE_SECRET_KEY)`. When secrets aren't present at build time (they shouldn't be baked into the image), this throws and aborts the build.

Solution: both `lib/stripe.ts` and `lib/prisma.ts` export a JavaScript `Proxy` object that intercepts property access and lazily constructs the real client on the first request. The build phase never triggers client construction.

### Native module ABI compatibility in Docker

`better-sqlite3` compiles a `.node` binary whose ABI version is pinned to the Node.js version used during compilation. If the host machine runs Node 22 and Docker runs Node 20, the compiled binary is incompatible. Without a `.dockerignore`, `COPY . .` silently overwrites the container's correctly compiled modules with the host's incompatible ones. The error (`NODE_MODULE_VERSION 127 vs 115`) only appears at runtime, not at build time.

Solution: `.dockerignore` excludes `node_modules` so `npm ci` inside the container always compiles native dependencies for the correct target.

### Stripe account deduplication on resume

Naively, a "Resume onboarding" button that calls `POST /api/stripe/connect` creates a brand-new account each time. The correct behaviour is to generate a new account link for the existing account via `stripe.accountLinks.create({ account: existingId })`. This project exposes `GET /api/stripe/connect?account_id=` specifically for this case, completely separate from the account-creation `POST`.

---

## Production upgrade path

| Concern | Current (demo) | Production |
|---|---|---|
| Database | SQLite via `better-sqlite3` | Change one line in `prisma.config.ts` to Postgres; run `prisma migrate deploy` |
| Authentication | None | NextAuth.js or Clerk — protect all `/api/stripe/*` and `/platform` routes |
| Image storage | External URL or `/public/placeholder.png` | AWS S3 / Cloudflare R2 with pre-signed upload URLs |
| Webhook endpoint | `stripe listen` CLI (dev only) | Register a public HTTPS endpoint in the Stripe Dashboard |
| Secrets management | `.env` file | AWS Secrets Manager / Doppler / Vault |
| Deployment | Docker Compose (single host) | AWS ECS Fargate, Railway, or Render with a managed Postgres |
| Transfer idempotency | None | Pass `idempotencyKey` to `stripe.transfers.create` — prevents double-payout on retry |
| Admin endpoints | Unauthenticated | Gate `/api/admin/*` behind an operator session or a pre-shared API key |
| Monitoring | None | Stripe Dashboard webhooks + Datadog / Sentry for error tracking |

---

## Security model

| Surface | Protection |
|---|---|
| Webhook ingress | HMAC-SHA256 signature verified on every request via `stripe.webhooks.constructEvent` — unsigned payloads return `400` |
| Secret key | Server-only env var — never referenced in client components, never in `NEXT_PUBLIC_*` |
| Publishable key | Intentionally public by Stripe's design — used only to identify the platform to Stripe's JS |
| Platform fee | Calculated server-side from `PLATFORM_FEE_PERCENT` — clients have no input into fee computation |
| Database file | Lives inside the Docker volume — not reachable from outside the container network |
| Credentials in VCS | `.env`, `.env.local`, `.vscode/mcp.json` all gitignored |

---

## Tax, legal, and compliance

> This project runs in Stripe **test mode** — none of the obligations below apply to the demo. They apply the moment a real buyer pays a real seller through your platform.

This is the part most engineering teams discover too late. The marketplace model (separate charges and transfers) puts you, the platform operator, **in the money flow** — and every jurisdiction has an opinion about what that means for your tax and legal obligations.

### Platform model vs. marketplace model

The architecture choice is not just technical — it determines your regulatory surface.

| Dimension | Platform / SaaS | Marketplace (this project) |
|---|---|---|
| Revenue | Subscription or SaaS fee | Percentage of every transaction (GMV) |
| Tax you owe | Tax on your fee only | Potentially tax on the full transaction amount |
| Who remits sales tax | The merchant | Often **you**, under Marketplace Facilitator Laws |
| VAT exposure | Minimal | EU treats you as a "deemed seller" |
| Chargeback liability | Merchant's problem | Hits your platform account first |
| KYC / AML obligation | Stripe handles for merchants | You are responsible for seller identity |
| Fraud exposure | Low | Higher — funds pass through your account |
| Revenue scalability | Hard to scale with GMV | Revenue grows directly with transaction volume |
| Regulatory burden | Low | Grows with every jurisdiction you enter |

### US sales tax — Marketplace Facilitator Laws

Most US states now have Marketplace Facilitator Laws. If your platform processes payments on behalf of third-party sellers, **you** — not the seller — are required to collect and remit sales tax to each state where you have nexus.

This means:
- Amazon, Etsy, and eBay collect and remit sales tax on behalf of their sellers. You must do the same.
- Non-compliance in states like New York can result in penalties, interest, and audit fees exceeding **25% of total sales tax liability**.
- Nexus thresholds vary by state — many trigger at $100k in sales or 200 transactions per year.

**Practical path:** Integrate [Stripe Tax](https://stripe.com/tax) or [TaxJar](https://www.taxjar.com) before your first real transaction. Stripe Tax can be enabled directly on Checkout Sessions.

### EU VAT — the "deemed seller" rule

If you have EU buyers or sellers, you inherit VAT obligations on those transactions under the EU VAT rules for electronic interfaces.

The law constructs a fictional two-step transaction:
1. Seller → Platform (supply of goods)
2. Platform → Buyer (supply of goods)

Even if your platform never physically touches the goods, you are treated as if you sold them. This means:
- You collect VAT from the buyer
- You remit VAT to the relevant EU member state(s)
- The seller invoices you (net of VAT) as if selling B2B

New EU marketplace VAT regulations tighten further from **January 1, 2030**. If you are building for the EU market, engage a VAT specialist before launch — retroactive VAT liability is expensive.

### US 1099-K reporting

If your marketplace sellers earn above the IRS threshold (currently $600/year, though the threshold has changed multiple times), you are required to file a Form 1099-K for each seller and submit the information to the IRS.

Stripe Connect handles this natively:
- Gross earnings are tracked per connected account automatically
- Stripe generates and delivers 1099-K forms to sellers
- You receive a copy for your records

This is one area where the "you built on Stripe Connect" choice pays off immediately — the compliance infrastructure is built in.

### KYC and AML

When funds flow through your platform, you are exposed to money laundering risk. Stripe's Express onboarding collects identity documents and performs sanctions screening on your behalf — this is what the KYC onboarding flow in this project does.

What Stripe handles for you in this project:
- Identity verification (government ID, address)
- Sanctions and PEP screening
- Ongoing transaction monitoring
- Suspicious Activity Report (SAR) filing obligations (Stripe's, not yours)

What you still own:
- Ensuring your onboarding flow is not bypassed
- Restricting payouts for accounts flagged as restricted (`charges_enabled: false`)
- Having a documented AML policy if you scale above certain thresholds

### Financial model comparison

#### Platform / SaaS model

| Pros | Cons |
|---|---|
| Predictable recurring revenue | Revenue does not scale with GMV |
| Low tax complexity | Hard to compete on pricing flexibility |
| No chargeback exposure | Merchants can leave if fees feel high |
| Minimal regulatory burden | No visibility into downstream transactions |

#### Marketplace model (this project)

| Pros | Cons |
|---|---|
| Revenue scales directly with GMV | You are in the money flow — more regulation |
| Full control over pricing and fee splits | Tax obligations in every jurisdiction you enter |
| Buyers trust a single counterparty | Chargebacks hit your account first |
| Instant payout capability for sellers | KYC required for every seller |
| Rich transaction data across the platform | Higher legal and accounting cost at scale |

### Checklist before going live

- [ ] Consult a US sales tax specialist — determine nexus and integrate Stripe Tax or TaxJar
- [ ] Consult an EU VAT advisor if you will have EU buyers or sellers
- [ ] Enable 1099-K delivery in your Stripe Dashboard (Settings → Connect → Tax forms)
- [ ] Add an AML policy document and review Stripe's program requirements for platforms
- [ ] Gate the `/api/admin/*` endpoints behind operator authentication
- [ ] Add idempotency keys to `stripe.transfers.create` calls to prevent double-payout on retry
- [ ] Set up Stripe Radar rules for fraud prevention on your connected accounts
- [ ] Enable webhook signing secret rotation in your deployment pipeline

---

## License

[MIT](LICENSE)
