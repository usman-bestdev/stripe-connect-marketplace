import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get('account_id')
  if (!accountId) {
    return Response.json({ error: 'account_id is required' }, { status: 400 })
  }

  const balance = await stripe.balance.retrieve({}, { stripeAccount: accountId })

  const available = balance.available.map((b) => ({
    amount: b.amount,
    currency: b.currency,
  }))

  return Response.json({ available })
}

export async function POST(req: NextRequest) {
  const { accountId } = await req.json()
  if (!accountId) {
    return Response.json({ error: 'accountId is required' }, { status: 400 })
  }

  const balance = await stripe.balance.retrieve({}, { stripeAccount: accountId })

  const payouts: { amount: number; currency: string }[] = []

  for (const b of balance.available) {
    if (b.amount <= 0) continue
    const payout = await stripe.payouts.create(
      { amount: b.amount, currency: b.currency },
      { stripeAccount: accountId }
    )
    payouts.push({ amount: payout.amount, currency: payout.currency })
  }

  if (payouts.length === 0) {
    return Response.json({ error: 'No available balance to pay out' }, { status: 400 })
  }

  return Response.json({ payouts })
}
