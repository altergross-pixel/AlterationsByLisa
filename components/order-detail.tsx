'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Calendar, ClipboardList, Trash2, ChevronRight, Plus, Minus, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatCurrency, formatDate, balanceDue } from '@/lib/utils'
import {
  updateOrderStatus,
  addDeposit,
  markFullyPaid,
  addOrderItem,
  removeOrderItem,
  deleteOrder,
} from '@/lib/actions'
import { STATUS_COLORS, STATUS_LABELS, STATUS_DOT } from '@/types'
import type { OrderWithRelations, OrderStatus, PricingItem } from '@/types'

const STATUS_FLOW: OrderStatus[] = ['new', 'in_progress', 'ready', 'picked_up']

const STATUS_NEXT_LABEL: Record<OrderStatus, string> = {
  new: 'Start Working →',
  in_progress: 'Mark Ready →',
  ready: 'Mark Picked Up →',
  picked_up: 'Already Picked Up',
}

const STATUS_NEXT_COLOR: Record<OrderStatus, 'default' | 'gold' | 'success'> = {
  new: 'gold',
  in_progress: 'gold',
  ready: 'success',
  picked_up: 'default',
}

interface Props {
  order: OrderWithRelations
  pricing: PricingItem[]
}

export function OrderDetail({ order, pricing }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [depositAmount, setDepositAmount] = useState('')
  const [depositOpen, setDepositOpen] = useState(false)
  const [addServiceOpen, setAddServiceOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [selectedService, setSelectedService] = useState<PricingItem | null>(null)
  const [addQty, setAddQty] = useState(1)

  const balance = balanceDue(order.subtotal, order.total_paid)
  const nextStatusIdx = STATUS_FLOW.indexOf(order.status) + 1
  const nextStatus = nextStatusIdx < STATUS_FLOW.length ? STATUS_FLOW[nextStatusIdx] : null

  function handleStatusAdvance() {
    if (!nextStatus) return
    startTransition(async () => {
      await updateOrderStatus(order.id, nextStatus)
      router.refresh()
    })
  }

  function handleDeposit() {
    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount <= 0) return
    startTransition(async () => {
      await addDeposit(order.id, amount)
      setDepositAmount('')
      setDepositOpen(false)
      router.refresh()
    })
  }

  function handleMarkPaid() {
    startTransition(async () => {
      await markFullyPaid(order.id)
      router.refresh()
    })
  }

  function handleAddService() {
    startTransition(async () => {
      if (selectedService) {
        await addOrderItem(order.id, {
          service_name: selectedService.service_name,
          price: selectedService.price,
          quantity: addQty,
        })
      } else if (customName.trim() && customPrice) {
        await addOrderItem(order.id, {
          service_name: customName.trim(),
          price: parseFloat(customPrice),
          quantity: addQty,
        })
      }
      setAddServiceOpen(false)
      setSelectedService(null)
      setCustomName('')
      setCustomPrice('')
      setAddQty(1)
      router.refresh()
    })
  }

  function handleRemoveItem(itemId: string) {
    startTransition(async () => {
      await removeOrderItem(order.id, itemId)
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteOrder(order.id)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Order Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-charcoal">
            {order.customers.name}
          </h1>
          <p className="text-charcoal-muted font-sans text-sm mt-1">Order #{order.order_number}</p>
        </div>
        <Badge className={`${STATUS_COLORS[order.status]} text-sm px-3 py-1.5`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${STATUS_DOT[order.status]}`} />
          {STATUS_LABELS[order.status]}
        </Badge>
      </div>

      {/* ── Status Advance ── */}
      {order.status !== 'picked_up' && nextStatus && (
        <Button
          onClick={handleStatusAdvance}
          disabled={isPending}
          variant={STATUS_NEXT_COLOR[order.status]}
          size="lg"
          className="w-full"
        >
          {STATUS_NEXT_LABEL[order.status]}
          <ChevronRight className="w-5 h-5" />
        </Button>
      )}

      {/* ── Customer Info ── */}
      <Card>
        <CardHeader>
          <CardTitle>Customer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-0">
          {order.customers.phone && (
            <a
              href={`tel:${order.customers.phone}`}
              className="flex items-center gap-3 text-charcoal font-sans text-base hover:text-gold transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-charcoal-muted" />
              </div>
              {order.customers.phone}
            </a>
          )}
          {order.pickup_date && (
            <div className="flex items-center gap-3 text-charcoal font-sans text-base">
              <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-charcoal-muted" />
              </div>
              Pickup: {formatDate(order.pickup_date)}
            </div>
          )}
          {order.notes && (
            <div className="flex items-start gap-3 text-charcoal font-sans text-sm">
              <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ClipboardList className="w-4 h-4 text-charcoal-muted" />
              </div>
              <p className="pt-2 text-charcoal-muted">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Services ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Services</CardTitle>
            <Dialog open={addServiceOpen} onOpenChange={setAddServiceOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1 text-gold font-sans text-sm font-semibold hover:text-gold-dark transition-colors">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Service</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3 mt-2">
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {pricing.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedService(p); setCustomName(''); setCustomPrice('') }}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${
                          selectedService?.id === p.id
                            ? 'border-gold bg-gold/5'
                            : 'border-border bg-white hover:border-gold/30'
                        }`}
                      >
                        <p className="font-sans font-semibold text-charcoal text-sm">{p.service_name}</p>
                        <p className="font-bold text-gold text-sm">{formatCurrency(p.price)}</p>
                      </button>
                    ))}
                  </div>

                  <div className="divider" />
                  <p className="text-xs text-charcoal-muted font-sans font-semibold uppercase tracking-wider">Or custom</p>
                  <Input
                    placeholder="Service name"
                    value={customName}
                    onChange={(e) => { setCustomName(e.target.value); setSelectedService(null) }}
                  />
                  <Input
                    type="number"
                    placeholder="Price"
                    value={customPrice}
                    onChange={(e) => { setCustomPrice(e.target.value); setSelectedService(null) }}
                    min="0"
                  />

                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-sans text-charcoal">Qty:</span>
                    <button onClick={() => setAddQty(Math.max(1, addQty - 1))} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center active:scale-90">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-bold font-sans">{addQty}</span>
                    <button onClick={() => setAddQty(addQty + 1)} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center active:scale-90">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Button
                    onClick={handleAddService}
                    disabled={isPending || (!selectedService && (!customName.trim() || !customPrice))}
                    variant="gold"
                    size="lg"
                    className="w-full mt-1"
                  >
                    Add to Order
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {order.order_items.length === 0 ? (
            <p className="text-charcoal-muted font-sans text-sm text-center py-4">No services added</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-semibold text-charcoal text-sm">
                      {item.service_name}
                      {item.quantity > 1 && <span className="text-charcoal-muted ml-1">× {item.quantity}</span>}
                    </p>
                    {item.notes && <p className="text-xs text-charcoal-muted mt-0.5">{item.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-charcoal font-sans">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isPending}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Payment ── */}
      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center justify-between py-2">
              <span className="font-sans text-charcoal-muted">Subtotal</span>
              <span className="font-sans font-semibold text-charcoal">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.deposit_paid > 0 && (
              <div className="flex items-center justify-between py-2">
                <span className="font-sans text-charcoal-muted">Deposit Paid</span>
                <span className="font-sans font-semibold text-emerald-600">− {formatCurrency(order.deposit_paid)}</span>
              </div>
            )}
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="font-sans font-bold text-charcoal">Balance Due</span>
              <span className={`font-serif text-2xl font-bold ${balance > 0 ? 'text-charcoal' : 'text-emerald-600'}`}>
                {balance > 0 ? formatCurrency(balance) : 'Paid ✓'}
              </span>
            </div>
          </div>

          {order.status !== 'picked_up' && balance > 0 && (
            <div className="flex flex-col gap-2">
              <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="w-full">
                    Record Deposit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Deposit</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 mt-2">
                    <div>
                      <p className="text-sm text-charcoal-muted font-sans mb-2">Balance due: {formatCurrency(balance)}</p>
                      <Input
                        type="number"
                        placeholder="Amount received"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        min="0"
                        step="0.50"
                        autoFocus
                      />
                    </div>
                    <Button onClick={handleDeposit} disabled={isPending || !depositAmount} variant="gold" size="lg" className="w-full">
                      Record Payment
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleMarkPaid}
                disabled={isPending}
                variant="success"
                size="lg"
                className="w-full"
              >
                Mark Fully Paid · {formatCurrency(balance)}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Danger Zone ── */}
      <div className="pt-2">
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 text-red-400 hover:text-red-600 font-sans text-sm transition-colors mx-auto">
              <Trash2 className="w-4 h-4" />
              Delete this order
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Order?</DialogTitle>
            </DialogHeader>
            <p className="text-charcoal-muted font-sans text-sm mb-4">
              This will permanently delete the order for <strong>{order.customers.name}</strong>. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setDeleteOpen(false)} variant="outline" className="flex-1">Cancel</Button>
              <Button onClick={handleDelete} disabled={isPending} variant="danger" className="flex-1">
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
