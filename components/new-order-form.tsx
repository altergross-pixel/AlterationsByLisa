'use client'

import { useState, useTransition } from 'react'
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  Minus, X, AlertCircle, Scissors,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPriceRange } from '@/lib/utils'
import { createOrder } from '@/lib/actions'
import { CATEGORY_LABELS, CATEGORY_ORDER, CATEGORY_SHORT, GARMENT_TYPES } from '@/types'
import { GarmentPhotos, type PendingPhoto } from '@/components/garment-photos'
import type { PricingItem } from '@/types'

// ── Types ─────────────────────────────────────────────────────

interface CartAlteration {
  id: string
  service_name: string
  price: number
  quantity: number
  notes: string
  needsQuote?: boolean
}

interface GarmentFormData {
  tempId: string          // proper UUID — used as storage path prefix
  garment_type: string
  garment_color: string
  description: string
  notes: string
  alterations: CartAlteration[]
  photos: PendingPhoto[]
  collapsed: boolean
  activeCategory: string
}

function newGarment(): GarmentFormData {
  // Use crypto.randomUUID for a proper UUID (storage path)
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return {
    tempId: id,
    garment_type: '',
    garment_color: '',
    description: '',
    notes: '',
    alterations: [],
    photos: [],
    collapsed: false,
    activeCategory: CATEGORY_ORDER[0],
  }
}

// ── Form ──────────────────────────────────────────────────────

interface Props { pricing: PricingItem[] }

