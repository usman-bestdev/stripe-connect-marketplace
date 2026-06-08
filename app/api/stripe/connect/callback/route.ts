import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get('account_id')
  if (!accountId) {
    return Response.json({ error: 'account_id is required' }, { status: 400 })
  }

  const account = await stripe.accounts.retrieve(accountId)
  const onboardingComplete =
    account.charges_enabled === true && account.details_submitted === true

  await prisma.sellerAccount.update({
    where: { stripeAccountId: accountId },
    data: { onboardingComplete },
  })

  redirect(onboardingComplete ? '/seller/products' : '/seller?onboarding=incomplete')
}
