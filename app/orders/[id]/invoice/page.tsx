import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { InvoiceTemplate } from '@/components/invoice-template'
import type { OrderWithRelations } from '@/types'

interface Props {
  params: { id: string }
}

export default async function InvoicePage({ params }: Props) {
  const supabase = createClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`*, customers(*), order_items(*)`)
    .eq('id', params.id)
    .single()

  if (!order) notFound()

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5">
      <div className="no-print flex items-center justify-between mb-6">
        <Link
          href={`/orders/${params.id}`}
          className="inline-flex items-center gap-1.5 text-charcoal-muted hover:text-charcoal font-sans text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Order
        </Link>
        <PrintButton />
      </div>

      <InvoiceTemplate order={order as OrderWithRelations} />
    </div>
  )
}

function PrintButton() {
  return (
    <button
      onClick={() => {}}
      className="no-print"
      id="print-trigger"
    />
  )
}
