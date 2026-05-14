export type OrderStatus = 'new' | 'in_progress' | 'ready' | 'picked_up'

export interface Customer {
  id: string
  name: string
  phone: string | null
  created_at: string
  updated_at: string
}

export interface PricingItem {
  id: string
  service_name: string
  price: number
  category: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  service_name: string
  price: number
  quantity: number
  notes: string | null
  created_at: string
}

export interface Order {
  id: string
  order_number: number
  customer_id: string | null
  status: OrderStatus
  pickup_date: string | null
  notes: string | null
  subtotal: number
  deposit_paid: number
  total_paid: number
  created_at: string
  updated_at: string
  customers?: Customer
  order_items?: OrderItem[]
}

export interface OrderWithRelations extends Order {
  customers: Customer
  order_items: OrderItem[]
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  ready: 'Ready for Pickup',
  picked_up: 'Picked Up / Paid',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  ready: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  picked_up: 'bg-gray-100 text-gray-600 border-gray-200',
}

export const STATUS_DOT: Record<OrderStatus, string> = {
  new: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  ready: 'bg-emerald-500',
  picked_up: 'bg-gray-400',
}
