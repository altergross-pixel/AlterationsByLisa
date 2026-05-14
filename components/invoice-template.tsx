'use client'

import { Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, isFabricFee } from '@/lib/utils'
import type { OrderWithRelations } from '@/types'

interface Props {
  order: OrderWithRelations
  orderId: string
}

export function InvoiceTemplate({ order, orderId }: Props) {
  const garments = [...order.order_garments].sort((a, b) => a.sort_order - b.sort_order)

  const fabricTotal = garments.reduce(
    (s, g) => s + g.garment_alterations
      .filter((a) => isFabricFee(a.service_name))
      .reduce((gs, a) => gs + a.price * a.quantity, 0),
    0
  )
  const altTotal  = order.subtotal - fabricTotal
  const hasDeposit = (order.deposit_paid ?? 0) > 0
  const balance   = Math.max(0, order.subtotal - (order.total_paid ?? 0))

  const garmentLabel = garments.length === 1
    ? `${garments[0].garment_type}${garments[0].garment_color ? ` (${garments[0].garment_color})` : ''}`
    : `${garments.length} garments`

  const invoiceDate = order.pickup_date
    ? formatDate(order.pickup_date)
    : formatDate(order.created_at.slice(0, 10))

  return (
    <>
      {/* Action bar */}
      <div className="no-print flex gap-3 mb-6">
        <a
          href={`/api/invoice/${orderId}`}
          download
          className="flex-1 flex items-center justify-center gap-2 h-14 rounded-xl bg-charcoal text-white font-sans font-semibold text-base hover:bg-charcoal-light active:scale-[0.98] transition-all shadow-card"
        >
          <Download className="w-5 h-5" /> Download PDF
        </a>
        <Button onClick={() => window.print()} variant="outline" size="lg" className="flex-1">
          <Printer className="w-5 h-5" /> Print
        </Button>
      </div>

      {/* Invoice */}
      <div id="invoice-print" className="bg-white" style={{ fontFamily:"'Playfair Display', Georgia, serif", maxWidth:'720px', margin:'0 auto', padding:'56px 64px 64px', minHeight:'1000px' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'52px' }}>
          <h1 style={{ fontFamily:"'Playfair Display', Georgia, serif", fontSize:'26px', fontWeight:'400', letterSpacing:'0.48em', color:'#1C1C1E', margin:'0 0 12px', textTransform:'uppercase' }}>
            AlterationsByLisa
          </h1>
          <p style={{ fontStyle:'italic', fontSize:'13px', color:'#3A3A3C', margin:'0 0 14px' }}>
            Luxury Alterations &amp; Modest Fashion
          </p>
          <p style={{ fontFamily:'Inter,sans-serif', fontSize:'9px', letterSpacing:'0.28em', color:'#C4963A', margin:'0 0 4px', textTransform:'uppercase' }}>
            Manhattan &nbsp;◆&nbsp; Five Towns
          </p>
          <p style={{ fontFamily:'Inter,sans-serif', fontSize:'9px', letterSpacing:'0.28em', color:'#C4963A', margin:'0', textTransform:'uppercase' }}>
            WhatsApp 917 · 282 · 4524
          </p>
        </div>

        {/* Client / Date */}
        <div style={{ display:'flex', gap:'36px', marginBottom:'22px' }}>
          <InfoCell label="CLIENT" value={order.customers.name} />
          <InfoCell label="DATE"   value={invoiceDate} />
        </div>

        {/* Garment / Notes */}
        <div style={{ display:'flex', gap:'36px', marginBottom:'36px' }}>
          <InfoCell label="GARMENT" value={garmentLabel} />
          <InfoCell label="NOTES"   value={order.notes ?? ''} />
        </div>

        {/* Alterations Performed */}
        <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'13px', fontWeight:'400', letterSpacing:'0.42em', textAlign:'center', color:'#1C1C1E', margin:'0 0 18px', textTransform:'uppercase' }}>
          Alterations Performed
        </h2>

        <div style={{ marginBottom:'28px' }}>
          {garments.map((garment, gi) => {
            const regularAlts = garment.garment_alterations.filter((a) => !isFabricFee(a.service_name))
            const fabricAlts  = garment.garment_alterations.filter((a) => isFabricFee(a.service_name))
            const gSub = garment.subtotal

            return (
              <div key={garment.id}>
                {/* Per-garment label when multiple garments */}
                {garments.length > 1 && (
                  <div style={{ display:'flex', alignItems:'center', gap:'12px', margin:'16px 0 8px' }}>
                    <span style={{ fontFamily:'Inter,sans-serif', fontSize:'8px', letterSpacing:'0.2em', color:'#8A8279', textTransform:'uppercase', whiteSpace:'nowrap' }}>
                      {gi + 1}. {garment.garment_type}
                      {garment.garment_color ? ` — ${garment.garment_color}` : ''}
                    </span>
                    <div style={{ flex:1, borderTop:'0.5px solid #E8DFD0' }} />
                  </div>
                )}

                {/* Regular alterations */}
                {regularAlts.map((alt) => (
                  <AltRow key={alt.id} name={alt.service_name} qty={alt.quantity}
                    price={alt.price * alt.quantity} />
                ))}
                {/* Fabric fee alterations (italic/muted) */}
                {fabricAlts.map((alt) => (
                  <AltRow key={alt.id} name={alt.service_name} qty={alt.quantity}
                    price={alt.price * alt.quantity} muted />
                ))}

                {/* Per-garment subtotal when multiple */}
                {garments.length > 1 && (
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0 10px', borderTop:'0.5px dashed #D4C5B0', marginTop:'4px' }}>
                    <span style={{ fontFamily:'Inter,sans-serif', fontSize:'7.5px', letterSpacing:'0.18em', color:'#8A8279', textTransform:'uppercase' }}>
                      {garment.garment_type} subtotal
                    </span>
                    <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontStyle:'italic', fontSize:'11px', color:'#8A8279' }}>
                      {formatCurrency(gSub)}
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          {/* Empty rows if few alterations */}
          {order.order_garments.reduce((s, g) => s + g.garment_alterations.length, 0) === 0 && (
            Array.from({ length: 5 }).map((_, i) => <AltRow key={i} name="" qty={0} price={0} empty />)
          )}
        </div>

        {/* Totals */}
        <div style={{ borderTop:'0.5px solid #D4C5B0', paddingTop:'20px' }}>
          <TotalRow label="SUBTOTAL" value={formatCurrency(altTotal)} />
          <TotalRow label="FABRIC FEE" value={formatCurrency(fabricTotal)} />
          <div style={{ borderTop:'0.75px solid #1C1C1E', margin:'12px 0 8px' }} />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'8px 0' }}>
            <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'18px', fontWeight:'400', letterSpacing:'0.38em', color:'#1C1C1E', textTransform:'uppercase' }}>
              Total
            </span>
            <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'18px', fontWeight:'700', color:'#1C1C1E' }}>
              {formatCurrency(order.subtotal)}
            </span>
          </div>
          <div style={{ borderTop:'0.75px solid #1C1C1E', marginBottom:'16px' }} />
          {hasDeposit && (
            <>
              <TotalRow label="DEPOSIT PAID" value={`− ${formatCurrency(order.deposit_paid ?? 0)}`} muted />
              <TotalRow label="BALANCE DUE"  value={formatCurrency(balance)} bold />
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:'60px' }}>
          <p style={{ fontStyle:'italic', fontSize:'13px', color:'#3A3A3C', margin:'0 0 10px' }}>
            Thank you for choosing AlterationsByLisa.
          </p>
          <p style={{ fontFamily:'Inter,sans-serif', fontSize:'8px', letterSpacing:'0.26em', color:'#C4963A', margin:'0', textTransform:'uppercase' }}>
            Couture Care &nbsp;·&nbsp; Modest by Design
          </p>
          {order.pickup_date && (
            <p style={{ fontFamily:'Inter,sans-serif', fontSize:'8px', letterSpacing:'0.18em', color:'#8A8279', margin:'14px 0 0', textTransform:'uppercase' }}>
              Pickup Date: {formatDate(order.pickup_date)}
            </p>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #invoice-print, #invoice-print * { display: revert !important; }
          #invoice-print { position: fixed; inset: 0; padding: 0.8in 1in; background: white; }
          .no-print { display: none !important; }
          @page { size: letter; margin: 0; }
        }
      `}</style>
    </>
  )
}

// ── Sub-components ───────────────────────────────────────────

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1 }}>
      <p style={{ fontFamily:'Inter,sans-serif', fontSize:'7px', letterSpacing:'0.22em', color:'#8A8279', margin:'0 0 10px', textTransform:'uppercase' }}>
        {label}
      </p>
      <div style={{ borderBottom:'0.5px solid #1C1C1E', paddingBottom:'8px', minHeight:'26px' }}>
        <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'12px', color:'#1C1C1E', margin:'0' }}>
          {value}
        </p>
      </div>
    </div>
  )
}

function AltRow({ name, qty, price, empty, muted }: { name:string; qty:number; price:number; empty?:boolean; muted?:boolean }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'0.75px dashed #D4C5B0', minHeight:'40px' }}>
      <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'11px', color: muted ? '#8A8279' : '#1C1C1E', fontStyle: muted ? 'italic' : 'normal', flex:1 }}>
        {name}
        {qty > 1 && <span style={{ color:'#8A8279', marginLeft:'6px', fontSize:'10px' }}>× {qty}</span>}
      </span>
      <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'11px', color: muted ? '#8A8279' : '#1C1C1E', width:'60px', textAlign:'right' }}>
        {empty ? '' : formatCurrency(price)}
      </span>
    </div>
  )
}

function TotalRow({ label, value, muted, bold }: { label:string; value:string; muted?:boolean; bold?:boolean }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'6px 0' }}>
      <span style={{ fontFamily:'Inter,sans-serif', fontSize:'8px', letterSpacing:'0.2em', color: muted ? '#B0A89C' : '#1C1C1E', textTransform:'uppercase' }}>
        {label}
      </span>
      <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'12px', color: muted ? '#B0A89C' : '#1C1C1E', fontWeight: bold ? '700' : '400' }}>
        {value}
      </span>
    </div>
  )
}
