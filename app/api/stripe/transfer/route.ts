import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { calcPlatformFee } from '@/lib/utils/currency'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { orderId } = body

  if (!orderId) {
    return Response.json({ error: 'orderId is required' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        where: { transferStatus: 'pending' },
        include: { product: { include: { seller: true } } },
      },
    },
  })

  if (!order) {
    return Response.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status !== 'paid') {
    return Response.json({ error: 'Order is not in paid status' }, { status: 400 })
  }

  // Resolve the charge ID from the stored PaymentIntent so transfers can use
  // source_transaction — bypasses the platform available-balance requirement
  // and ties each transfer directly to the charge that funded it.
  let chargeId: string | undefined
  if (order.stripePaymentIntentId) {
    const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId)
    chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : undefined
  }

  let transferred = 0

  for (const item of order.items) {
    const sellerAmount = item.amount - calcPlatformFee(item.amount)

    await stripe.transfers.create({
      amount: sellerAmount,
      currency: 'usd',
      destination: item.product.seller.stripeAccountId,
      transfer_group: orderId,
      ...(chargeId ? { source_transaction: chargeId } : {}),
    })

    await prisma.orderItem.update({
      where: { id: item.id },
      data: { transferStatus: 'transferred' },
    })

    transferred += sellerAmount
  }

  if (order.items.length > 0) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'transferred' },
    })
  }

  return Response.json({ transferred })
}
