import Link from 'next/link'
import { Calendar, ChevronRight, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatShortDate, balanceDue } from '@/lib/utils'
import { STATUS_COLORS, STATUS_LABELS, STATUS_DOT } from '@/types'
import type { Order } from '@/types'

interface Props { order: Order }

export function OrderCard({ order }: Props) {
  const customer = order.customers
  const garments = order.order_garments ?? []
  const altCount = garments.reduce((s, g) => s + (g.garment_alterations?.length ?? 0), 0)
  const balance = balanceDue(order.subtotal, order.total_paid)
  const hasBalance = balance > 0 && order.status !== 'picked_up'

  // Summary line
  const summary =
    garments.length === 0 ? 'No services' :
    garments.length === 1 ? garments[0].garment_type :
    `${garments[0].garment_type} + ${garments.length - 1} more garment${garments.length > 2 ? 's' : ''}`

  return (
    <Link href={`/orders/${order.id}`}>
      <Card className="hover:shadow-card-hover transition-shadow active:scale-[0.99] cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <h3 className="font-serif text-lg font-semibold text-charcoal truncate">
                  {customer?.name ?? 'Unknown'}
                </h3>
                <span className="text-xs text-charcoal-muted font-sans flex-shrink-0">
                  #{order.order_number}
                </span>
              </div>

              {customer?.phone && (
                <p className="text-sm text-charcoal-muted font-sans mb-1">{customer.phone}</p>
              )}

              <p className="text-sm text-charcoal font-sans mb-3">{summary}</p>

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
                {garments.length > 0 && (
                  <span className="text-xs text-charcoal-muted font-sans">
                    {garments.length} {garments.length === 1 ? 'garment' : 'garments'} · {altCount} alt{altCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

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
              {!hasBalance && order.status !== 'picked_up' && (order.total_paid ?? 0) > 0 && (
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
