'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/context/cart-context'
import { formatCents } from '@/lib/utils/currency'

const TEST_CARDS = [
  {
    number: '4242 4242 4242 4242',
    label: 'Instant approval',
    description: 'Payment succeeds immediately with no extra steps.',
    badge: 'success' as const,
  },
  {
    number: '4000 0025 0000 3155',
    label: '3D Secure required',
    description: 'Triggers an authentication challenge before payment is confirmed.',
    badge: 'warning' as const,
  },
  {
    number: '4000 0000 0000 0002',
    label: 'Card declined',
    description: 'Payment is rejected immediately — no funds are captured.',
    badge: 'error' as const,
  },
  {
    number: '4000 0000 0000 9995',
    label: 'Insufficient funds',
    description: 'Declined with a specific insufficient funds reason code.',
    badge: 'error' as const,
  },
  {
    number: '4000 0000 0000 1629',
    label: 'Disputed after payment',
    description: 'Payment succeeds but the buyer later raises a dispute — useful for testing platform dispute handling.',
    badge: 'warning' as const,
  },
]

const badgeStyles = {
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  error: 'bg-red-100 text-red-600 border-red-200',
}

function TestCards() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  function copy(number: string) {
    navigator.clipboard.writeText(number.replace(/\s/g, ''))
    setCopied(number)
    toast.success('Card number copied')
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="rounded-lg border border-zinc-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-600 bg-zinc-50 hover:bg-zinc-100 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-xs font-mono bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded">
            TEST MODE
          </span>
          Stripe test cards
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform text-zinc-400 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="divide-y divide-zinc-100">
          <p className="px-4 py-2.5 text-xs text-zinc-400">
            Use any future expiry date and any 3-digit CVC. Click a card number to copy it.
          </p>
          {TEST_CARDS.map((card) => (
            <div
              key={card.number}
              className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors group"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded border ${badgeStyles[card.badge]}`}
                  >
                    {card.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{card.description}</p>
              </div>
              <button
                type="button"
                onClick={() => copy(card.number)}
                className="flex items-center gap-1.5 font-mono text-xs text-zinc-700 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1.5 rounded whitespace-nowrap transition-colors shrink-0"
              >
                {copied === card.number ? (
                  <Check size={11} className="text-green-600" />
                ) : (
                  <Copy size={11} className="text-zinc-400" />
                )}
                {card.number}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  const { items, total, clear } = useCart()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) return toast.error('Your cart is empty')
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
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
      clear()
      window.location.href = data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      submitting.current = false
      setLoading(false)
    }
  }

  if (items.length === 0) {
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

      <form onSubmit={handleCheckout} className="space-y-4">
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Redirecting to Stripe…' : 'Checkout with Stripe →'}
        </Button>
        <p className="text-xs text-center text-zinc-400">
          You&apos;ll be redirected to Stripe&apos;s secure payment page.
        </p>
      </form>

      <TestCards />
    </div>
  )
}
