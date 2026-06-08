import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const sellers = await prisma.sellerAccount.findMany({
    where: { onboardingComplete: true },
    include: { products: true },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(sellers)
}
