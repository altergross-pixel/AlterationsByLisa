import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OrderDetail } from '@/components/order-detail'
import type { OrderWithRelations } from '@/types'

export const revalidate = 0

interface Props {
  params: { id: string }
}

export default async function OrderDetailPage({ params }: Props) {
  const supabase = createClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`*, customers(*), order_items(*)`)
    .eq('id', params.id)
    .single()

  if (!order) notFound()

  const { data: pricing } = await supabase
    .from('pricing_master')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-charcoal-muted hover:text-charcoal font-sans text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Orders
        </Link>
        <Link
          href={`/orders/${params.id}/invoice`}
          className="inline-flex items-center gap-1.5 text-gold hover:text-gold-dark font-sans text-sm font-semibold transition-colors"
        >
          <FileText className="w-4 h-4" />
          View Invoice
        </Link>
      </div>

      <OrderDetail order={order as OrderWithRelations} pricing={pricing ?? []} />
    </div>
  )
}
