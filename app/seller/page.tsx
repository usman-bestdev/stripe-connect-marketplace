'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function Banners() {
  const params = useSearchParams()
  return (
    <>
      {params.get('onboarding') === 'incomplete' && (
        <div className="mb-6 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Onboarding incomplete — please finish all steps in Stripe before continuing.
        </div>
      )}
      {params.get('refresh') === 'true' && (
        <div className="mb-6 rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          Your onboarding link expired. Submit again to get a new one.
        </div>
      )}
    </>
  )
}

export default function SellerPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountName: name, email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create account')
      toast.success('Redirecting to Stripe onboarding…')
      window.location.href = data.onboardingUrl
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Suspense>
        <Banners />
      </Suspense>
      <Card>
        <CardHeader>
          <CardTitle>Become a Seller</CardTitle>
          <CardDescription>
            Create a Stripe Connect Express account to start selling. You&apos;ll be
            redirected to Stripe to complete identity verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Business / Display name</Label>
              <Input
                id="name"
                placeholder="Acme Store"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seller@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connecting…' : 'Connect with Stripe'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
