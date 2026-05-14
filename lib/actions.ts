'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/types'

// ── Internal helpers ──────────────────────────────────────────

async function recalcGarment(supabase: ReturnType<typeof createClient>, garmentId: string) {
  const { data } = await supabase
    .from('garment_alterations')
    .select('price, quantity')
    .eq('garment_id', garmentId)
  const sub = (data ?? []).reduce((s, r) => s + r.price * r.quantity, 0)
  await supabase.from('order_garments').update({ subtotal: sub }).eq('id', garmentId)
  return sub
}

async function recalcOrder(supabase: ReturnType<typeof createClient>, orderId: string) {
  const { data } = await supabase
    .from('order_garments')
    .select('subtotal')
    .eq('order_id', orderId)
  const sub = (data ?? []).reduce((s, r) => s + (r.subtotal ?? 0), 0)
  await supabase.from('orders').update({ subtotal: sub }).eq('id', orderId)
  return sub
}

// ── ORDER CREATION ─────────────────────────────────────────────

interface GarmentInput {
  id?: string            // pre-assigned UUID (used when photos uploaded before save)
  garment_type: string
  garment_color: string
  description: string
  notes: string
  alterations: {
    service_name: string
    price: number
    quantity: number
    notes: string
  }[]
  photos?: { storage_path: string; filename: string }[]
}

export async function createOrder(formData: {
  customerName: string
  phone: string
  pickupDate: string
  notes: string
  garments: GarmentInput[]
}) {
  const supabase = createClient()

  // Upsert customer
  let customerId: string
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('name', formData.customerName.trim())
    .eq('phone', formData.phone.trim())
    .maybeSingle()

  if (existing) {
    customerId = existing.id
  } else {
    const { data: newCust, error } = await supabase
      .from('customers')
      .insert({ name: formData.customerName.trim(), phone: formData.phone.trim() })
      .select('id')
      .single()
    if (error || !newCust) throw new Error('Failed to create customer')
    customerId = newCust.id
  }

  // Compute subtotal across all garments
  const subtotal = formData.garments.reduce(
    (s, g) => s + g.alterations.reduce((gs, a) => gs + a.price * a.quantity, 0),
    0
  )

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      status: 'new',
      pickup_date: formData.pickupDate || null,
      notes: formData.notes.trim() || null,
      subtotal,
    })
    .select('id')
    .single()

  if (orderErr || !order) throw new Error('Failed to create order')

  // Insert garments + alterations
  for (let i = 0; i < formData.garments.length; i++) {
    const g = formData.garments[i]
    const garmentSubtotal = g.alterations.reduce((s, a) => s + a.price * a.quantity, 0)

    const insertPayload: Record<string, unknown> = {
      order_id: order.id,
      garment_type: g.garment_type.trim() || 'Garment',
      garment_color: g.garment_color.trim() || null,
      description: g.description.trim() || null,
      notes: g.notes.trim() || null,
      sort_order: i,
      subtotal: garmentSubtotal,
    }
    // Use pre-assigned UUID if provided (enables pre-uploaded photos to link correctly)
    if (g.id) insertPayload.id = g.id

    const { data: garment, error: gErr } = await supabase
      .from('order_garments')
      .insert(insertPayload)
      .select('id')
      .single()

    if (gErr || !garment) throw new Error('Failed to create garment')

    if (g.alterations.length > 0) {
      await supabase.from('garment_alterations').insert(
        g.alterations.map((a) => ({
          garment_id: garment.id,
          order_id: order.id,
          service_name: a.service_name,
          price: a.price,
          quantity: a.quantity,
          notes: a.notes.trim() || null,
        }))
      )
    }

    if (g.photos && g.photos.length > 0) {
      await supabase.from('garment_photos').insert(
        g.photos.map((p) => ({
          garment_id: garment.id,
          order_id: order.id,
          storage_path: p.storage_path,
          filename: p.filename,
        }))
      )
    }
  }

  revalidatePath('/')
  redirect(`/orders/${order.id}`)
}

// ── ORDER STATUS / PAYMENT ─────────────────────────────────────

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = createClient()
  await supabase.from('orders').update({ status }).eq('id', orderId)
  revalidatePath('/')
  revalidatePath(`/orders/${orderId}`)
}

export async function addDeposit(orderId: string, amount: number) {
  const supabase = createClient()
  const { data: order } = await supabase
    .from('orders').select('deposit_paid, total_paid').eq('id', orderId).single()
  if (!order) throw new Error('Order not found')
  await supabase.from('orders').update({
    deposit_paid: (order.deposit_paid ?? 0) + amount,
    total_paid: (order.total_paid ?? 0) + amount,
  }).eq('id', orderId)
  revalidatePath(`/orders/${orderId}`)
}

export async function markFullyPaid(orderId: string) {
  const supabase = createClient()
  const { data: order } = await supabase
    .from('orders').select('subtotal').eq('id', orderId).single()
  if (!order) throw new Error('Order not found')
  await supabase.from('orders').update({
    total_paid: order.subtotal,
    deposit_paid: order.subtotal,
    status: 'picked_up',
  }).eq('id', orderId)
  revalidatePath('/')
  revalidatePath(`/orders/${orderId}`)
}

