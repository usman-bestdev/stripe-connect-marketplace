import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

// Generate a fresh onboarding link for an existing account (no new account created)
export async function GET(req: NextRequest) {
  const accountId = new URL(req.url).searchParams.get('account_id')
  if (!accountId) {
    return Response.json({ error: 'account_id is required' }, { status: 400 })
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/seller?refresh=true`,
    return_url: `${appUrl}/api/stripe/connect/callback?account_id=${accountId}`,
    type: 'account_onboarding',
  })
  return Response.json({ onboardingUrl: accountLink.url })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { accountName, email } = body

  if (!accountName || !email) {
    return Response.json({ error: 'accountName and email are required' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
  })

  await prisma.sellerAccount.create({
    data: {
      stripeAccountId: account.id,
      accountName,
      email,
      onboardingComplete: false,
    },
  })

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${appUrl}/seller?refresh=true`,
    return_url: `${appUrl}/api/stripe/connect/callback?account_id=${account.id}`,
    type: 'account_onboarding',
  })

  return Response.json({
    accountId: account.id,
    onboardingUrl: accountLink.url,
  })
}
