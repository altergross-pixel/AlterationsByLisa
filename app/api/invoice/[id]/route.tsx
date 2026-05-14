import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { InvoicePDF } from '@/components/invoice-pdf'
import type { OrderWithRelations } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers (*),
      order_garments (
        *,
        garment_alterations (*),
        garment_photos (*)
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !order) {
    return new Response('Order not found', { status: 404 })
  }

  // Sort garments
  if (order.order_garments) {
    order.order_garments.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
  }

  try {
    const typedOrder = order as OrderWithRelations
    const buffer = await renderToBuffer(<InvoicePDF order={typedOrder} />)

    const customerSlug = typedOrder.customers?.name
      ?.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '') ?? 'client'
    const filename = `AlterationsByLisa-${order.order_number}-${customerSlug}.pdf`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('PDF error:', err)
    return new Response('Failed to generate PDF', { status: 500 })
  }
}
