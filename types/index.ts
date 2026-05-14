export type OrderStatus = 'new' | 'in_progress' | 'ready' | 'picked_up'

// ── Core entities ─────────────────────────────────────────────

export interface Customer {
  id: string
  name: string
  phone: string | null
  created_at: string
}

export interface PricingItem {
  id: string
  service_name: string
  price: number
  price_max: number | null
  price_note: string | null
  description: string | null
  category: string
  is_active: boolean
  sort_order: number
}

export interface GarmentAlteration {
  id: string
  garment_id: string
  order_id: string
  service_name: string
  price: number
  quantity: number
  notes: string | null
  created_at: string
}

export interface GarmentPhoto {
  id: string
  garment_id: string
  order_id: string
  storage_path: string
  filename: string
  created_at: string
}

export interface OrderGarment {
  id: string
  order_id: string
  garment_type: string
  garment_color: string | null
  description: string | null
  notes: string | null
  sort_order: number
  subtotal: number
  created_at: string
  garment_alterations?: GarmentAlteration[]
  garment_photos?: GarmentPhoto[]
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
  order_garments?: OrderGarment[]
}

export interface OrderWithRelations extends Order {
  customers: Customer
  order_garments: (OrderGarment & {
    garment_alterations: GarmentAlteration[]
    garment_photos: GarmentPhoto[]
  })[]
}

// ── Display maps ──────────────────────────────────────────────

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new:         'New',
  in_progress: 'In Progress',
  ready:       'Ready for Pickup',
  picked_up:   'Picked Up / Paid',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  new:         'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  ready:       'bg-emerald-100 text-emerald-800 border-emerald-200',
  picked_up:   'bg-gray-100 text-gray-600 border-gray-200',
}

export const STATUS_DOT: Record<OrderStatus, string> = {
  new:         'bg-blue-500',
  in_progress: 'bg-amber-500',
  ready:       'bg-emerald-500',
  picked_up:   'bg-gray-400',
}

export const CATEGORY_LABELS: Record<string, string> = {
  evening_gowns:   'Evening Gowns & Formal Gowns',
  regular_dresses: 'Regular Dresses',
  skirts:          'Skirts',
  pants:           'Pants',
  jackets_coats:   'Jackets / Coats',
  custom_work:     'Custom Work',
  modesty:         'Modesty Alterations',
}

export const CATEGORY_ORDER = [
  'evening_gowns',
  'regular_dresses',
  'skirts',
  'pants',
  'jackets_coats',
  'custom_work',
  'modesty',
]

export const CATEGORY_SHORT: Record<string, string> = {
  evening_gowns:   'Gowns',
  regular_dresses: 'Dresses',
  skirts:          'Skirts',
  pants:           'Pants',
  jackets_coats:   'Jackets',
  custom_work:     'Custom',
  modesty:         'Modesty',
}

export const GARMENT_TYPES = [
  'Wedding Dress',
  'Evening Gown',
  'Dress',
  'Skirt',
  'Pants',
  'Jacket',
  'Coat',
  'Suit',
  'Blouse / Top',
  'Other',
]
