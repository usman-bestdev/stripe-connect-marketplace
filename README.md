# Stripe Connect Marketplace

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Stripe Connect](https://img.shields.io/badge/Stripe-Connect-6772e5?logo=stripe)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker)
![Prisma](https://img.shields.io/badge/Prisma-SQLite-2d3748?logo=prisma)
![License](https://img.shields.io/badge/license-MIT-green)

A Dockerized multi-party marketplace built with Next.js 16 App Router, Stripe Connect Express, Prisma/SQLite, and shadcn/ui. Sellers onboard via Stripe, buyers browse and checkout across multiple sellers in one payment, and the platform owner releases funds with a configurable platform fee — all running locally with zero external infrastructure.

## Architecture

```
 Seller              Buyer              Platform Owner
   │                   │                      │
   ▼                   ▼                      ▼
┌─────────────────────────────────────────────────┐
│              Next.js 16 App Router               │
│  /seller   /buyer   /platform   /api/*           │
└─────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
  Stripe Connect API           SQLite (Prisma)
  - Express Accounts           - SellerAccount
  - PaymentIntents             - Product
  - Transfers                  - Order
  - Webhooks                   - OrderItem
```

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20.x or later |
| Docker Desktop | Latest |
| Git | Latest |
| Stripe CLI | Latest |
| Stripe Account (Test mode) | — |

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/stripe-connect-marketplace.git
cd stripe-connect-marketplace

# 2. Configure environment
cp .env.example .env
# Edit .env — add your Stripe keys from dashboard.stripe.com

# 3. Start with Docker
docker compose up --build
# App running at http://localhost:3000
```

### Development (without Docker)

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

### Webhook forwarding (required for payment flow)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the whsec_ secret printed and add it to .env as STRIPE_WEBHOOK_SECRET
```

## Test Cards

| Scenario | Card Number | Expiry | CVC |
|----------|-------------|--------|-----|
| ✅ Successful payment | `4242 4242 4242 4242` | Any future | Any |
| ❌ Card declined | `4000 0000 0000 0002` | Any future | Any |
| 🔐 Authentication required | `4000 0025 0000 3155` | Any future | Any |
| 💳 Insufficient funds | `4000 0000 0000 9995` | Any future | Any |

## Project Structure

```
stripe-connect-marketplace/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  ← landing / role selector
│   ├── api/
│   │   ├── health/               ← ENV validation
│   │   ├── stripe/connect/       ← account creation + callback
│   │   ├── stripe/webhook/       ← payment event handler
│   │   ├── stripe/transfer/      ← fund release
│   │   ├── sellers/              ← list accounts
│   │   ├── products/             ← CRUD
│   │   ├── checkout/             ← PaymentIntent
│   │   └── orders/               ← list orders
│   ├── seller/                   ← seller flow
│   ├── buyer/                    ← buyer flow
│   └── platform/                 ← platform owner flow
├── components/
│   ├── nav.tsx
│   └── ui/                       ← shadcn components
├── context/                          ← added in Commit 3 (UI)
│   └── cart-context.tsx
├── lib/                              ← added in Commit 2 (API layer)
│   ├── prisma.ts
│   ├── stripe.ts
│   └── utils/currency.ts
├── types/                            ← added in Commit 2 (API layer)
│   └── index.ts
├── prisma/
│   └── schema.prisma
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | SQLite path, e.g. `file:./prisma/dev.db` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe publishable key (client + server readable) |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Webhook signing secret (`whsec_...`) |
| `PLATFORM_FEE_PERCENT` | ✅ | Platform fee %, default `10` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Base URL, e.g. `http://localhost:3000` |

## User Flows

**Seller** — Navigate to `/seller`, create a Connect Express account, complete Stripe onboarding, then manage products at `/seller/products`.

**Buyer** — Navigate to `/buyer`, browse the catalog, add items from multiple sellers to cart, checkout with Stripe Payment Element at `/buyer/checkout`.

**Platform Owner** — Navigate to `/platform`, view all orders, and click "Release Funds" on paid orders to transfer seller payouts via Stripe.

## Contributing

Pull requests welcome. Open an issue first to discuss significant changes.

## License

[MIT](LICENSE)
