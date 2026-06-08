/** Convert cents to formatted dollar string, e.g. 1999 → "$19.99" */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

/** Convert dollar amount to cents, e.g. 19.99 → 1999 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

/** Calculate platform fee in cents */
export function calcPlatformFee(totalCents: number): number {
  const feePct = parseInt(process.env.PLATFORM_FEE_PERCENT ?? '10', 10)
  return Math.round((totalCents * feePct) / 100)
}
