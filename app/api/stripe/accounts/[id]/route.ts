import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  await stripe.accounts.del(id)

  // Best-effort DB cleanup
  await prisma.sellerAccount
    .delete({ where: { stripeAccountId: id } })
    .catch(() => null)

  return new Response(null, { status: 204 })
}
