import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return Response.json({ error: 'STRIPE_WEBHOOK_SECRET not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.orderId
      if (orderId && session.payment_status === 'paid') {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'paid' },
        })
      }
      break
    }

    // Fallback for direct PaymentIntent usage (e.g. future mobile flows)
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      const orderId = pi.metadata?.orderId
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'paid' },
        })
      }
      break
    }
  }

  return Response.json({ received: true })
}
