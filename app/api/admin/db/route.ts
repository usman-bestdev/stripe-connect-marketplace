import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest) {
  const deleteStripe = req.nextUrl.searchParams.get('stripe') === 'completed'

  let stripeDeleted = 0
  let stripeFailed = 0

  if (deleteStripe) {
    const completed = await prisma.sellerAccount.findMany({
      where: { onboardingComplete: true },
      select: { stripeAccountId: true },
    })
    for (const { stripeAccountId } of completed) {
      try {
        await stripe.accounts.del(stripeAccountId)
        stripeDeleted++
      } catch {
        stripeFailed++
      }
    }
  }

  // Must run in FK dependency order: children before parents
  const orderItems = await prisma.orderItem.deleteMany()
  const orders = await prisma.order.deleteMany()
  const products = await prisma.product.deleteMany()
  const sellers = await prisma.sellerAccount.deleteMany()

  return Response.json({
    deleted: {
      orderItems: orderItems.count,
      orders: orders.count,
      products: products.count,
      sellers: sellers.count,
    },
    stripe: deleteStripe ? { deleted: stripeDeleted, failed: stripeFailed } : null,
  })
}
