import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function SuccessPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
      <div className="text-5xl">🎉</div>
      <h1 className="text-2xl font-bold text-zinc-900">Payment confirmed!</h1>
      <p className="text-zinc-500 text-sm">
        Your order is placed. The platform will release funds to the sellers shortly.
      </p>
      <div className="flex gap-3 justify-center pt-2">
        <Link href="/buyer">
          <Button variant="outline">Keep shopping</Button>
        </Link>
        <Link href="/platform">
          <Button>View platform dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
