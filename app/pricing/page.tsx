import { createClient } from '@/lib/supabase/server'
import { PricingManager } from '@/components/pricing-manager'
import type { PricingItem } from '@/types'

export const revalidate = 0

export default async function PricingPage() {
  const supabase = createClient()

  const { data: pricing } = await supabase
    .from('pricing_master')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-charcoal">Pricing</h1>
        <p className="text-charcoal-muted font-sans text-sm mt-1">
          Tap a price to edit it. Changes apply to new orders immediately.
        </p>
      </div>

      <PricingManager pricing={(pricing as PricingItem[]) ?? []} />
    </div>
  )
}
