'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useCart } from '@/context/cart-context'
import { formatCents } from '@/lib/utils/currency'
import { ProductItem, SellerWithProducts } from '@/types'

interface ProductWithSeller extends ProductItem {
  seller: { accountName: string }
}

export default function BuyerPage() {
  const [products, setProducts] = useState<ProductWithSeller[]>([])
  const [loading, setLoading] = useState(true)
  const { add, count } = useCart()

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => setProducts(data))
      .finally(() => setLoading(false))
  }, [])

  function handleAdd(product: ProductWithSeller) {
    add(product, 1)
    toast.success(`"${product.name}" added to cart`)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Marketplace</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Products from multiple independent sellers — paid in one checkout.
          </p>
        </div>
        <Link href="/buyer/checkout">
          <Button variant="outline" className="gap-2">
            <ShoppingCart size={16} />
            Cart
            {count > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                {count}
              </Badge>
            )}
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          No products listed yet.{' '}
          <Link href="/seller" className="underline text-zinc-600">
            Add some as a seller.
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden flex flex-col">
              <div className="relative aspect-square bg-zinc-100">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = '/placeholder.png'
                  }}
                />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{product.name}</CardTitle>
                <p className="text-xs text-zinc-400">by {product.seller.accountName}</p>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-lg font-semibold text-zinc-900">
                  {formatCents(product.price)}
                </p>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button className="w-full" onClick={() => handleAdd(product)}>
                  Add to cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
