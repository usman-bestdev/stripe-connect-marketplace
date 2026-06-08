import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const orders = await prisma.order.findMany({
    include: {
      items: {
        include: { product: { include: { seller: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(orders)
}
