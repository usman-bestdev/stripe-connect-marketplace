'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/context/cart-context'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Home' },
  { href: '/seller', label: 'Seller' },
  { href: '/buyer', label: 'Buyer' },
  { href: '/platform', label: 'Platform' },
]

export function Nav() {
  const pathname = usePathname()
  const { count } = useCart()

  return (
    <header className="border-b bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-sm tracking-tight">
          Stripe Marketplace
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-colors',
                pathname === href
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              )}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/buyer/checkout"
            className="relative ml-2 p-2 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <ShoppingCart size={18} />
            {count > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {count}
              </Badge>
            )}
          </Link>
        </nav>
      </div>
    </header>
  )
}
