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
      status: 'pending',
      items: { create: orderItemsData },
    },
  })

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount,
    currency: 'usd',
    receipt_email: buyerEmail,
    metadata: { orderId: order.id },
  })

  return Response.json({
    clientSecret: paymentIntent.client_secret,
    orderId: order.id,
  })
}
