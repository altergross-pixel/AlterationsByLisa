'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/types'

// ============================================================
// ORDERS
// ============================================================

export async function createOrder(formData: {
  customerName: string
  phone: string
  pickupDate: string
  notes: string
  items: { service_name: string; price: number; quantity: number; notes: string }[]
}) {
  const supabase = createClient()

  // Upsert customer (match by name + phone)
  let customerId: string

  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('name', formData.customerName.trim())
    .eq('phone', formData.phone.trim())
    .single()

  if (existing) {
    customerId = existing.id
  } else {
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({ name: formData.customerName.trim(), phone: formData.phone.trim() })
      .select('id')
      .single()

    if (customerError || !newCustomer) throw new Error('Failed to create customer')
    customerId = newCustomer.id
  }

  const subtotal = formData.items.reduce((s, i) => s + i.price * i.quantity, 0)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      status: 'new',
      pickup_date: formData.pickupDate || null,
      notes: formData.notes || null,
      subtotal,
    })
    .select('id')
    .single()

  if (orderError || !order) throw new Error('Failed to create order')

  if (formData.items.length > 0) {
    const { error: itemsError } = await supabase.from('order_items').insert(
      formData.items.map((item) => ({
        order_id: order.id,
        service_name: item.service_name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || null,
      }))
    )
    if (itemsError) throw new Error('Failed to add order items')
  }

  revalidatePath('/')
  redirect(`/orders/${order.id}`)
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = createClient()
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
  if (error) throw new Error('Failed to update status')
  revalidatePath('/')
  revalidatePath(`/orders/${orderId}`)
}

export async function addDeposit(orderId: string, amount: number) {
  const supabase = createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('deposit_paid, total_paid, subtotal')
    .eq('id', orderId)
    .single()

  if (!order) throw new Error('Order not found')

  const newDeposit = (order.deposit_paid || 0) + amount
  const newTotalPaid = (order.total_paid || 0) + amount

  const { error } = await supabase
    .from('orders')
    .update({ deposit_paid: newDeposit, total_paid: newTotalPaid })
    .eq('id', orderId)

  if (error) throw new Error('Failed to record deposit')
  revalidatePath(`/orders/${orderId}`)
}

export async function markFullyPaid(orderId: string) {
  const supabase = createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('subtotal')
    .eq('id', orderId)
    .single()

  if (!order) throw new Error('Order not found')

  const { error } = await supabase
    .from('orders')
    .update({
      total_paid: order.subtotal,
      deposit_paid: order.subtotal,
      status: 'picked_up',
    })
    .eq('id', orderId)

  if (error) throw new Error('Failed to mark as paid')
  revalidatePath('/')
  revalidatePath(`/orders/${orderId}`)
}

export async function updateOrderNotes(orderId: string, notes: string) {
  const supabase = createClient()
  const { error } = await supabase.from('orders').update({ notes }).eq('id', orderId)
  if (error) throw new Error('Failed to update notes')
  revalidatePath(`/orders/${orderId}`)
}

export async function addOrderItem(
  orderId: string,
  item: { service_name: string; price: number; quantity: number; notes?: string }
) {
  const supabase = createClient()

  const { error: insertError } = await supabase.from('order_items').insert({
    order_id: orderId,
    ...item,
    notes: item.notes || null,
  })
  if (insertError) throw new Error('Failed to add item')

  // Recalculate subtotal
  const { data: items } = await supabase
    .from('order_items')
    .select('price, quantity')
    .eq('order_id', orderId)

  const subtotal = (items || []).reduce((s, i) => s + i.price * i.quantity, 0)
  await supabase.from('orders').update({ subtotal }).eq('id', orderId)

  revalidatePath(`/orders/${orderId}`)
}

export async function removeOrderItem(orderId: string, itemId: string) {
  const supabase = createClient()

  const { error } = await supabase.from('order_items').delete().eq('id', itemId)
  if (error) throw new Error('Failed to remove item')

  const { data: items } = await supabase
    .from('order_items')
    .select('price, quantity')
    .eq('order_id', orderId)

  const subtotal = (items || []).reduce((s, i) => s + i.price * i.quantity, 0)
  await supabase.from('orders').update({ subtotal }).eq('id', orderId)

  revalidatePath(`/orders/${orderId}`)
}

export async function deleteOrder(orderId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('orders').delete().eq('id', orderId)
  if (error) throw new Error('Failed to delete order')
  revalidatePath('/')
  redirect('/')
}

// ============================================================
// PRICING
// ============================================================

export async function updatePrice(id: string, price: number) {
  const supabase = createClient()
  const { error } = await supabase.from('pricing_master').update({ price }).eq('id', id)
  if (error) throw new Error('Failed to update price')
  revalidatePath('/pricing')
  revalidatePath('/orders/new')
}

export async function addPricingItem(data: {
  service_name: string
  price: number
  category: string
}) {
  const supabase = createClient()
  const { error } = await supabase.from('pricing_master').insert(data)
  if (error) throw new Error('Failed to add service')
  revalidatePath('/pricing')
  revalidatePath('/orders/new')
}

export async function togglePricingItem(id: string, is_active: boolean) {
  const supabase = createClient()
  const { error } = await supabase
    .from('pricing_master')
    .update({ is_active })
    .eq('id', id)
  if (error) throw new Error('Failed to toggle service')
  revalidatePath('/pricing')
  revalidatePath('/orders/new')
}
