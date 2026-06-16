'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw } from 'lucide-react'
import { formatCents } from '@/lib/utils/currency'
import { OrderWithItems } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  initiated: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-zinc-100 text-zinc-500',
  paid: 'bg-blue-100 text-blue-700',
  transferred: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-500',
}

interface BalanceEntry {
  amount: number
  currency: string
}

function PlatformBalance() {
  const [available, setAvailable] = useState<BalanceEntry[]>([])
  const [pending, setPending] = useState<BalanceEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBalance = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/balance')
      if (!res.ok) throw new Error('Failed to fetch balance')
      const data = await res.json()
      setAvailable(data.available)
      setPending(data.pending)
    } catch {
      toast.error('Could not load Stripe balance')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  function formatBalance(entries: BalanceEntry[]) {
    if (entries.length === 0) return '—'
    return entries
      .map((b) => `${(b.amount / 100).toFixed(2)} ${b.currency.toUpperCase()}`)
      .join(' · ')
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-800">Platform Stripe balance</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Your platform account — fees collected from transfers
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs h-7"
          onClick={fetchBalance}
          disabled={loading}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
          <p className="text-xs text-green-600 font-medium mb-1">Available</p>
          {loading ? (
            <div className="h-5 w-28 rounded bg-green-100 animate-pulse" />
          ) : (
            <p className="text-lg font-bold text-green-800">
              {formatBalance(available)}
            </p>
          )}
          <p className="text-xs text-green-500 mt-0.5">Ready to pay out to your bank</p>
        </div>
        <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3">
          <p className="text-xs text-zinc-500 font-medium mb-1">Pending</p>
          {loading ? (
            <div className="h-5 w-28 rounded bg-zinc-200 animate-pulse" />
          ) : (
            <p className="text-lg font-bold text-zinc-700">
              {formatBalance(pending)}
            </p>
          )}
          <p className="text-xs text-zinc-400 mt-0.5">Settling — available in 1–2 days</p>
        </div>
      </div>
    </div>
  )
}

export default function PlatformPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [releasing, setReleasing] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders')
    const data = await res.json()
    setOrders(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  async function releaseFunds(orderId: string) {
    setReleasing(orderId)
    try {
      const res = await fetch('/api/stripe/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Transfer failed')
      toast.success(`Transferred ${formatCents(data.transferred)} to sellers`)
      await fetchOrders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setReleasing(null)
    }
  }

  const paid = orders.filter((o) => o.status === 'paid')
  const transferred = orders.filter((o) => o.status === 'transferred')
  const pendingOrders = orders.filter((o) => o.status === 'initiated' || o.status === 'pending')
  const cancelled = orders.filter((o) => o.status === 'cancelled')

  const totalRevenue = transferred.reduce((s, o) => s + o.totalAmount, 0)
  const totalFees = transferred.reduce((s, o) => s + o.platformFee, 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Platform dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Review orders, release funds to sellers, and monitor your Stripe balance.
        </p>
      </div>

      {/* Platform Stripe balance */}
      <PlatformBalance />

      {/* Order stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total orders" value={orders.length} />
        <StatCard label="Awaiting release" value={paid.length} highlight />
        <StatCard label="GMV transferred" value={formatCents(totalRevenue)} />
        <StatCard label="Platform fees earned" value={formatCents(totalFees)} />
      </div>

      <Tabs defaultValue="paid">
        <TabsList>
          <TabsTrigger value="paid">
            Awaiting release{' '}
            {paid.length > 0 && (
              <Badge className="ml-1.5 h-4 px-1 text-[10px]">{paid.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="transferred">Transferred</TabsTrigger>
          <TabsTrigger value="pending">
            In progress
            {pendingOrders.length > 0 && (
              <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-zinc-400">{pendingOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled
            {cancelled.length > 0 && (
              <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-red-400">{cancelled.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paid">
          <OrderTable
            orders={paid}
            loading={loading}
            emptyMessage="No paid orders awaiting fund release."
            action={(o) => (
              <Button
                size="sm"
                disabled={releasing === o.id}
                onClick={() => releaseFunds(o.id)}
              >
                {releasing === o.id ? 'Releasing…' : 'Release funds'}
              </Button>
            )}
          />
        </TabsContent>
        <TabsContent value="transferred">
          <OrderTable
            orders={transferred}
            loading={loading}
            emptyMessage="No transferred orders yet."
          />
        </TabsContent>
        <TabsContent value="pending">
          <OrderTable
            orders={pendingOrders}
            loading={loading}
            emptyMessage="No in-progress orders."
          />
        </TabsContent>
        <TabsContent value="cancelled">
          <OrderTable
            orders={cancelled}
            loading={loading}
            emptyMessage="No cancelled orders."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <Card className={highlight && Number(value) > 0 ? 'border-blue-200 bg-blue-50' : ''}>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-zinc-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-bold text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  )
}

function OrderTable({
  orders,
  loading,
  emptyMessage,
  action,
}: {
  orders: OrderWithItems[]
  loading: boolean
  emptyMessage: string
  action?: (order: OrderWithItems) => React.ReactNode
}) {
  if (loading) {
    return <div className="h-32 rounded-lg bg-zinc-100 animate-pulse mt-4" />
  }
  if (orders.length === 0) {
    return <p className="text-sm text-zinc-400 py-8 text-center">{emptyMessage}</p>
  }
  return (
    <Table className="mt-2">
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Buyer</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Fee</TableHead>
          <TableHead>Status</TableHead>
          {action && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => (
          <TableRow key={o.id}>
            <TableCell className="font-mono text-xs text-zinc-400">
              {o.id.slice(0, 8)}…
            </TableCell>
            <TableCell className="text-sm">{o.buyerEmail}</TableCell>
            <TableCell className="text-sm">{o.items.length}</TableCell>
            <TableCell className="text-sm font-medium">{formatCents(o.totalAmount)}</TableCell>
            <TableCell className="text-sm text-zinc-500">{formatCents(o.platformFee)}</TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? 'bg-zinc-100 text-zinc-600'}`}
              >
                {o.status}
              </span>
            </TableCell>
            {action && <TableCell className="text-right">{action(o)}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
