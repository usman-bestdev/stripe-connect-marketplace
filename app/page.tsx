import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CleanDbButton } from '@/components/clean-db-button'

const roles = [
  {
    href: '/seller',
    title: 'Seller',
    description: 'Create a Stripe Connect account, complete onboarding, and manage your product catalog.',
    icon: '🏪',
  },
  {
    href: '/buyer',
    title: 'Buyer',
    description: 'Browse products from multiple sellers, add to cart, and pay with a single checkout.',
    icon: '🛒',
  },
  {
    href: '/platform',
    title: 'Platform',
    description: 'View all orders and release funds to sellers after payment is confirmed.',
    icon: '⚙️',
  },
]

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 mb-3">
          Stripe Connect Marketplace
        </h1>
        <p className="text-lg text-zinc-500 max-w-xl mx-auto">
          A multi-party marketplace demo. Choose a role to explore the full
          seller onboarding, buyer checkout, and platform payout flow.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {roles.map(({ href, title, description, icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md cursor-pointer">
              <CardHeader>
                <div className="text-3xl mb-2">{icon}</div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <CleanDbButton />
      </div>
    </div>
  )
}
