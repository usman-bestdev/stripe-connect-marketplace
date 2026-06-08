'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { DatabaseZap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function CleanDbButton() {
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
        `Cleaned — ${deleted.sellers} sellers · ${deleted.products} products · ${deleted.orders} orders · ${deleted.orderItems} items${stripePart}`
      )
      setOpen(false)
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
        variant="ghost"
        size="sm"
        className="gap-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <DatabaseZap size={14} />
        Clean database
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clean database</DialogTitle>
            <DialogDescription>
              Deletes all local records — sellers, products, orders, and order items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
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
              <span className="text-sm text-zinc-600">
                I understand this cannot be undone.
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
