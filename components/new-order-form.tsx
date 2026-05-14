'use client'

import { useState, useTransition } from 'react'
import { Minus, Plus, X, ChevronDown, ChevronUp, Scissors } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { createOrder } from '@/lib/actions'
import type { PricingItem } from '@/types'

interface CartItem {
  id: string
  service_name: string
  price: number
  quantity: number
  notes: string
  isCustom?: boolean
}

interface Props {
  pricing: PricingItem[]
}

export function NewOrderForm({ pricing }: Props) {
  const [isPending, startTransition] = useTransition()
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [error, setError] = useState('')

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)

  function addService(item: PricingItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id)
      if (existing) {
        return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, {
        id: item.id,
        service_name: item.service_name,
        price: item.price,
        quantity: 1,
        notes: '',
      }]
    })
  }

  function addCustom() {
    const price = parseFloat(customPrice)
    if (!customName.trim() || isNaN(price) || price <= 0) return
    setCart((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        service_name: customName.trim(),
        price,
        quantity: 1,
        notes: '',
        isCustom: true,
      },
    ])
    setCustomName('')
    setCustomPrice('')
    setShowCustom(false)
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c)
    )
  }

  function updateItemNotes(id: string, notes: string) {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, notes } : c))
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((c) => c.id !== id))
    if (expandedItem === id) setExpandedItem(null)
  }

  function updatePrice(id: string, price: string) {
    const p = parseFloat(price)
    if (!isNaN(p)) setCart((prev) => prev.map((c) => c.id === id ? { ...c, price: p } : c))
  }

  async function handleSubmit() {
    setError('')
    if (!customerName.trim()) { setError('Please enter the customer name.'); return }
    if (cart.length === 0) { setError('Please add at least one service.'); return }

    startTransition(async () => {
      try {
        await createOrder({
          customerName,
          phone,
          pickupDate,
          notes: orderNotes,
          items: cart.map((c) => ({
            service_name: c.service_name,
            price: c.price,
            quantity: c.quantity,
            notes: c.notes,
          })),
        })
      } catch (e) {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const categories = [...new Set(pricing.map((p) => p.category))]

  return (
    <div className="flex flex-col gap-6">
      {/* ── Customer Info ── */}
      <section className="bg-white rounded-2xl border border-border p-5 shadow-card">
        <h2 className="font-serif text-xl font-semibold text-charcoal mb-4">Customer Info</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Customer Name *</Label>
            <Input
              id="name"
              placeholder="Full name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoComplete="name"
              autoCapitalize="words"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pickup">Pickup Date</Label>
            <Input
              id="pickup"
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any special instructions…"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section>
        <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">Add Services</h2>
        <p className="text-sm text-charcoal-muted font-sans mb-4">
          Tap a service button to add it. Prices auto-fill.
        </p>

        {categories.map((cat) => {
          const items = pricing.filter((p) => p.category === cat)
          return (
            <div key={cat} className="mb-5">
              <p className="section-label mb-2">{cat}</p>
              <div className="grid grid-cols-2 gap-2.5">
                {items.map((item) => {
                  const inCart = cart.find((c) => c.id === item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => addService(item)}
                      className={`
                        relative flex flex-col items-start justify-between rounded-2xl p-4 border-2 text-left
                        transition-all active:scale-[0.97] min-h-[80px]
                        ${inCart
                          ? 'border-gold bg-gold/5 shadow-gold'
                          : 'border-border bg-white hover:border-gold/40 shadow-card'
                        }
                      `}
                    >
                      <span className="font-sans font-semibold text-charcoal text-sm leading-tight">
                        {item.service_name}
                      </span>
                      <div className="flex items-center justify-between w-full mt-2">
                        <span className="font-sans font-bold text-gold text-base">
                          {formatCurrency(item.price)}
                        </span>
                        {inCart && (
                          <span className="bg-gold text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                            {inCart.quantity}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Custom service */}
        <div className="mt-2">
          {!showCustom ? (
            <button
              onClick={() => setShowCustom(true)}
              className="w-full rounded-2xl border-2 border-dashed border-border py-4 text-charcoal-muted font-sans text-sm font-semibold hover:border-gold hover:text-gold transition-colors"
            >
              + Add Custom Service
            </button>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-gold/30 p-4 shadow-card">
              <p className="font-sans font-semibold text-charcoal mb-3">Custom Service</p>
              <div className="flex flex-col gap-3">
                <Input
                  placeholder="Service name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  autoFocus
                />
                <Input
                  type="number"
                  placeholder="Price (e.g. 35)"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  min="0"
                  step="0.50"
                />
                <div className="flex gap-2">
                  <Button onClick={addCustom} variant="gold" className="flex-1">Add</Button>
                  <Button onClick={() => setShowCustom(false)} variant="outline" size="default">Cancel</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Cart ── */}
      {cart.length > 0 && (
        <section className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-serif text-xl font-semibold text-charcoal">
              Order Summary
            </h2>
          </div>

          <div className="divide-y divide-border">
            {cart.map((item) => (
              <div key={item.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  {/* Qty controls */}
                  <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-8 h-8 rounded-lg border border-border bg-cream-50 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Minus className="w-3.5 h-3.5 text-charcoal" />
                    </button>
                    <span className="w-6 text-center font-bold text-charcoal font-sans text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-8 h-8 rounded-lg border border-border bg-cream-50 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Plus className="w-3.5 h-3.5 text-charcoal" />
                    </button>
                  </div>

                  {/* Name + price */}
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-semibold text-charcoal text-sm">{item.service_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-charcoal-muted text-xs font-sans">each: </span>
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) => updatePrice(item.id, e.target.value)}
                        className="h-7 w-20 text-sm px-2 py-1 border border-border rounded-lg"
                        min="0"
                        step="0.50"
                      />
                    </div>
                  </div>

                  {/* Subtotal + remove */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="font-bold text-charcoal font-sans">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Notes toggle */}
                <button
                  onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                  className="flex items-center gap-1 mt-2 text-xs text-charcoal-muted font-sans"
                >
                  {expandedItem === item.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {item.notes ? 'Edit note' : 'Add note'}
                </button>
                {expandedItem === item.id && (
                  <Textarea
                    placeholder="Notes for this service…"
                    value={item.notes}
                    onChange={(e) => updateItemNotes(item.id, e.target.value)}
                    className="mt-2 min-h-[60px] text-sm"
                    rows={2}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="px-5 py-4 bg-cream-50 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="font-sans font-semibold text-charcoal">Subtotal</span>
              <span className="font-serif text-2xl font-bold text-charcoal">
                {formatCurrency(subtotal)}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 font-sans text-sm">
          {error}
        </div>
      )}

      {/* ── Submit ── */}
      <Button
        onClick={handleSubmit}
        disabled={isPending || cart.length === 0 || !customerName.trim()}
        variant="gold"
        size="xl"
        className="w-full"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <Scissors className="w-5 h-5 animate-spin" />
            Creating Order…
          </span>
        ) : (
          `Create Order  ${cart.length > 0 ? '· ' + formatCurrency(subtotal) : ''}`
        )}
      </Button>
    </div>
  )
}
