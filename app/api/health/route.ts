import { NextRequest } from 'next/server'

const REQUIRED_ENV = [
  'DATABASE_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_APP_URL',
]

export async function GET(_req: NextRequest) {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k])

  if (missing.length > 0) {
    return Response.json(
      { status: 'error', missing },
      { status: 500 }
    )
  }

  return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
}
