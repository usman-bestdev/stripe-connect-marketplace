# Stripe Connect Marketplace

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Stripe Connect](https://img.shields.io/badge/Stripe-Connect%20Express-6772e5?logo=stripe)
![Prisma](https://img.shields.io/badge/Prisma-7.x-2d3748?logo=prisma)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker)
![License](https://img.shields.io/badge/license-MIT-green)

A production-ready multi-party marketplace demonstrating the full Stripe Connect Express flow — seller onboarding, cross-seller checkout, webhook-driven order state, and platform-controlled fund release — built on Next.js 16 App Router with zero external infrastructure beyond Docker and Stripe.

---

## What this demonstrates

| Capability | Implementation |
|---|---|
| Seller onboarding | Stripe Connect Express accounts with `account_onboarding` links |
| Multi-seller checkout | Single `PaymentIntent` spanning products from multiple sellers |
| Platform fee | Configurable percentage withheld on every transfer |
| Fund release | Explicit operator action; funds held until platform approves |
| Webhook verification | HMAC signature check on every event — rejects unsigned payloads |
| Data persistence | Prisma/SQLite with Docker volume mount — survives container restarts |
| Type safety | End-to-end TypeScript; zero `any` in API layer |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                  │
│                                                           │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────────┐  │
│  │ /seller  │   │  /buyer  │   │      /platform       │  │
│  └────┬─────┘   └────┬─────┘   └──────────┬───────────┘  │
│       │              │                     │              │
│  ┌────▼──────────────▼─────────────────────▼───────────┐  │
│  │                   API Layer (/api/*)                 │  │
│  │  stripe/connect  │  checkout  │  transfer  │ orders  │  │
│  └────┬─────────────────────────────────────────┬──────┘  │
└───────┼─────────────────────────────────────────┼─────────┘
        │                                         │
        ▼                                         ▼
  Stripe Connect API                      Prisma / SQLite
  ─────────────────                       ───────────────
  Express Accounts                        SellerAccount
  PaymentIntents                          Product
  Transfers                               Order
  Webhooks                                OrderItem
```

### Request flow — checkout to fund release

```
Buyer selects items
      │
      ▼
POST /api/checkout ──► creates Order + OrderItems in DB
      │                creates PaymentIntent (metadata: orderId)
      │                returns clientSecret
      ▼
Stripe Payment Element (browser)
      │
      ▼
payment_intent.succeeded webhook ──► marks Order status = "paid"
      │
      ▼
Platform operator reviews /platform
      │
      ▼
POST /api/stripe/transfer ──► calculates per-seller amounts
                               creates Stripe Transfers
                               marks OrderItems status = "transferred"
```

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 App Router | Route Handlers replace separate API server; Turbopack for fast iteration |
| Language | TypeScript 5 (strict) | End-to-end type safety across API contracts |
| Payments | Stripe SDK 22 | Connect Express for fastest seller onboarding path |
| ORM | Prisma 7 | Config-driven datasource (v7 pattern), type-safe queries |
| Database | SQLite | Zero infrastructure for dev/demo; swap datasource for Postgres in prod |
| Styling | Tailwind CSS v4 + shadcn/ui | Design system without a runtime |
| Container | Docker + Compose | Reproducible environment; volume-mounted SQLite survives restarts |

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20.x LTS |
| Docker Desktop | Latest |
| Stripe CLI | Latest |
| Stripe account (Test mode) | — |

---

## Quick start

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/stripe-connect-marketplace.git
cd stripe-connect-marketplace

# 2. Configure environment
cp .env.example .env
# Fill in your Stripe keys from dashboard.stripe.com → Developers → API keys

# 3. Start
docker compose up --build
# App: http://localhost:3000
```

### Local development (without Docker)

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

### Webhook forwarding

The transfer flow requires webhooks. In a separate terminal:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_` secret printed on startup and add it to `.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite path — must be inside the Docker volume mount, e.g. `file:./prisma/dev.db` |
| `STRIPE_SECRET_KEY` | ✅ | Secret key from Stripe dashboard (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Webhook signing secret from `stripe listen` output (`whsec_...`) |
| `PLATFORM_FEE_PERCENT` | ✅ | Integer percentage the platform retains on each transfer, e.g. `10` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Base URL for Stripe callback redirects, e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Publishable key (`pk_test_...`) — safe to read server-side via `NEXT_PUBLIC_` prefix |

---

## API reference

All routes are under `app/api/` and use the Next.js 16 Route Handler convention. `params` is `Promise`-based (Next.js 15+ breaking change).

### Infrastructure

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Validates all required env vars; returns `{ status: "ok" }` or lists missing keys |

### Sellers

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/sellers` | Lists all sellers with `onboardingComplete: true` and their products |

### Products

| Method | Route | Body | Description |
|---|---|---|---|
| `GET` | `/api/products` | — | All products with seller details |
| `POST` | `/api/products` | `{ name, price, imageUrl?, sellerId }` | Create product (price in cents) |
| `GET` | `/api/products/[id]` | — | Single product |
| `PUT` | `/api/products/[id]` | `{ name?, price?, imageUrl? }` | Partial update |
| `DELETE` | `/api/products/[id]` | — | Delete product — returns `204` |

### Orders

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/orders` | All orders with items, products, and seller details |

### Stripe Connect

| Method | Route | Body | Description |
|---|---|---|---|
| `POST` | `/api/stripe/connect` | `{ accountName, email }` | Creates Express account + returns `onboardingUrl` |
| `GET` | `/api/stripe/connect/callback` | `?account_id=` | Called by Stripe after onboarding; updates `onboardingComplete`; redirects to `/seller/products` |
| `POST` | `/api/stripe/webhook` | Stripe event body | Verifies HMAC signature; handles `payment_intent.succeeded` |
| `POST` | `/api/stripe/transfer` | `{ orderId }` | Releases funds from a `paid` order to each seller minus platform fee |

### Checkout

| Method | Route | Body | Description |
|---|---|---|---|
| `POST` | `/api/checkout` | `{ items: [{ productId, quantity }], buyerEmail }` | Creates `Order` + `OrderItems` in DB; creates Stripe `PaymentIntent`; returns `{ clientSecret, orderId }` |

---

## User flows

### Seller

1. Navigate to `/seller`
2. Submit name + email → redirected to Stripe's hosted onboarding
3. Complete KYC on Stripe → redirected back to `/seller/products`
4. Add products with name, price, and image

### Buyer

1. Navigate to `/buyer` → browse catalog across all onboarded sellers
2. Add items from multiple sellers to cart
3. Checkout → Stripe Payment Element → confirm payment
4. Confirmation screen with order summary

### Platform operator

1. Navigate to `/platform`
2. View all orders and their status (`pending` → `paid` → `transferred`)
3. Click **Release Funds** on any `paid` order → triggers per-seller transfers minus platform fee

---

## Test cards

| Scenario | Card | Expiry | CVC |
|---|---|---|---|
| Successful payment | `4242 4242 4242 4242` | Any future | Any |
| Card declined | `4000 0000 0000 0002` | Any future | Any |
| 3DS required | `4000 0025 0000 3155` | Any future | Any |
| Insufficient funds | `4000 0000 0000 9995` | Any future | Any |

---

## Project structure

```
stripe-connect-marketplace/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        ← role selector (seller / buyer / platform)
│   └── api/
│       ├── health/route.ts             ← env validation
│       ├── sellers/route.ts
│       ├── products/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── orders/route.ts
│       ├── checkout/route.ts           ← PaymentIntent creation
│       └── stripe/
│           ├── connect/
│           │   ├── route.ts            ← Express account creation
│           │   └── callback/route.ts   ← post-onboarding redirect handler
│           ├── webhook/route.ts        ← HMAC-verified event handler
│           └── transfer/route.ts       ← fund release to sellers
├── lib/
│   ├── prisma.ts                       ← singleton PrismaClient
│   ├── stripe.ts                       ← singleton Stripe client
│   └── utils/currency.ts               ← formatCents, calcPlatformFee
├── types/index.ts                      ← shared request/response interfaces
├── components/
│   ├── nav.tsx
│   └── ui/                             ← 12 shadcn components
├── prisma/
│   └── schema.prisma                   ← 4 models: Seller, Product, Order, OrderItem
├── prisma.config.ts                    ← Prisma v7 config-driven datasource
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Security notes

- `.env` is gitignored — real keys never touch version control
- Webhook handler rejects any request without a valid Stripe HMAC signature
- `STRIPE_SECRET_KEY` is server-only — never exposed to the browser
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is intentionally public (Stripe's design)
- SQLite file is inside the Docker volume — not accessible from outside the container
- Platform fee is enforced server-side — clients cannot influence the fee amount

---

## Roadmap to production

| Concern | Current | Production swap |
|---|---|---|
| Database | SQLite | Postgres — change one line in `prisma.config.ts` |
| Auth | None (demo) | NextAuth.js or Clerk |
| Image storage | `/public/placeholder.png` | S3 / Cloudflare R2 |
| Webhook delivery | `stripe listen` CLI | Stripe Dashboard webhook endpoint |
| Deployment | Docker Compose | Railway, Render, or ECS |

---

## License

[MIT](LICENSE)
