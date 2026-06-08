import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/stripe/accounts
 *
 * Deletes Connect accounts from Stripe and the local DB.
 *
 * Query params:
 *   (none)       — delete only restricted / onboarding-incomplete accounts
 *   ?all=true    — delete every connected account regardless of status
 *   ?db-only=true — purge local DB rows only, skip Stripe API calls
 */
export async function DELETE(req: NextRequest) {
  const deleteAll = req.nextUrl.searchParams.get('all') === 'true'
  const dbOnly = req.nextUrl.searchParams.get('db-only') === 'true'

  const deleted: string[] = []
  const failed: { stripeAccountId: string; error: string }[] = []

  if (!dbOnly) {
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const page = await stripe.accounts.list({
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })

      for (const account of page.data) {
        const isRestricted = !account.charges_enabled || !account.details_submitted

        if (!deleteAll && !isRestricted) continue

        try {
          await stripe.accounts.del(account.id)
          deleted.push(account.id)

          await prisma.sellerAccount
            .delete({ where: { stripeAccountId: account.id } })
            .catch(() => null)
        } catch (err) {
          failed.push({
            stripeAccountId: account.id,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }

      hasMore = page.has_more
      if (page.data.length > 0) {
        startingAfter = page.data[page.data.length - 1].id
      }
    }
  } else {
    const where = deleteAll ? undefined : { onboardingComplete: false }
    const rows = await prisma.sellerAccount.findMany({ where })
    for (const row of rows) {
      await prisma.sellerAccount.delete({ where: { id: row.id } })
      deleted.push(row.stripeAccountId)
    }
  }

  return Response.json(
    { deleted, failed, total: deleted.length },
    { status: failed.length > 0 && deleted.length === 0 ? 500 : 200 }
  )
}

/**
 * GET /api/stripe/accounts
 *
 * Lists all connected accounts directly from Stripe (live status, not DB).
 */
export async function GET(_req: NextRequest) {
  const accounts = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const page = await stripe.accounts.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    for (const account of page.data) {
      accounts.push({
        id: account.id,
        email: account.email,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
        restricted: !account.charges_enabled || !account.details_submitted,
        created: account.created ? new Date(account.created * 1000).toISOString() : null,
      })
    }

    hasMore = page.has_more
    if (page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id
    }
  }

  return Response.json({ total: accounts.length, accounts })
}
