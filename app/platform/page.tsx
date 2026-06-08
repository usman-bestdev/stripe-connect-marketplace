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
import { formatCents } from '@/lib/utils/currency'
import { OrderWithItems } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-zinc-100 text-zinc-600',
  paid: 'bg-blue-100 text-blue-700',
  transferred: 'bg-green-100 text-green-700',
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
  const pending = orders.filter((o) => o.status === 'pending')

  const totalRevenue = transferred.reduce((s, o) => s + o.totalAmount, 0)
  const totalFees = transferred.reduce((s, o) => s + o.platformFee, 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Platform dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Review orders and release funds to sellers.
        </p>
      </div>

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
          <TabsTrigger value="pending">Pending payment</TabsTrigger>
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
            orders={pending}
            loading={loading}
            emptyMessage="No pending orders."
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
