'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/context/cart-context'
import { formatCents } from '@/lib/utils/currency'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

function PayForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + '/buyer/checkout/success' },
      redirect: 'if_required',
    })
    if (error) {
      toast.error(error.message ?? 'Payment failed')
      setPaying(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      <Button type="submit" className="w-full" disabled={paying || !stripe}>
        {paying ? 'Processing…' : 'Pay now'}
      </Button>
    </form>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, clear } = useCart()
  const [email, setEmail] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [creatingIntent, setCreatingIntent] = useState(false)

  async function handleCreateIntent(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) return toast.error('Your cart is empty')
    setCreatingIntent(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          buyerEmail: email,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      setClientSecret(data.clientSecret)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setCreatingIntent(false)
    }
  }

  function onPaymentSuccess() {
    clear()
    toast.success('Payment confirmed!')
    router.push('/buyer/checkout/success')
  }

  if (items.length === 0 && !clientSecret) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center text-zinc-400">
        Your cart is empty.{' '}
        <a href="/buyer" className="underline text-zinc-600">
          Browse products
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Checkout</h1>

      <div className="rounded-lg border bg-white divide-y">
        {items.map((item) => (
          <div key={item.productId} className="flex justify-between px-4 py-3 text-sm">
            <span>
              {item.product.name}{' '}
              <span className="text-zinc-400">× {item.quantity}</span>
            </span>
            <span className="font-medium">
              {formatCents(item.product.price * item.quantity)}
            </span>
          </div>
        ))}
        <div className="flex justify-between px-4 py-3 font-semibold text-sm">
          <span>Total</span>
          <span>{formatCents(total)}</span>
        </div>
      </div>

      <Separator />

      {!clientSecret ? (
        <form onSubmit={handleCreateIntent} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email for receipt</Label>
            <Input
              id="email"
              type="email"
              placeholder="buyer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={creatingIntent}>
            {creatingIntent ? 'Preparing payment…' : 'Continue to payment'}
          </Button>
        </form>
      ) : (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PayForm clientSecret={clientSecret} onSuccess={onPaymentSuccess} />
        </Elements>
      )}
    </div>
  )
}
