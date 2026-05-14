import Link from 'next/link'
import { Calendar, ChevronRight, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatShortDate, balanceDue } from '@/lib/utils'
import { STATUS_COLORS, STATUS_LABELS, STATUS_DOT } from '@/types'
import type { Order } from '@/types'

interface Props {
  order: Order
}

export function OrderCard({ order }: Props) {
  const customer = order.customers
  const items = order.order_items ?? []
  const balance = balanceDue(order.subtotal, order.total_paid)
  const hasBalance = balance > 0 && order.status !== 'picked_up'

  return (
    <Link href={`/orders/${order.id}`}>
      <Card className="hover:shadow-card-hover transition-shadow active:scale-[0.99] cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Customer name + order number */}
              <div className="flex items-baseline gap-2 mb-1">
                <h3 className="font-serif text-lg font-semibold text-charcoal truncate">
                  {customer?.name ?? 'Unknown'}
                </h3>
                <span className="text-xs text-charcoal-muted font-sans flex-shrink-0">
                  #{order.order_number}
                </span>
              </div>

              {/* Phone */}
              {customer?.phone && (
                <p className="text-sm text-charcoal-muted font-sans mb-2">{customer.phone}</p>
              )}

              {/* Service count */}
              <p className="text-sm text-charcoal font-sans mb-3">
                {items.length === 0
                  ? 'No services'
                  : items.length === 1
                  ? items[0].service_name
                  : `${items[0].service_name} + ${items.length - 1} more`}
              </p>

              {/* Pickup date + status */}
              <div className="flex items-center flex-wrap gap-2">
                <Badge className={STATUS_COLORS[order.status]}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_DOT[order.status]}`} />
                  {STATUS_LABELS[order.status]}
                </Badge>
                {order.pickup_date && (
                  <span className="flex items-center gap-1 text-xs text-charcoal-muted font-sans">
                    <Calendar className="w-3 h-3" />
                    {formatShortDate(order.pickup_date)}
                  </span>
                )}
              </div>
            </div>

            {/* Right side: totals + chevron */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="font-sans font-bold text-charcoal text-lg">
                {formatCurrency(order.subtotal)}
              </span>
              {hasBalance && (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                  <AlertCircle className="w-3 h-3" />
                  {formatCurrency(balance)} due
                </span>
              )}
              {!hasBalance && order.status !== 'picked_up' && order.total_paid > 0 && (
                <span className="text-xs text-emerald-600 font-semibold">Paid ✓</span>
              )}
              <ChevronRight className="w-4 h-4 text-charcoal-muted mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
