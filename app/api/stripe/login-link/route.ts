import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get('account_id')
  if (!accountId) {
    return Response.json({ error: 'account_id is required' }, { status: 400 })
  }

  const loginLink = await stripe.accounts.createLoginLink(accountId)

  return Response.json({ url: loginLink.url })
}
