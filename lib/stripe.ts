import Stripe from 'stripe'

// Stripe SDK v22 emits a process warning on every v1 accounts.* call suggesting
// migration to Accounts v2. We use v1 Connect Express intentionally — suppress it.
const _emitWarning = process.emitWarning.bind(process) as typeof process.emitWarning
process.emitWarning = (warning, ...args) => {
  if (typeof warning === 'string' && warning.includes('Accounts v2')) return
  // @ts-expect-error — TypeScript can't unify the overloaded rest args
  _emitWarning(warning, ...args)
}

let _client: Stripe | null = null

function getClient(): Stripe {
  if (!_client) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _client = new Stripe(key, { apiVersion: '2026-05-27.dahlia', typescript: true })
  }
  return _client
}

// Proxy defers client creation to first use (request time, not module-import/build time).
export const stripe = new Proxy({} as Stripe, {
  get(_, prop: string | symbol) {
    return getClient()[prop as keyof Stripe]
  },
})
