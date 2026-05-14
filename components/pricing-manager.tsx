'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Pencil, X, Plus, EyeOff, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { updatePrice, addPricingItem, togglePricingItem } from '@/lib/actions'
import type { PricingItem } from '@/types'

interface Props {
  pricing: PricingItem[]
}

export function PricingManager({ pricing }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCategory, setNewCategory] = useState('general')

  const categories = [...new Set(pricing.map((p) => p.category))]

  function startEdit(item: PricingItem) {
    setEditingId(item.id)
    setEditValue(item.price.toString())
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  function saveEdit(id: string) {
    const price = parseFloat(editValue)
    if (isNaN(price) || price < 0) return
    startTransition(async () => {
      await updatePrice(id, price)
      setEditingId(null)
      router.refresh()
    })
  }

  function handleAdd() {
    const price = parseFloat(newPrice)
    if (!newName.trim() || isNaN(price) || price < 0) return
    startTransition(async () => {
      await addPricingItem({ service_name: newName.trim(), price, category: newCategory })
      setNewName('')
      setNewPrice('')
      setNewCategory('general')
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
          <div className="flex flex-col gap-3 mt-2">
            <Input
              placeholder="Service name (e.g. Hem Dress)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <Input
              type="number"
              placeholder="Price (e.g. 80)"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              min="0"
              step="0.50"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-charcoal-light font-sans">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {['dress', 'pants', 'jacket', 'general'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setNewCategory(cat)}
                    className={`py-2 px-3 rounded-xl border-2 text-sm font-sans font-semibold capitalize transition-all ${
                      newCategory === cat
                        ? 'border-gold bg-gold/5 text-gold'
                        : 'border-border text-charcoal-muted hover:border-gold/30'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleAdd}
              disabled={isPending || !newName.trim() || !newPrice}
              variant="gold"
              size="lg"
              className="w-full mt-1"
            >
              Add Service
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grouped by category */}
      {categories.map((cat) => {
        const items = pricing.filter((p) => p.category === cat)
        return (
          <div key={cat}>
            <p className="section-label mb-2 capitalize">{cat}</p>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-5 py-4 ${!item.is_active ? 'opacity-50' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`font-sans font-semibold text-charcoal ${!item.is_active ? 'line-through' : ''}`}>
                        {item.service_name}
                      </p>
                    </div>

                    {editingId === item.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-charcoal-muted font-sans text-sm">$</span>
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-24 h-10 text-base px-2"
                          min="0"
                          step="0.50"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(item.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                        <button
                          onClick={() => saveEdit(item.id)}
                          disabled={isPending}
                          className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-cream-100 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-bold text-charcoal text-base w-16 text-right">
                          {formatCurrency(item.price)}
                        </span>
                        <button
                          onClick={() => startEdit(item)}
                          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:border-gold hover:text-gold transition-colors text-charcoal-muted"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(item.id, item.is_active)}
                          disabled={isPending}
                          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:border-gold hover:text-gold transition-colors text-charcoal-muted"
                          title={item.is_active ? 'Hide from new orders' : 'Show in new orders'}
                        >
                          {item.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
