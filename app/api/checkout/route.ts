import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { calcPlatformFee } from '@/lib/utils/currency'
import { CheckoutRequest } from '@/types'

export async function POST(req: NextRequest) {
  const body: CheckoutRequest = await req.json()
  const { items, buyerEmail } = body

  if (!items?.length || !buyerEmail) {
    return Response.json({ error: 'items and buyerEmail are required' }, { status: 400 })
  }

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    include: { seller: true },
  })

  if (products.length !== items.length) {
    return Response.json({ error: 'One or more products not found' }, { status: 404 })
  }

  const orderItemsData = items.map((cartItem) => {
    const product = products.find((p) => p.id === cartItem.productId)!
    return {
      productId: product.id,
      quantity: cartItem.quantity,
      amount: product.price * cartItem.quantity,
      transferStatus: 'pending',
    }
  })

  const totalAmount = orderItemsData.reduce((sum, i) => sum + i.amount, 0)
  const platformFee = calcPlatformFee(totalAmount)

  const order = await prisma.order.create({
    data: {
      buyerEmail,
      totalAmount,
      platformFee,
      status: 'initiated',
      items: { create: orderItemsData },
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: buyerEmail,
    line_items: items.map((cartItem) => {
      const product = products.find((p) => p.id === cartItem.productId)!
      // Stripe only accepts absolute public image URLs
      const images = product.imageUrl.startsWith('http') ? [product.imageUrl] : []
      return {
        price_data: {
          currency: 'usd',
          unit_amount: product.price,
          product_data: {
            name: product.name,
            ...(images.length > 0 && { images }),
          },
        },
        quantity: cartItem.quantity,
      }
    }),
    success_url: `${appUrl}/buyer/checkout/success?order_id=${order.id}`,
    cancel_url: `${appUrl}/api/checkout/cancel?order_id=${order.id}`,
    metadata: { orderId: order.id },
    payment_intent_data: {
      metadata: { orderId: order.id },
      transfer_group: order.id,
    },
  })

  return Response.json({ url: session.url, orderId: order.id })
}
