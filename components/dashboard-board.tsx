'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Package, Clock, CheckCircle2, ShoppingBag } from 'lucide-react'
import { OrderCard } from '@/components/order-card'
import type { Order, OrderStatus } from '@/types'
import { STATUS_LABELS } from '@/types'

const TABS: { status: OrderStatus; icon: React.ReactNode; color: string }[] = [
  { status: 'new',        icon: <Package className="w-4 h-4" />,       color: 'text-blue-600 border-blue-500 bg-blue-50' },
  { status: 'in_progress',icon: <Clock className="w-4 h-4" />,         color: 'text-amber-600 border-amber-500 bg-amber-50' },
  { status: 'ready',      icon: <CheckCircle2 className="w-4 h-4" />,  color: 'text-emerald-600 border-emerald-500 bg-emerald-50' },
  { status: 'picked_up',  icon: <ShoppingBag className="w-4 h-4" />,   color: 'text-gray-500 border-gray-400 bg-gray-50' },
]

interface Props {
  orders: Order[]
}

export function DashboardBoard({ orders }: Props) {
  const [activeStatus, setActiveStatus] = useState<OrderStatus>('new')

  const countFor = (s: OrderStatus) => orders.filter((o) => o.status === s).length
  const filtered = orders.filter((o) => o.status === activeStatus)

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6">
      {/* Page heading */}
      <div className="mb-5">
        <h1 className="font-serif text-3xl font-semibold text-charcoal">Orders</h1>
        <p className="text-charcoal-muted font-sans text-sm mt-1">
          {orders.filter(o => o.status !== 'picked_up').length} active orders
        </p>
      </div>

      {/* Status tabs — scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none mb-6">
        {TABS.map(({ status, icon, color }) => {
          const count = countFor(status)
          const isActive = activeStatus === status
          return (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`
                flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold font-sans border-2 transition-all active:scale-95 flex-shrink-0
                ${isActive
                  ? color
                  : 'border-border bg-white text-charcoal-muted hover:border-border hover:text-charcoal'
                }
              `}
            >
              {icon}
              {STATUS_LABELS[status]}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${isActive ? 'bg-white/70' : 'bg-cream-100'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <EmptyState status={activeStatus} />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ status }: { status: OrderStatus }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-cream-100 flex items-center justify-center mb-4">
        <Package className="w-7 h-7 text-charcoal-muted" strokeWidth={1.5} />
      </div>
      <p className="font-serif text-xl text-charcoal mb-1">No orders here</p>
      <p className="text-charcoal-muted font-sans text-sm mb-6">
        {status === 'new' ? 'Start by creating a new order' : `No orders with status "${STATUS_LABELS[status]}"`}
      </p>
      {status === 'new' && (
        <Link
          href="/orders/new"
          className="flex items-center gap-2 bg-gold text-white rounded-xl px-6 py-3 font-semibold font-sans hover:bg-gold-dark active:scale-95 transition-all shadow-card"
        >
          <Plus className="w-4 h-4" />
          Create First Order
        </Link>
      )}
    </div>
  )
}
