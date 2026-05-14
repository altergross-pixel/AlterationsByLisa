import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatShortDate(dateString: string | null): string {
  if (!dateString) return '—'
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

export function formatPriceRange(
  price: number,
  priceMax: number | null,
  priceNote: string | null
): string {
  if (price === 0 && priceNote?.toLowerCase().includes('quote')) return 'Quote'
  if (priceMax && priceMax > price) return `$${price}–$${priceMax}`
  if (priceNote?.toLowerCase().includes('minimum')) return `$${price} min.`
  return `$${price}`
}

export function balanceDue(subtotal: number, totalPaid: number): number {
  return Math.max(0, subtotal - totalPaid)
}

export function isFabricFee(name: string): boolean {
  const n = name.toLowerCase()
  return (
    (n.includes('fabric') &&
      (n.includes('fee') || n.includes('taken') || n.includes('add-on') || n.includes('addon'))) ||
    n.includes('expensive fabric')
  )
}

export function getPhotoPublicUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/order-photos/${storagePath}`
}
