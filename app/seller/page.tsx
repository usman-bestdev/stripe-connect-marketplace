'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { PlusCircle, ExternalLink, RefreshCw, Trash2, AlertTriangle, DatabaseZap, CloudDownload, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface StripeAccount {
  id: string
  email: string | null
  chargesEnabled: boolean
  detailsSubmitted: boolean
  restricted: boolean
  created: string | null
}

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

function AddSellerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting.current) return
    submitting.current = true
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
      setOpen(false)
      onCreated()
      window.location.href = data.onboardingUrl
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button className="gap-2">
          <PlusCircle size={16} />
          Add seller
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a new seller</DialogTitle>
          <DialogDescription>
            Creates a Stripe Connect Express account and redirects to Stripe onboarding.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
      </DialogContent>
    </Dialog>
  )
}

type DeleteScope = 'incomplete' | 'all'

function BulkDeleteDialog({
  accounts,
  onDeleted,
}: {
  accounts: StripeAccount[]
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<DeleteScope>('incomplete')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)

  const incomplete = accounts.filter((a) => a.restricted).length
  const total = accounts.length
  const targetCount = scope === 'all' ? total : incomplete

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setScope('incomplete')
      setConfirmed(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      const url =
        scope === 'all'
          ? '/api/stripe/accounts?all=true'
          : '/api/stripe/accounts'
      const res = await fetch(url, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error('Bulk delete failed')
      toast.success(
        `Deleted ${data.deleted.length} account${data.deleted.length !== 1 ? 's' : ''}` +
          (data.failed.length ? ` · ${data.failed.length} failed` : '')
      )
      setOpen(false)
      onDeleted()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        className="gap-2"
        disabled={accounts.length === 0}
        onClick={() => setOpen(true)}
      >
        <Trash2 size={16} />
        Delete accounts
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Delete accounts
          </DialogTitle>
          <DialogDescription>
            Accounts are permanently deleted from Stripe and the local database.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Scope selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">What to delete</Label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-zinc-50 transition-colors has-[:checked]:border-red-300 has-[:checked]:bg-red-50">
                <input
                  type="radio"
                  name="scope"
                  value="incomplete"
                  checked={scope === 'incomplete'}
                  onChange={() => setScope('incomplete')}
                  className="mt-0.5 accent-red-500"
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    Incomplete accounts only
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Deletes {incomplete} restricted / onboarding-incomplete
                    account{incomplete !== 1 ? 's' : ''}
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-zinc-50 transition-colors has-[:checked]:border-red-300 has-[:checked]:bg-red-50">
                <input
                  type="radio"
                  name="scope"
                  value="all"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="mt-0.5 accent-red-500"
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    All accounts
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Deletes all {total} connected account{total !== 1 ? 's' : ''} including active
                    sellers
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="h-4 w-4 rounded accent-red-500"
            />
            <span className="text-sm text-zinc-700">
              I understand that deleting{' '}
              <strong>{targetCount} account{targetCount !== 1 ? 's' : ''}</strong> is
              permanent and cannot be reversed.
            </span>
          </label>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={!confirmed || loading || targetCount === 0}
              onClick={handleDelete}
            >
              {loading
                ? 'Deleting…'
                : `Delete ${targetCount} account${targetCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

function CleanDbDialog({ onCleaned }: { onCleaned: () => void }) {
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [deleteStripe, setDeleteStripe] = useState(false)
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setConfirmed(false)
      setDeleteStripe(false)
    }
  }

  async function handleClean() {
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    try {
      const url = deleteStripe ? '/api/admin/db?stripe=completed' : '/api/admin/db'
      const res = await fetch(url, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error('Database clean failed')
      const { deleted, stripe } = data
      const stripePart = stripe
        ? ` · ${stripe.deleted} Stripe account${stripe.deleted !== 1 ? 's' : ''} deleted${stripe.failed ? ` (${stripe.failed} failed)` : ''}`
        : ''
      toast.success(
        `Cleaned DB — ${deleted.sellers} sellers · ${deleted.products} products · ${deleted.orders} orders · ${deleted.orderItems} items${stripePart}`
      )
      setOpen(false)
      onCleaned()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Clean failed')
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-zinc-600 border-zinc-300 hover:border-red-300 hover:text-red-600 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <DatabaseZap size={14} />
        Clean DB
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              Clean database
            </DialogTitle>
            <DialogDescription>
              Permanently deletes all sellers, products, orders, and order items
              from the local database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer select-none hover:bg-zinc-50 transition-colors has-[:checked]:border-red-300 has-[:checked]:bg-red-50">
              <input
                type="checkbox"
                checked={deleteStripe}
                onChange={(e) => setDeleteStripe(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-red-500"
              />
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  Also delete completed Stripe accounts
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Permanently removes fully onboarded Connect accounts from Stripe.
                  Incomplete accounts are left untouched.
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="h-4 w-4 rounded accent-red-500"
              />
              <span className="text-sm text-zinc-700">
                I understand this will wipe <strong>all data</strong> and cannot be undone.
              </span>
            </label>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={!confirmed || loading}
                onClick={handleClean}
              >
                {loading ? 'Cleaning…' : 'Wipe database'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StripeDashboardButton({ accountId }: { accountId: string }) {
  const [loading, setLoading] = useState(false)

  async function openDashboard() {
    setLoading(true)
    try {
      const res = await fetch(`/api/stripe/login-link?account_id=${accountId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate link')
      window.open(data.url, '_blank')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs h-7"
      disabled={loading}
      onClick={openDashboard}
    >
      <LayoutDashboard size={12} />
      {loading ? 'Opening…' : 'Balance'}
    </Button>
  )
}

export default function SellerPage() {
  const [accounts, setAccounts] = useState<StripeAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/accounts')
      const data = await res.json()
      setAccounts(data.accounts ?? [])
    } catch {
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  async function handleDeleteSingle(accountId: string) {
    setDeleting(accountId)
    try {
      const res = await fetch(`/api/stripe/accounts/${accountId}`, {
        method: 'DELETE',
      })
      if (res.ok || res.status === 404) {
        setAccounts((prev) => prev.filter((a) => a.id !== accountId))
        toast.success('Account deleted')
      } else {
        const data = await res.json()
        throw new Error(data.error ?? 'Delete failed')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const total = accounts.length
  const completed = accounts.filter((a) => !a.restricted).length
  const restricted = accounts.filter((a) => a.restricted).length

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <Suspense>
        <Banners />
      </Suspense>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Seller accounts</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage Stripe Connect Express accounts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAccounts}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={async () => {
              const res = await fetch('/api/admin/sync', { method: 'POST' })
              const data = await res.json()
              if (res.ok) {
                toast.success(`Synced ${data.upserted} account${data.upserted !== 1 ? 's' : ''} from Stripe`)
                fetchAccounts()
              } else {
                toast.error('Sync failed')
              }
            }}
          >
            <CloudDownload size={14} />
            Sync from Stripe
          </Button>
          <CleanDbDialog onCleaned={fetchAccounts} />
          <BulkDeleteDialog accounts={accounts} onDeleted={fetchAccounts} />
          <AddSellerDialog onCreated={fetchAccounts} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-zinc-500">
              Total accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-zinc-900">{loading ? '—' : total}</p>
          </CardContent>
        </Card>
        <Card className={completed > 0 ? 'border-green-200 bg-green-50' : ''}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-zinc-500">
              Onboarding complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">{loading ? '—' : completed}</p>
          </CardContent>
        </Card>
        <Card className={restricted > 0 ? 'border-amber-200 bg-amber-50' : ''}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-zinc-500">
              Restricted / incomplete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">{loading ? '—' : restricted}</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        {loading ? (
          <div className="h-48 animate-pulse bg-zinc-50" />
        ) : accounts.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-sm">
            No connected accounts yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-mono text-xs text-zinc-500">
                    {account.id}
                  </TableCell>
                  <TableCell className="text-sm">
                    {account.email ?? <span className="text-zinc-400 italic">—</span>}
                  </TableCell>
                  <TableCell>
                    {account.restricted ? (
                      <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                        Restricted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {account.created
                      ? new Date(account.created).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {account.restricted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs h-7"
                          onClick={async () => {
                            const res = await fetch(
                              `/api/stripe/connect?account_id=${account.id}`
                            )
                            if (res.ok) {
                              const data = await res.json()
                              window.open(data.onboardingUrl, '_blank')
                            }
                          }}
                        >
                          <ExternalLink size={12} />
                          Resume onboarding
                        </Button>
                      )}
                      {!account.restricted && (
                        <>
                          <StripeDashboardButton accountId={account.id} />
                          <a
                            href="/seller/products"
                            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                          >
                            Manage products
                          </a>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                        disabled={deleting === account.id}
                        onClick={() => handleDeleteSingle(account.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