export async function deleteOrder(orderId: string) {
  const supabase = createClient()

  // Delete all garment photos from storage
  const { data: photos } = await supabase
    .from('garment_photos')
    .select('storage_path')
    .eq('order_id', orderId)
  if (photos?.length) {
    await supabase.storage.from('order-photos').remove(photos.map((p) => p.storage_path))
  }

  await supabase.from('orders').delete().eq('id', orderId)
  revalidatePath('/')
  redirect('/')
}

export async function updateOrderNotes(orderId: string, notes: string) {
  const supabase = createClient()
  await supabase.from('orders').update({ notes: notes.trim() || null }).eq('id', orderId)
  revalidatePath(`/orders/${orderId}`)
}

// ── GARMENTS ──────────────────────────────────────────────────

export async function addGarmentToOrder(
  orderId: string,
  data: { garment_type: string; garment_color?: string; description?: string; notes?: string }
) {
  const supabase = createClient()

  const { data: last } = await supabase
    .from('order_garments')
    .select('sort_order')
    .eq('order_id', orderId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: garment, error } = await supabase
    .from('order_garments')
    .insert({
      order_id: orderId,
      garment_type: data.garment_type || 'Garment',
      garment_color: data.garment_color?.trim() || null,
      description: data.description?.trim() || null,
      notes: data.notes?.trim() || null,
      sort_order: (last?.sort_order ?? 0) + 1,
      subtotal: 0,
    })
    .select('id')
    .single()

  if (error || !garment) throw new Error('Failed to add garment')
  revalidatePath(`/orders/${orderId}`)
  return garment.id
}

export async function updateGarment(
  garmentId: string,
  orderId: string,
  data: { garment_type?: string; garment_color?: string; description?: string; notes?: string }
) {
  const supabase = createClient()
  await supabase.from('order_garments').update({
    garment_type: data.garment_type?.trim() || undefined,
    garment_color: data.garment_color?.trim() || null,
    description: data.description?.trim() || null,
    notes: data.notes?.trim() || null,
  }).eq('id', garmentId)
  revalidatePath(`/orders/${orderId}`)
}

export async function deleteGarment(garmentId: string, orderId: string) {
  const supabase = createClient()

  // Delete photos from storage first
  const { data: photos } = await supabase
    .from('garment_photos')
    .select('storage_path')
    .eq('garment_id', garmentId)
  if (photos?.length) {
    await supabase.storage.from('order-photos').remove(photos.map((p) => p.storage_path))
  }

  await supabase.from('order_garments').delete().eq('id', garmentId)
  await recalcOrder(supabase, orderId)
  revalidatePath('/')
  revalidatePath(`/orders/${orderId}`)
}

// ── ALTERATIONS ───────────────────────────────────────────────

export async function addAlteration(
  garmentId: string,
  orderId: string,
  item: { service_name: string; price: number; quantity: number; notes?: string }
) {
  const supabase = createClient()
  await supabase.from('garment_alterations').insert({
    garment_id: garmentId,
    order_id: orderId,
    service_name: item.service_name,
    price: item.price,
    quantity: item.quantity,
    notes: item.notes?.trim() || null,
  })
  await recalcGarment(supabase, garmentId)
  await recalcOrder(supabase, orderId)
  revalidatePath(`/orders/${orderId}`)
}

export async function removeAlteration(
  alterationId: string,
  garmentId: string,
  orderId: string
) {
  const supabase = createClient()
  await supabase.from('garment_alterations').delete().eq('id', alterationId)
  await recalcGarment(supabase, garmentId)
  await recalcOrder(supabase, orderId)
  revalidatePath(`/orders/${orderId}`)
}

// ── PHOTOS ────────────────────────────────────────────────────

export async function recordGarmentPhoto(
  garmentId: string,
  orderId: string,
  storagePath: string,
  filename: string
): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('garment_photos')
    .insert({ garment_id: garmentId, order_id: orderId, storage_path: storagePath, filename })
    .select('id')
    .single()
  if (error || !data) throw new Error('Failed to record photo')
  revalidatePath(`/orders/${orderId}`)
  return data.id
}

export async function deleteGarmentPhoto(
  photoId: string,
  storagePath: string,
  orderId: string
) {
  const supabase = createClient()
  await supabase.storage.from('order-photos').remove([storagePath])
  await supabase.from('garment_photos').delete().eq('id', photoId)
  revalidatePath(`/orders/${orderId}`)
}

// ── PRICING ───────────────────────────────────────────────────

export async function updatePricingItem(
  id: string,
  data: {
    service_name?: string
    price?: number
    price_max?: number | null
    price_note?: string | null
    description?: string | null
  }
) {
  const supabase = createClient()
  await supabase.from('pricing_master').update(data).eq('id', id)
  revalidatePath('/pricing')
  revalidatePath('/orders/new')
}

export async function addPricingItem(data: {
  service_name: string
  price: number
  price_max?: number | null
  price_note?: string | null
  description?: string | null
  category: string
}) {
  const supabase = createClient()
  await supabase.from('pricing_master').insert(data)
  revalidatePath('/pricing')
  revalidatePath('/orders/new')
}

export async function togglePricingItem(id: string, is_active: boolean) {
  const supabase = createClient()
  await supabase.from('pricing_master').update({ is_active }).eq('id', id)
  revalidatePath('/pricing')
  revalidatePath('/orders/new')
}
