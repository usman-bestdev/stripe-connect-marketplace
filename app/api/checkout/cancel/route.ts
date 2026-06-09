import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('order_id')

  if (orderId) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    }).catch(() => null)
  }

  redirect('/buyer/checkout?cancelled=true')
}
