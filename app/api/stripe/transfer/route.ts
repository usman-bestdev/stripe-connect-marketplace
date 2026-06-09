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

  // Resolve charge + settlement details from the stored PaymentIntent.
  // Expanding latest_charge.balance_transaction gives us the currency the
  // platform actually settled in (may differ from the checkout currency when
  // the platform account uses a different default currency, e.g. GBP vs USD).
  // source_transaction requires the transfer currency to match the balance
  // transaction currency, so we use bt.currency and distribute bt.net
  // proportionally across sellers.
  let chargeId: string | undefined
  let transferCurrency = 'usd'
  let settlementNet = order.totalAmount  // net in transfer currency; fallback to USD cents

  if (order.stripePaymentIntentId) {
    const pi = await stripe.paymentIntents.retrieve(
      order.stripePaymentIntentId,
      { expand: ['latest_charge.balance_transaction'] }
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const charge = pi.latest_charge as any
    if (charge && typeof charge === 'object') {
      chargeId = charge.id as string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bt = charge.balance_transaction as any
      if (bt && typeof bt === 'object') {
        transferCurrency = bt.currency as string
        // bt.net = charge amount minus Stripe's own fee, in settlement currency.
        // This is the actual money that landed in the platform balance.
        settlementNet = bt.net as number
      }
    }
  }

  let transferred = 0

  for (const item of order.items) {
    // Seller's share as a proportion of the gross order total, then applied to
    // settlementNet (which is already net of Stripe's fee). Platform fee is
    // preserved proportionally in the remainder that stays on the platform.
    const sellerNetUsd = item.amount - calcPlatformFee(item.amount)
    const sellerRatio = order.totalAmount > 0 ? sellerNetUsd / order.totalAmount : 0
    const sellerAmount = Math.floor(settlementNet * sellerRatio)

    if (sellerAmount <= 0) continue

    await stripe.transfers.create({
      amount: sellerAmount,
      currency: transferCurrency,
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

  return Response.json({ transferred, currency: transferCurrency })
}
