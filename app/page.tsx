import { createClient } from '@/lib/supabase/server'
import { DashboardBoard } from '@/components/dashboard-board'
import type { Order } from '@/types'

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      customers ( id, name, phone ),
      order_items ( * )
    `)
    .order('created_at', { ascending: false })

  return <DashboardBoard orders={(orders as Order[]) ?? []} />
}
