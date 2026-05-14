'use client'

import { Scissors, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, balanceDue } from '@/lib/utils'
import { STATUS_LABELS } from '@/types'
import type { OrderWithRelations } from '@/types'

interface Props {
  order: OrderWithRelations
}

export function InvoiceTemplate({ order }: Props) {
  const balance = balanceDue(order.subtotal, order.total_paid)
  const printedDate = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <>
      {/* Print button */}
      <div className="no-print mb-6">
        <Button
          onClick={() => window.print()}
          variant="gold"
          size="lg"
          className="w-full"
        >
          <Printer className="w-5 h-5" />
          Print Invoice
        </Button>
      </div>

      {/* Invoice */}
      <div
        id="invoice"
        className="bg-white rounded-2xl border border-border shadow-card overflow-hidden"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Header band */}
        <div className="bg-charcoal px-8 py-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <Scissors className="w-6 h-6 text-gold" strokeWidth={1.5} />
              <span className="font-serif text-2xl font-bold text-white tracking-tight">
                AlterationsByLisa
              </span>
            </div>
            <p className="text-white/60 font-sans text-sm">Professional Alterations &amp; Tailoring</p>
          </div>
          <div className="text-right">
            <p className="font-sans text-sm text-white/60">Invoice</p>
            <p className="font-serif text-xl font-bold text-gold">#{order.order_number}</p>
            <p className="font-sans text-xs text-white/50 mt-1">{printedDate}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-7">
          {/* Customer + Pickup row */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="section-label mb-2">Customer</p>
              <p className="font-sans font-bold text-charcoal text-lg leading-tight">
                {order.customers.name}
              </p>
              {order.customers.phone && (
                <p className="font-sans text-charcoal-muted text-sm mt-1">{order.customers.phone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="section-label mb-2">Pickup Date</p>
              <p className="font-sans font-semibold text-charcoal">
                {formatDate(order.pickup_date)}
              </p>
              <div className="mt-2">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold font-sans border ${
                  order.status === 'picked_up'
                    ? 'bg-gray-100 text-gray-600 border-gray-200'
                    : order.status === 'ready'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mb-6 p-4 bg-cream-50 rounded-xl border border-border">
              <p className="section-label mb-1">Notes</p>
              <p className="font-sans text-sm text-charcoal">{order.notes}</p>
            </div>
          )}

          {/* Services table */}
          <div className="mb-6">
            <div className="grid grid-cols-12 border-b-2 border-charcoal pb-2 mb-2">
              <p className="col-span-6 section-label">Service</p>
              <p className="col-span-2 section-label text-center">Qty</p>
              <p className="col-span-2 section-label text-right">Unit</p>
              <p className="col-span-2 section-label text-right">Total</p>
            </div>

            {order.order_items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 py-3 border-b border-border/50">
                <div className="col-span-6">
                  <p className="font-sans font-semibold text-charcoal text-sm">{item.service_name}</p>
                  {item.notes && (
                    <p className="font-sans text-xs text-charcoal-muted mt-0.5">{item.notes}</p>
                  )}
                </div>
                <p className="col-span-2 font-sans text-sm text-charcoal text-center self-center">
                  {item.quantity}
                </p>
                <p className="col-span-2 font-sans text-sm text-charcoal text-right self-center">
                  {formatCurrency(item.price)}
                </p>
                <p className="col-span-2 font-sans font-bold text-charcoal text-right self-center">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between py-2">
                <span className="font-sans text-charcoal-muted text-sm">Subtotal</span>
                <span className="font-sans font-semibold text-charcoal">{formatCurrency(order.subtotal)}</span>
              </div>
              {order.deposit_paid > 0 && (
                <div className="flex items-center justify-between py-2">
                  <span className="font-sans text-charcoal-muted text-sm">Deposit Paid</span>
                  <span className="font-sans font-semibold text-emerald-600">− {formatCurrency(order.deposit_paid)}</span>
                </div>
              )}
              <div className="border-t-2 border-charcoal mt-2 pt-3 flex items-center justify-between">
                <span className="font-sans font-bold text-charcoal text-base">Balance Due</span>
                <span className={`font-serif text-2xl font-bold ${balance === 0 ? 'text-emerald-600' : 'text-charcoal'}`}>
                  {balance === 0 ? 'PAID' : formatCurrency(balance)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-cream-100 px-8 py-5 border-t border-border text-center">
          <p className="font-serif text-base text-charcoal mb-1">
            Thank you for choosing AlterationsByLisa
          </p>
          <p className="font-sans text-xs text-charcoal-muted">
            Please bring this invoice when picking up your garment.
          </p>
        </div>
      </div>
    </>
  )
}
