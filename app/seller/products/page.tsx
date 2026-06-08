'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCents } from '@/lib/utils/currency'
import { SellerWithProducts, ProductItem } from '@/types'

export default function SellerProductsPage() {
  const [sellers, setSellers] = useState<SellerWithProducts[]>([])
  const [selectedSellerId, setSelectedSellerId] = useState('')
  const [products, setProducts] = useState<ProductItem[]>([])
  const [form, setForm] = useState({ name: '', price: '', imageUrl: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/sellers')
      .then((r) => r.json())
      .then((data: SellerWithProducts[]) => {
        setSellers(data)
        if (data.length > 0) {
          setSelectedSellerId(data[0].id)
          setProducts(data[0].products)
        }
      })
  }, [])

  function onSellerChange(id: string) {
    setSelectedSellerId(id)
    const seller = sellers.find((s) => s.id === id)
    setProducts(seller?.products ?? [])
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSellerId) return toast.error('No onboarded seller selected')
    setLoading(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          price: Math.round(parseFloat(form.price) * 100),
          imageUrl: form.imageUrl || undefined,
          sellerId: selectedSellerId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add product')
      setProducts((prev) => [data, ...prev])
      setForm({ name: '', price: '', imageUrl: '' })
      toast.success(`"${data.name}" added`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    setProducts((prev) => prev.filter((p) => p.id !== id))
    toast.success(`"${name}" removed`)
  }

  if (sellers.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-zinc-500">
        No onboarded sellers yet.{' '}
        <a href="/seller" className="underline text-zinc-900">
          Complete onboarding first.
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Product catalog</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage products for your seller account.</p>
      </div>

      <div className="space-y-1.5">
        <Label>Seller account</Label>
        <select
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          value={selectedSellerId}
          onChange={(e) => onSellerChange(e.target.value)}
        >
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.accountName} ({s.email})
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add product</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pname">Name</Label>
              <Input
                id="pname"
                placeholder="Handmade Candle"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="19.99"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="img">Image URL (optional)</Label>
              <Input
                id="img"
                placeholder="https://..."
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Adding…' : 'Add product'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">
          Products ({products.length})
        </h2>
        {products.length === 0 ? (
          <p className="text-sm text-zinc-400">No products yet.</p>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{p.name}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {formatCents(p.price)}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(p.id, p.name)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Separator />
    </div>
  )
}
