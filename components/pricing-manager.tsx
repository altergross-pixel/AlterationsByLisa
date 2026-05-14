'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Plus, EyeOff, Eye, Check, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatPriceRange } from '@/lib/utils'
import { updatePricingItem, addPricingItem, togglePricingItem } from '@/lib/actions'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/types'
import type { PricingItem } from '@/types'

interface Props {
  pricing: PricingItem[]
}

interface EditState {
  service_name: string
  price: string
  price_max: string
  price_note: string
  description: string
}

export function PricingManager({ pricing }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingItem, setEditingItem] = useState<PricingItem | null>(null)
  const [editState, setEditState] = useState<EditState>({
    service_name: '',
    price: '',
    price_max: '',
    price_note: '',
    description: '',
  })
  const [addOpen, setAddOpen] = useState(false)
  const [newItem, setNewItem] = useState({
    service_name: '',
    price: '',
    price_max: '',
    price_note: '',
    description: '',
    category: CATEGORY_ORDER[0],
  })

  const orderedCategories = CATEGORY_ORDER.filter((cat) =>
    pricing.some((p) => p.category === cat)
  )
  const allCategories = [...new Set(pricing.map((p) => p.category))]
  const extraCategories = allCategories.filter((c) => !CATEGORY_ORDER.includes(c))

  function openEdit(item: PricingItem) {
    setEditingItem(item)
    setEditState({
      service_name: item.service_name,
      price: item.price.toString(),
      price_max: item.price_max?.toString() ?? '',
      price_note: item.price_note ?? '',
      description: item.description ?? '',
    })
  }

  function closeEdit() {
    setEditingItem(null)
  }

  function saveEdit() {
    if (!editingItem) return
    const price = parseFloat(editState.price)
    if (isNaN(price) || price < 0) return

    startTransition(async () => {
      await updatePricingItem(editingItem.id, {
        service_name: editState.service_name.trim() || editingItem.service_name,
        price,
        price_max: editState.price_max ? parseFloat(editState.price_max) : null,
        price_note: editState.price_note.trim() || null,
        description: editState.description.trim() || null,
      })
      closeEdit()
      router.refresh()
    })
  }

  function handleAdd() {
    const price = parseFloat(newItem.price)
    if (!newItem.service_name.trim() || isNaN(price) || price < 0) return

    startTransition(async () => {
      await addPricingItem({
        service_name: newItem.service_name.trim(),
        price,
        price_max: newItem.price_max ? parseFloat(newItem.price_max) : null,
        price_note: newItem.price_note.trim() || null,
        description: newItem.description.trim() || null,
        category: newItem.category,
      })
      setNewItem({
        service_name: '',
        price: '',
        price_max: '',
        price_note: '',
        description: '',
        category: CATEGORY_ORDER[0],
      })
      setAddOpen(false)
      router.refresh()
    })
  }

  function handleToggle(id: string, currentlyActive: boolean) {
    startTransition(async () => {
      await togglePricingItem(id, !currentlyActive)
      router.refresh()
    })
  }

  const displayCategories = [...orderedCategories, ...extraCategories]

  return (
    <div className="flex flex-col gap-6">
      {/* Add new service */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <Button variant="gold" size="lg" className="w-full">
            <Plus className="w-5 h-5" />
            Add New Service
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex flex-col gap-1.5">
              <Label>Service Name</Label>
              <Input
                placeholder="e.g. Hem Gown (1 Layer)"
                value={newItem.service_name}
                onChange={(e) => setNewItem((s) => ({ ...s, service_name: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  placeholder="80"
                  value={newItem.price}
                  onChange={(e) => setNewItem((s) => ({ ...s, price: e.target.value }))}
                  min="0"
                  step="0.50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Max Price ($) <span className="font-normal text-charcoal-muted">optional</span></Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={newItem.price_max}
                  onChange={(e) => setNewItem((s) => ({ ...s, price_max: e.target.value }))}
                  min="0"
                  step="0.50"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Price Note <span className="font-normal text-charcoal-muted">optional</span></Label>
              <Input
                placeholder='e.g. "Plus material fee" or "Minimum"'
                value={newItem.price_note}
                onChange={(e) => setNewItem((s) => ({ ...s, price_note: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Description <span className="font-normal text-charcoal-muted">optional</span></Label>
              <Textarea
                placeholder="Any additional details…"
                value={newItem.description}
                onChange={(e) => setNewItem((s) => ({ ...s, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_ORDER.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setNewItem((s) => ({ ...s, category: cat }))}
                    className={`py-2 px-3 rounded-xl border-2 text-xs font-sans font-semibold text-left transition-all ${
                      newItem.category === cat
                        ? 'border-gold bg-gold/5 text-gold'
                        : 'border-border text-charcoal-muted hover:border-gold/30'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleAdd}
              disabled={isPending || !newItem.service_name.trim() || !newItem.price}
              variant="gold"
              size="lg"
              className="w-full mt-1"
            >
              Add Service
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="flex flex-col gap-3 mt-1">
              <div className="flex flex-col gap-1.5">
                <Label>Service Name</Label>
                <Input
                  value={editState.service_name}
                  onChange={(e) => setEditState((s) => ({ ...s, service_name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    value={editState.price}
                    onChange={(e) => setEditState((s) => ({ ...s, price: e.target.value }))}
                    min="0"
                    step="0.50"
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Max Price ($) <span className="font-normal text-charcoal-muted">optional</span></Label>
                  <Input
                    type="number"
                    placeholder="For ranges"
                    value={editState.price_max}
                    onChange={(e) => setEditState((s) => ({ ...s, price_max: e.target.value }))}
                    min="0"
                    step="0.50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Price Note <span className="font-normal text-charcoal-muted">optional</span></Label>
                <Input
                  placeholder='e.g. "Plus material fee" or "Minimum"'
                  value={editState.price_note}
                  onChange={(e) => setEditState((s) => ({ ...s, price_note: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Description <span className="font-normal text-charcoal-muted">optional</span></Label>
                <Textarea
                  placeholder="Any additional details…"
                  value={editState.description}
                  onChange={(e) => setEditState((s) => ({ ...s, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="flex gap-2 mt-1">
                <Button onClick={closeEdit} variant="outline" className="flex-1">Cancel</Button>
                <Button onClick={saveEdit} disabled={isPending} variant="gold" className="flex-1">
                  <Check className="w-4 h-4" /> Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <div className="bg-cream-100 rounded-xl px-4 py-3 flex items-center gap-2">
        <Info className="w-4 h-4 text-charcoal-muted flex-shrink-0" />
        <p className="text-xs text-charcoal-muted font-sans">
          {pricing.filter((p) => p.is_active).length} active services across {displayCategories.length} categories.
          Tap <Pencil className="inline w-3 h-3" /> to edit any price. Tap <EyeOff className="inline w-3 h-3" /> to hide from new orders.
        </p>
      </div>

      {/* Services grouped by category */}
      {displayCategories.map((cat) => {
        const items = pricing.filter((p) => p.category === cat)
        const activeCount = items.filter((p) => p.is_active).length
        return (
          <div key={cat}>
            <div className="flex items-baseline justify-between mb-2">
              <p className="font-serif text-base font-semibold text-charcoal">
                {CATEGORY_LABELS[cat] ?? cat}
              </p>
              <span className="text-xs text-charcoal-muted font-sans">
                {activeCount}/{items.length} active
              </span>
            </div>

            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {items.map((item) => {
                  const priceLabel = formatPriceRange(item.price, item.price_max, item.price_note)
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 px-4 py-3.5 transition-opacity ${!item.is_active ? 'opacity-40' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`font-sans font-semibold text-charcoal text-sm ${!item.is_active ? 'line-through' : ''}`}>
                          {item.service_name}
                        </p>
                        {item.price_note && (
                          <p className="text-xs text-charcoal-muted mt-0.5">{item.price_note}</p>
                        )}
                        {item.description && (
                          <p className="text-xs text-charcoal-muted/70 mt-0.5 italic">{item.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="font-sans font-bold text-charcoal text-sm min-w-[52px] text-right">
                          {priceLabel}
                        </span>
                        <button
                          onClick={() => openEdit(item)}
                          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:border-gold hover:text-gold text-charcoal-muted transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggle(item.id, item.is_active)}
                          disabled={isPending}
                          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:border-gold hover:text-gold text-charcoal-muted transition-colors"
                          title={item.is_active ? 'Hide from new orders' : 'Show in new orders'}
                        >
                          {item.is_active ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
