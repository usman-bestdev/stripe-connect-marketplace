import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcPlatformFee } from '@/lib/utils/currency'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const items = await prisma.orderItem.findMany({
    where: {
      product: { sellerId: id },
      transferStatus: 'transferred',
    },
    select: { amount: true, orderId: true },
  })

  const grossSales = items.reduce((s, i) => s + i.amount, 0)
  const platformFee = items.reduce((s, i) => s + calcPlatformFee(i.amount), 0)
  const netEarned = grossSales - platformFee
  const completedOrders = new Set(items.map((i) => i.orderId)).size
  const feePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? 10)

  return Response.json({ grossSales, platformFee, netEarned, completedOrders, feePercent })
}
