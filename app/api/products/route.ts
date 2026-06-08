import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const products = await prisma.product.findMany({
    include: { seller: true },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(products)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, price, imageUrl, sellerId } = body

  if (!name || !price || !sellerId) {
    return Response.json({ error: 'name, price, and sellerId are required' }, { status: 400 })
  }

  const seller = await prisma.sellerAccount.findUnique({ where: { id: sellerId } })
  if (!seller) {
    return Response.json({ error: 'Seller not found' }, { status: 404 })
  }

  const product = await prisma.product.create({
    data: {
      name,
      price: Math.round(Number(price)),
      imageUrl: imageUrl ?? '/placeholder.png',
      sellerId,
    },
  })
  return Response.json(product, { status: 201 })
}
