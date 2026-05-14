import { createClient } from '@/lib/supabase/server'
import { NewOrderForm } from '@/components/new-order-form'
import type { PricingItem } from '@/types'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewOrderPage() {
  const supabase = createClient()

  const { data: pricing } = await supabase
    .from('pricing_master')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-32">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-charcoal-muted hover:text-charcoal font-sans text-sm mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      <h1 className="font-serif text-3xl font-semibold text-charcoal mb-6">New Order</h1>

      <NewOrderForm pricing={(pricing as PricingItem[]) ?? []} />
    </div>
  )
}
