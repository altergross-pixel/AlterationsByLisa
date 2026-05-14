'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Phone, Calendar, ClipboardList, Trash2, ChevronRight,
  Plus, Minus, X, Pencil, Check, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatCurrency, formatDate, formatPriceRange, balanceDue, isFabricFee } from '@/lib/utils'
import {
  updateOrderStatus, addDeposit, markFullyPaid, deleteOrder,
  addGarmentToOrder, updateGarment, deleteGarment,
  addAlteration, removeAlteration,
} from '@/lib/actions'
import { STATUS_COLORS, STATUS_LABELS, STATUS_DOT, GARMENT_TYPES, CATEGORY_ORDER, CATEGORY_SHORT } from '@/types'
import { GarmentPhotos } from '@/components/garment-photos'
import type { OrderWithRelations, OrderStatus, PricingItem, GarmentAlteration } from '@/types'

const STATUS_FLOW: OrderStatus[] = ['new', 'in_progress', 'ready', 'picked_up']

const STATUS_NEXT_LABEL: Record<OrderStatus, string> = {
  new:        'Start Working →',
  in_progress:'Mark Ready for Pickup →',
  ready:      'Mark Picked Up →',
  picked_up:  'Picked Up',
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
  const [addGarmentOpen, setAddGarmentOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newGarmentType, setNewGarmentType] = useState('')
  const [newGarmentColor, setNewGarmentColor] = useState('')

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

  function handleAddGarment() {
    if (!newGarmentType) return
    startTransition(async () => {
      await addGarmentToOrder(order.id, {
        garment_type: newGarmentType,
        garment_color: newGarmentColor,
      })
      setNewGarmentType('')
      setNewGarmentColor('')
      setAddGarmentOpen(false)
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => { await deleteOrder(order.id) })
  }

  const sortedGarments = [...order.order_garments].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="flex flex-col gap-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-charcoal">
            {order.customers.name}
          </h1>
          <p className="text-charcoal-muted font-sans text-sm mt-1">
            Order #{order.order_number} · {sortedGarments.length}{' '}
            {sortedGarments.length === 1 ? 'garment' : 'garments'}
          </p>
        </div>
        <Badge className={`${STATUS_COLORS[order.status]} text-sm px-3 py-1.5 flex-shrink-0`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${STATUS_DOT[order.status]}`} />
          {STATUS_LABELS[order.status]}
        </Badge>
      </div>

      {/* ── Status advance ── */}
      {order.status !== 'picked_up' && nextStatus && (
        <Button
          onClick={handleStatusAdvance} disabled={isPending}
          variant={order.status === 'ready' ? 'success' : 'gold'}
          size="lg" className="w-full"
        >
          {STATUS_NEXT_LABEL[order.status]}
          <ChevronRight className="w-5 h-5" />
        </Button>
      )}

      {/* ── Customer info ── */}
      <Card>
        <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 pt-0">
          {order.customers.phone && (
            <a href={`tel:${order.customers.phone}`}
              className="flex items-center gap-3 text-charcoal hover:text-gold transition-colors">
              <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-charcoal-muted" />
              </div>
              <span className="font-sans">{order.customers.phone}</span>
            </a>
          )}
          {order.pickup_date && (
            <div className="flex items-center gap-3 text-charcoal">
              <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-charcoal-muted" />
              </div>
              <span className="font-sans">Pickup: {formatDate(order.pickup_date)}</span>
            </div>
          )}
          {order.notes && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ClipboardList className="w-4 h-4 text-charcoal-muted" />
              </div>
              <p className="pt-2 text-sm text-charcoal-muted font-sans">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Garments ── */}
      <div className="flex flex-col gap-3">
        {sortedGarments.map((garment, idx) => (
          <GarmentDetailCard
            key={garment.id}
            garment={garment}
            index={idx}
            orderId={order.id}
            pricing={pricing}
            isPending={isPending}
            startTransition={startTransition}
            onRefresh={() => router.refresh()}
          />
        ))}

        {/* Add garment */}
        <Dialog open={addGarmentOpen} onOpenChange={setAddGarmentOpen}>
          <DialogTrigger asChild>
            <button className="w-full rounded-2xl border-2 border-dashed border-border py-4 font-sans text-sm font-semibold text-charcoal-muted hover:border-gold hover:text-gold transition-colors active:scale-[0.98]">
              <Plus className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Add Another Garment
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Garment</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-3 mt-1">
              <div>
                <p className="section-label mb-2">Garment Type</p>
                <div className="flex flex-wrap gap-2">
                  {GARMENT_TYPES.map((type) => (
                    <button key={type} onClick={() => setNewGarmentType(type)}
                      className={`rounded-xl px-3 py-2 text-sm font-semibold font-sans border-2 transition-all ${
                        newGarmentType === type
                          ? 'border-gold bg-gold/10 text-gold'
                          : 'border-border text-charcoal-muted'
                      }`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Color <span className="font-normal text-charcoal-muted">optional</span></Label>
                <Input placeholder="e.g. Ivory, Navy, Black"
                  value={newGarmentColor} onChange={(e) => setNewGarmentColor(e.target.value)} />
              </div>
              <Button
                onClick={handleAddGarment}
                disabled={isPending || !newGarmentType}
                variant="gold" size="lg" className="w-full mt-1"
              >
                Add Garment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Payment ── */}
      <Card>
        <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {/* Per-garment breakdown */}
          {sortedGarments.length > 1 && (
            <div className="mb-3 space-y-1">
              {sortedGarments.map((g) => (
                <div key={g.id} className="flex justify-between text-sm font-sans">
                  <span className="text-charcoal-muted truncate mr-2">
                    {g.garment_type}{g.garment_color ? ` (${g.garment_color})` : ''}
                  </span>
                  <span className="text-charcoal font-semibold flex-shrink-0">
                    {formatCurrency(g.subtotal)}
                  </span>
                </div>
              ))}
              <div className="border-t border-border/50 pt-1" />
            </div>
          )}

          <div className="flex flex-col gap-0 mb-4">
            <div className="flex items-center justify-between py-2.5">
              <span className="font-sans text-charcoal-muted">Subtotal</span>
              <span className="font-sans font-semibold text-charcoal">{formatCurrency(order.subtotal)}</span>
            </div>
            {(order.deposit_paid ?? 0) > 0 && (
              <div className="flex items-center justify-between py-2.5">
                <span className="font-sans text-charcoal-muted">Deposit Paid</span>
                <span className="font-sans font-semibold text-emerald-600">
                  − {formatCurrency(order.deposit_paid ?? 0)}
                </span>
              </div>
            )}
            <div className="border-t border-border mt-1 pt-3 flex items-center justify-between">
              <span className="font-sans font-bold text-charcoal">Balance Due</span>
              <span className={`font-serif text-2xl font-bold ${balance === 0 ? 'text-emerald-600' : 'text-charcoal'}`}>
                {balance === 0 ? 'Paid ✓' : formatCurrency(balance)}
              </span>
            </div>
          </div>

          {order.status !== 'picked_up' && balance > 0 && (
            <div className="flex flex-col gap-2">
              <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="w-full">Record Deposit</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Record Deposit</DialogTitle></DialogHeader>
                  <div className="flex flex-col gap-4 mt-1">
                    <p className="text-sm text-charcoal-muted font-sans">
                      Balance due: <strong>{formatCurrency(balance)}</strong>
                    </p>
                    <Input type="number" placeholder="Amount received ($)"
                      value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                      min="0" step="0.50" autoFocus />
                    <Button onClick={handleDeposit} disabled={isPending || !depositAmount}
                      variant="gold" size="lg" className="w-full">
                      Record Payment
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button onClick={handleMarkPaid} disabled={isPending}
                variant="success" size="lg" className="w-full">
                Mark Fully Paid · {formatCurrency(balance)}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Delete ── */}
      <div className="pt-2 pb-4">
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 text-red-400 hover:text-red-600 font-sans text-sm transition-colors mx-auto">
              <Trash2 className="w-4 h-4" /> Delete this order
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Order?</DialogTitle></DialogHeader>
            <p className="text-charcoal-muted font-sans text-sm mb-4">
              This will permanently delete the order for <strong>{order.customers.name}</strong>,
              all garments, and all photos. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setDeleteOpen(false)} variant="outline" className="flex-1">Cancel</Button>
              <Button onClick={handleDelete} disabled={isPending} variant="danger" className="flex-1">Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

// ── Garment Detail Card ───────────────────────────────────────

interface GarmentDetailCardProps {
  garment: OrderWithRelations['order_garments'][number]
  index: number
  orderId: string
  pricing: PricingItem[]
  isPending: boolean
  startTransition: ReturnType<typeof useTransition>[1]
  onRefresh: () => void
}

function GarmentDetailCard({
  garment, index, orderId, pricing, isPending, startTransition, onRefresh,
}: GarmentDetailCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [editingType, setEditingType] = useState(false)
  const [editType, setEditType] = useState(garment.garment_type)
  const [editColor, setEditColor] = useState(garment.garment_color ?? '')
  const [addAltOpen, setAddAltOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ORDER[0])
  const [altSearch, setAltSearch] = useState('')
  const [altQty, setAltQty] = useState(1)
  const [selectedAlt, setSelectedAlt] = useState<PricingItem | null>(null)
  const [customAltName, setCustomAltName] = useState('')
  const [customAltPrice, setCustomAltPrice] = useState('')
  const [deleteGarmentOpen, setDeleteGarmentOpen] = useState(false)

  const fabricAlts = garment.garment_alterations.filter((a) => isFabricFee(a.service_name))
  const regularAlts = garment.garment_alterations.filter((a) => !isFabricFee(a.service_name))

  const filteredPricing = altSearch.trim()
    ? pricing.filter((p) => p.service_name.toLowerCase().includes(altSearch.toLowerCase()))
    : pricing.filter((p) => p.category === activeCategory)

  function saveTypeEdit() {
    startTransition(async () => {
      await updateGarment(garment.id, orderId, { garment_type: editType, garment_color: editColor })
      setEditingType(false)
      onRefresh()
    })
  }

  function handleAddAlt() {
    startTransition(async () => {
      if (selectedAlt) {
        await addAlteration(garment.id, orderId, {
          service_name: selectedAlt.service_name,
          price: selectedAlt.price,
          quantity: altQty,
        })
      } else if (customAltName.trim() && customAltPrice) {
        await addAlteration(garment.id, orderId, {
          service_name: customAltName.trim(),
          price: parseFloat(customAltPrice),
          quantity: altQty,
        })
      }
      setAddAltOpen(false)
      setSelectedAlt(null)
      setAltSearch('')
      setCustomAltName('')
      setCustomAltPrice('')
      setAltQty(1)
      onRefresh()
    })
  }

  function handleRemoveAlt(alt: GarmentAlteration) {
    startTransition(async () => {
      await removeAlteration(alt.id, garment.id, orderId)
      onRefresh()
    })
  }

  function handleDeleteGarment() {
    startTransition(async () => {
      await deleteGarment(garment.id, orderId)
      onRefresh()
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-3 flex-1 text-left min-w-0">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold/10 text-gold text-xs font-bold font-sans flex items-center justify-center">
            {index + 1}
          </span>
          {editingType ? (
            <div className="flex-1" onClick={(e) => e.stopPropagation()}>
              {/* Edit mode */}
            </div>
          ) : (
            <div className="min-w-0">
              <p className="font-sans font-semibold text-charcoal truncate">
                {garment.garment_type}
                {garment.garment_color && (
                  <span className="text-charcoal-muted ml-1.5 font-normal">({garment.garment_color})</span>
                )}
              </p>
              <p className="text-xs text-charcoal-muted font-sans">
                {garment.garment_alterations.length} alterations · {formatCurrency(garment.subtotal)}
              </p>
            </div>
          )}
        </button>

        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <button onClick={() => setEditingType(!editingType)}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-charcoal-muted hover:text-gold hover:border-gold transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <Dialog open={deleteGarmentOpen} onOpenChange={setDeleteGarmentOpen}>
            <DialogTrigger asChild>
              <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-red-400 hover:border-red-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Remove Garment?</DialogTitle></DialogHeader>
              <p className="text-charcoal-muted font-sans text-sm mb-4">
                This will remove <strong>{garment.garment_type}</strong> and all its alterations and photos.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => setDeleteGarmentOpen(false)} variant="outline" className="flex-1">Cancel</Button>
                <Button onClick={handleDeleteGarment} disabled={isPending} variant="danger" className="flex-1">Remove</Button>
              </div>
            </DialogContent>
          </Dialog>
          <button onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 flex items-center justify-center text-charcoal-muted">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Edit inline */}
      {editingType && (
        <div className="px-5 pb-4 border-t border-border pt-3">
          <div className="flex flex-wrap gap-2 mb-3">
            {GARMENT_TYPES.map((type) => (
              <button key={type} onClick={() => setEditType(type)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold font-sans border-2 transition-all ${
                  editType === type ? 'border-gold bg-gold/10 text-gold' : 'border-border text-charcoal-muted'
                }`}>
                {type}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Color (optional)" value={editColor}
              onChange={(e) => setEditColor(e.target.value)} className="flex-1" />
            <button onClick={saveTypeEdit} disabled={isPending}
              className="w-10 h-14 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setEditingType(false)}
              className="w-10 h-14 rounded-xl border border-border flex items-center justify-center text-charcoal-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      {!collapsed && (
        <div className="border-t border-border px-5 py-4 flex flex-col gap-4">

          {/* Alterations list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="section-label">Alterations</p>
              <Dialog open={addAltOpen} onOpenChange={(o) => {
                setAddAltOpen(o)
                if (!o) { setSelectedAlt(null); setAltSearch(''); setAltQty(1) }
              }}>
                <DialogTrigger asChild>
                  <button className="text-gold font-sans text-xs font-semibold hover:text-gold-dark flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Alteration</DialogTitle></DialogHeader>
                  <div className="flex flex-col gap-3 mt-1">
                    <Input placeholder="Search services…" value={altSearch}
                      onChange={(e) => setAltSearch(e.target.value)} autoFocus />

                    {!altSearch && (
                      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
                        {CATEGORY_ORDER.filter((c) => pricing.some((p) => p.category === c)).map((cat) => (
                          <button key={cat} onClick={() => setActiveCategory(cat)}
                            className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold font-sans border transition-all whitespace-nowrap ${
                              activeCategory === cat
                                ? 'border-gold bg-gold/10 text-gold'
                                : 'border-border text-charcoal-muted'
                            }`}>
                            {CATEGORY_SHORT[cat]}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
                      {filteredPricing.map((p) => (
                        <button key={p.id}
                          onClick={() => { setSelectedAlt(p); setCustomAltName(''); setCustomAltPrice('') }}
                          className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                            selectedAlt?.id === p.id ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/30'
                          }`}>
                          <div className="flex items-center justify-between">
                            <p className="font-sans font-semibold text-charcoal text-sm">{p.service_name}</p>
                            <p className="font-bold text-gold text-sm ml-2 flex-shrink-0">
                              {formatPriceRange(p.price, p.price_max, p.price_note)}
                            </p>
                          </div>
                          {p.price_note && <p className="text-xs text-charcoal-muted mt-0.5">{p.price_note}</p>}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-border pt-2">
                      <p className="text-xs text-charcoal-muted font-sans font-semibold uppercase tracking-wider mb-2">Or custom</p>
                      <div className="flex gap-2">
                        <Input placeholder="Service name" value={customAltName}
                          onChange={(e) => { setCustomAltName(e.target.value); setSelectedAlt(null) }} />
                        <Input type="number" placeholder="$" value={customAltPrice}
                          onChange={(e) => { setCustomAltPrice(e.target.value); setSelectedAlt(null) }}
                          className="w-20" min="0" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-sans font-semibold text-charcoal">Qty:</span>
                      <button onClick={() => setAltQty(Math.max(1, altQty - 1))}
                        className="w-9 h-9 rounded-lg border border-border flex items-center justify-center">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-bold font-sans">{altQty}</span>
                      <button onClick={() => setAltQty(altQty + 1)}
                        className="w-9 h-9 rounded-lg border border-border flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <Button
                      onClick={handleAddAlt}
                      disabled={isPending || (!selectedAlt && (!customAltName.trim() || !customAltPrice))}
                      variant="gold" size="lg" className="w-full">
                      Add to Garment
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {garment.garment_alterations.length === 0 ? (
              <p className="text-xs text-charcoal-muted font-sans italic py-2">No alterations yet — tap Add</p>
            ) : (
              <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
                {[...regularAlts, ...fabricAlts].map((alt) => (
                  <div key={alt.id} className="flex items-center gap-2 px-3 py-2.5">
                    <span className={`flex-1 font-sans text-sm font-semibold text-charcoal truncate ${isFabricFee(alt.service_name) ? 'text-charcoal-muted italic' : ''}`}>
                      {alt.service_name}
                      {alt.quantity > 1 && <span className="text-charcoal-muted ml-1 font-normal">× {alt.quantity}</span>}
                    </span>
                    <span className="font-sans font-bold text-charcoal text-sm flex-shrink-0">
                      {formatCurrency(alt.price * alt.quantity)}
                    </span>
                    <button onClick={() => handleRemoveAlt(alt)} disabled={isPending}
                      className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 bg-cream-50">
                  <span className="text-xs font-semibold font-sans text-charcoal-muted">Garment subtotal</span>
                  <span className="font-sans font-bold text-charcoal">{formatCurrency(garment.subtotal)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Photos */}
          <div>
            <p className="section-label mb-2">
              Photos
              {garment.garment_photos.length > 0 && (
                <span className="ml-2 text-charcoal-muted normal-case font-normal">
                  ({garment.garment_photos.length})
                </span>
              )}
            </p>
            <GarmentPhotos
              garmentId={garment.id}
              orderId={orderId}
              initialPhotos={garment.garment_photos}
            />
          </div>
        </div>
      )}
    </div>
  )
}