export function NewOrderForm({ pricing }: Props) {
  const [isPending, startTransition] = useTransition()
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [garments, setGarments] = useState<GarmentFormData[]>([newGarment()])
  const [error, setError] = useState('')

  const grandTotal = garments.reduce(
    (s, g) => s + g.alterations.reduce((gs, a) => gs + a.price * a.quantity, 0),
    0
  )

  // Garment list helpers
  function addGarment() {
    setGarments((p) => [...p.map((g) => ({ ...g, collapsed: true })), newGarment()])
  }
  function removeGarment(id: string) {
    setGarments((p) => p.filter((g) => g.tempId !== id))
  }
  function patchGarment(id: string, patch: Partial<GarmentFormData>) {
    setGarments((p) => p.map((g) => g.tempId === id ? { ...g, ...patch } : g))
  }

  // Alteration helpers
  function addAlt(gId: string, item: PricingItem) {
    const needsQuote = item.price === 0
    setGarments((p) => p.map((g) => {
      if (g.tempId !== gId) return g
      const ex = g.alterations.find((a) => a.id === item.id)
      if (ex && !needsQuote) {
        return { ...g, alterations: g.alterations.map((a) => a.id === item.id ? { ...a, quantity: a.quantity + 1 } : a) }
      }
      return {
        ...g, alterations: [...g.alterations, {
          id: needsQuote ? `quote-${Date.now()}` : item.id,
          service_name: item.service_name,
          price: needsQuote ? 0 : item.price,
          quantity: 1, notes: '', needsQuote,
        }],
      }
    }))
  }
  function updateQty(gId: string, aId: string, d: number) {
    setGarments((p) => p.map((g) => g.tempId !== gId ? g : {
      ...g, alterations: g.alterations.map((a) => a.id === aId ? { ...a, quantity: Math.max(1, a.quantity + d) } : a),
    }))
  }
  function updatePrice(gId: string, aId: string, v: string) {
    const n = parseFloat(v)
    if (!isNaN(n) && n >= 0) {
      setGarments((p) => p.map((g) => g.tempId !== gId ? g : {
        ...g, alterations: g.alterations.map((a) => a.id === aId ? { ...a, price: n, needsQuote: false } : a),
      }))
    }
  }
  function removeAlt(gId: string, aId: string) {
    setGarments((p) => p.map((g) => g.tempId !== gId ? g : {
      ...g, alterations: g.alterations.filter((a) => a.id !== aId),
    }))
  }
  function addCustomAlt(gId: string, name: string, price: number) {
    setGarments((p) => p.map((g) => g.tempId !== gId ? g : {
      ...g, alterations: [...g.alterations, { id: `custom-${Date.now()}`, service_name: name, price, quantity: 1, notes: '' }],
    }))
  }

  async function handleSubmit() {
    setError('')
    if (!customerName.trim()) { setError('Please enter the customer name.'); return }
    if (!garments.every((g) => g.garment_type)) { setError('Please select a garment type for each item.'); return }
    if (garments.every((g) => g.alterations.length === 0)) { setError('Please add at least one alteration.'); return }
    if (garments.some((g) => g.alterations.some((a) => a.needsQuote || a.price === 0))) {
      setError('Please enter a price for all "Quote" items.'); return
    }

    startTransition(async () => {
      try {
        await createOrder({
          customerName, phone, pickupDate, notes: orderNotes,
          garments: garments.map((g) => ({
            id: g.tempId,    // pre-assigned UUID so photos link correctly
            garment_type: g.garment_type,
            garment_color: g.garment_color,
            description: g.description,
            notes: g.notes,
            alterations: g.alterations.map((a) => ({
              service_name: a.service_name, price: a.price, quantity: a.quantity, notes: a.notes,
            })),
            photos: g.photos.map((p) => ({ storage_path: p.storage_path, filename: p.filename })),
          })),
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Customer */}
      <section className="bg-white rounded-2xl border border-border p-5 shadow-card">
        <h2 className="font-serif text-xl font-semibold text-charcoal mb-4">Customer Info</h2>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" placeholder="Full name" value={customerName}
              onChange={(e) => setCustomerName(e.target.value)} autoCapitalize="words" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" placeholder="(555) 000-0000" value={phone}
              onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pickup">Pickup Date</Label>
            <Input id="pickup" type="date" value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Any general notes…" value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)} rows={2} />
          </div>
        </div>
      </section>

      {/* Garments */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-serif text-xl font-semibold text-charcoal">
            Garments <span className="text-base font-normal text-charcoal-muted font-sans">({garments.length})</span>
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {garments.map((g, idx) => (
            <GarmentFormCard
              key={g.tempId}
              garment={g}
              index={idx}
              pricing={pricing}
              canDelete={garments.length > 1}
              onPatch={(p) => patchGarment(g.tempId, p)}
              onDelete={() => removeGarment(g.tempId)}
              onAddAlt={(item) => addAlt(g.tempId, item)}
              onUpdateQty={(id, d) => updateQty(g.tempId, id, d)}
              onUpdatePrice={(id, v) => updatePrice(g.tempId, id, v)}
              onRemoveAlt={(id) => removeAlt(g.tempId, id)}
              onAddCustom={(n, p) => addCustomAlt(g.tempId, n, p)}
            />
          ))}
        </div>

        <button onClick={addGarment}
          className="mt-3 w-full rounded-2xl border-2 border-dashed border-border py-4 font-sans text-sm font-semibold text-charcoal-muted hover:border-gold hover:text-gold transition-colors active:scale-[0.98]">
          <Plus className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Add Another Garment
        </button>
      </div>

      {/* Total */}
      {grandTotal > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-card flex items-center justify-between">
          <span className="font-sans font-semibold text-charcoal">Order Total</span>
          <span className="font-serif text-2xl font-bold text-charcoal">{formatCurrency(grandTotal)}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 font-sans text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Submit */}
      <Button onClick={handleSubmit}
        disabled={isPending || !customerName.trim()}
        variant="gold" size="xl" className="w-full">
        {isPending
          ? <><Scissors className="w-5 h-5 animate-spin" /> Creating Order…</>
          : `Create Order${grandTotal > 0 ? ' · ' + formatCurrency(grandTotal) : ''}`
        }
      </Button>
    </div>
  )
}

// ── Garment Form Card ─────────────────────────────────────────

interface CardProps {
  garment: GarmentFormData
  index: number
  pricing: PricingItem[]
  canDelete: boolean
  onPatch: (p: Partial<GarmentFormData>) => void
  onDelete: () => void
  onAddAlt: (item: PricingItem) => void
  onUpdateQty: (id: string, d: number) => void
  onUpdatePrice: (id: string, v: string) => void
  onRemoveAlt: (id: string) => void
  onAddCustom: (name: string, price: number) => void
}

function GarmentFormCard({
  garment, index, pricing, canDelete,
  onPatch, onDelete, onAddAlt, onUpdateQty, onUpdatePrice, onRemoveAlt, onAddCustom,
}: CardProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')

  const subtotal = garment.alterations.reduce((s, a) => s + a.price * a.quantity, 0)
  const categoryItems = pricing.filter((p) => p.category === garment.activeCategory)

  function submitCustom() {
    const p = parseFloat(customPrice)
    if (!customName.trim() || isNaN(p) || p < 0) return
    onAddCustom(customName.trim(), p)
    setCustomName(''); setCustomPrice(''); setShowCustom(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => onPatch({ collapsed: !garment.collapsed })}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gold/10 text-gold text-xs font-bold font-sans flex items-center justify-center">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="font-sans font-semibold text-charcoal text-sm truncate">
              {garment.garment_type || <span className="text-charcoal-muted italic">Select type…</span>}
              {garment.garment_color && <span className="text-charcoal-muted ml-1.5 font-normal">· {garment.garment_color}</span>}
            </p>
            {garment.alterations.length > 0 && (
              <p className="text-xs text-charcoal-muted font-sans">
                {garment.alterations.length} alteration{garment.alterations.length !== 1 ? 's' : ''} · {formatCurrency(subtotal)}
              </p>
            )}
            {garment.photos.length > 0 && (
              <p className="text-xs text-gold font-sans">{garment.photos.length} photo{garment.photos.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {subtotal > 0 && !garment.collapsed && (
            <span className="font-sans font-bold text-charcoal text-sm">{formatCurrency(subtotal)}</span>
          )}
          {canDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1 text-red-400 hover:text-red-600 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {garment.collapsed ? <ChevronDown className="w-4 h-4 text-charcoal-muted" /> : <ChevronUp className="w-4 h-4 text-charcoal-muted" />}
        </div>
      </button>

      {!garment.collapsed && (
        <div className="border-t border-border px-5 pb-5 pt-4 flex flex-col gap-4">

          {/* Type */}
          <div>
            <p className="section-label mb-2">Garment Type *</p>
            <div className="flex flex-wrap gap-2">
              {GARMENT_TYPES.map((t) => (
                <button key={t} onClick={() => onPatch({ garment_type: t })}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold font-sans border-2 transition-all active:scale-95 ${
                    garment.garment_type === t ? 'border-gold bg-gold/10 text-gold' : 'border-border text-charcoal-muted hover:border-gold/40'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Color</Label>
              <Input placeholder="e.g. Ivory" value={garment.garment_color}
                onChange={(e) => onPatch({ garment_color: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional" value={garment.description}
                onChange={(e) => onPatch({ description: e.target.value })} />
            </div>
          </div>

          {/* Alterations browser */}
          <div>
            <p className="section-label mb-2">Alterations</p>

            {/* Category tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-none mb-3">
              {CATEGORY_ORDER.filter((c) => pricing.some((p) => p.category === c)).map((cat) => (
                <button key={cat} onClick={() => onPatch({ activeCategory: cat })}
                  className={`flex-shrink-0 rounded-xl px-3 py-2 text-xs font-semibold font-sans border-2 transition-all active:scale-95 whitespace-nowrap ${
                    garment.activeCategory === cat ? 'border-gold bg-gold/10 text-gold' : 'border-border text-charcoal-muted'
                  }`}>
                  {CATEGORY_SHORT[cat]}
                </button>
              ))}
            </div>

            {/* Service buttons */}
            <div className="grid grid-cols-2 gap-2">
              {categoryItems.map((item) => {
                const inCart = garment.alterations.find((a) => a.id === item.id)
                const priceLabel = formatPriceRange(item.price, item.price_max, item.price_note)
                return (
                  <button key={item.id} onClick={() => onAddAlt(item)}
                    className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all active:scale-[0.97] min-h-[72px] ${
                      inCart && item.price > 0 ? 'border-gold bg-gold/5' : 'border-border bg-cream-50 hover:border-gold/40'
                    }`}>
                    <span className="font-sans font-semibold text-charcoal text-xs leading-tight mb-1">{item.service_name}</span>
                    <div className="flex items-center justify-between w-full mt-auto">
                      <span className={`font-sans font-bold text-sm ${item.price === 0 ? 'text-amber-500' : 'text-gold'}`}>{priceLabel}</span>
                      {inCart && item.price > 0 && (
                        <span className="bg-gold text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{inCart.quantity}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Custom */}
            <div className="mt-2">
              {!showCustom ? (
                <button onClick={() => setShowCustom(true)}
                  className="w-full rounded-xl border border-dashed border-border py-3 text-charcoal-muted font-sans text-xs font-semibold hover:border-gold hover:text-gold transition-colors">
                  + Custom Service
                </button>
              ) : (
                <div className="bg-cream-50 rounded-xl border border-border p-3 flex flex-col gap-2">
                  <Input placeholder="Service name" value={customName} onChange={(e) => setCustomName(e.target.value)} autoFocus />
                  <Input type="number" placeholder="Price ($)" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} min="0" step="0.50" />
                  <div className="flex gap-2">
                    <Button onClick={submitCustom} variant="gold" size="sm" className="flex-1">Add</Button>
                    <Button onClick={() => setShowCustom(false)} variant="outline" size="sm">Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected alterations */}
          {garment.alterations.length > 0 && (
            <div className="bg-cream-50 rounded-xl border border-border overflow-hidden">
              <div className="divide-y divide-border">
                {garment.alterations.map((alt) => (
                  <div key={alt.id} className="flex items-center gap-2 px-3 py-2.5">
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => onUpdateQty(alt.id, -1)} className="w-6 h-6 rounded border border-border bg-white flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                      <span className="w-5 text-center text-xs font-bold font-sans">{alt.quantity}</span>
                      <button onClick={() => onUpdateQty(alt.id, 1)} className="w-6 h-6 rounded border border-border bg-white flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                    </div>
                    <span className="flex-1 font-sans text-xs font-semibold text-charcoal truncate">{alt.service_name}</span>
                    {alt.needsQuote || alt.price === 0 ? (
                      <Input type="number" placeholder="$" value={alt.price || ''}
                        onChange={(e) => onUpdatePrice(alt.id, e.target.value)}
                        className="w-16 h-7 text-xs px-2 border-amber-400 bg-amber-50" min="0" />
                    ) : (
                      <span className="font-sans font-bold text-charcoal text-xs flex-shrink-0">{formatCurrency(alt.price * alt.quantity)}</span>
                    )}
                    <button onClick={() => onRemoveAlt(alt.id)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="px-3 py-2 bg-white border-t border-border flex items-center justify-between">
                <span className="text-xs font-semibold font-sans text-charcoal-muted">Garment subtotal</span>
                <span className="font-sans font-bold text-charcoal text-sm">{formatCurrency(subtotal)}</span>
              </div>
            </div>
          )}

          {/* Photos */}
          <div>
            <p className="section-label mb-2">Photos <span className="normal-case font-normal text-charcoal-muted">(optional)</span></p>
            <GarmentPhotos
              garmentId={garment.tempId}
              onPhotosChange={(photos) => onPatch({ photos })}
              compact
            />
          </div>
        </div>
      )}
    </div>
  )
}
