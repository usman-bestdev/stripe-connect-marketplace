import { stripe } from '@/lib/stripe'

export async function GET() {
  const balance = await stripe.balance.retrieve()

  return Response.json({
    available: balance.available.map((b) => ({ amount: b.amount, currency: b.currency })),
    pending: balance.pending.map((b) => ({ amount: b.amount, currency: b.currency })),
  })
}
