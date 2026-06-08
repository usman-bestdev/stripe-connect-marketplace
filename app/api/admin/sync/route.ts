import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const accounts = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const page = await stripe.accounts.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    accounts.push(...page.data)
    hasMore = page.has_more
    if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id
  }

  let upserted = 0
  for (const account of accounts) {
    const accountName =
      account.business_profile?.name ??
      (account as { display_name?: string }).display_name ??
      account.email ??
      account.id

    await prisma.sellerAccount.upsert({
      where: { stripeAccountId: account.id },
      update: {
        email: account.email ?? '',
        onboardingComplete: account.charges_enabled === true && account.details_submitted === true,
      },
      create: {
        stripeAccountId: account.id,
        accountName,
        email: account.email ?? '',
        onboardingComplete: account.charges_enabled === true && account.details_submitted === true,
      },
    })
    upserted++
  }

  return Response.json({ upserted })
}
