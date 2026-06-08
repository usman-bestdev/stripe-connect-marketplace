import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    include: { seller: true },
  })
  if (!product) {
    return Response.json({ error: 'Product not found' }, { status: 404 })
  }
  return Response.json(product)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { name, price, imageUrl } = body

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price: Math.round(Number(price)) }),
      ...(imageUrl !== undefined && { imageUrl }),
    },
  })
  return Response.json(product)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.product.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
