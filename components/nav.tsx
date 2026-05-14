import Link from 'next/link'
import { Scissors, Plus, DollarSign } from 'lucide-react'

export function Nav() {
  return (
    <>
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-gold" strokeWidth={1.5} />
            <span className="font-serif text-xl font-semibold text-charcoal tracking-tight">
              AlterationsByLisa
            </span>
          </Link>
          <Link
            href="/orders/new"
            className="flex items-center gap-1.5 bg-gold text-white rounded-xl px-4 h-10 text-sm font-semibold font-sans hover:bg-gold-dark active:scale-95 transition-all shadow-card"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            New Order
          </Link>
        </div>
      </header>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border safe-area-bottom">
        <div className="max-w-2xl mx-auto flex">
          <Link
            href="/"
            className="flex-1 flex flex-col items-center gap-1 py-3 text-charcoal-muted hover:text-charcoal transition-colors"
          >
            <Scissors className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-[11px] font-semibold font-sans">Orders</span>
          </Link>
          <Link
            href="/orders/new"
            className="flex-1 flex flex-col items-center gap-1 py-3 text-charcoal-muted hover:text-charcoal transition-colors"
          >
            <Plus className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-[11px] font-semibold font-sans">New Order</span>
          </Link>
          <Link
            href="/pricing"
            className="flex-1 flex flex-col items-center gap-1 py-3 text-charcoal-muted hover:text-charcoal transition-colors"
          >
            <DollarSign className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-[11px] font-semibold font-sans">Pricing</span>
          </Link>
        </div>
      </nav>
    </>
  )
}
