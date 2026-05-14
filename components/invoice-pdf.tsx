// Server-only — used in app/api/invoice/[id]/route.tsx only.
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { isFabricFee } from '@/lib/utils'
import type { OrderWithRelations } from '@/types'

const GOLD   = '#C4963A'
const DARK   = '#1C1C1E'
const MUTED  = '#8A8279'
const DIMMED = '#B0A89C'
const DOT    = '#D4C5B0'

const s = StyleSheet.create({
  page: { backgroundColor: '#FFF', paddingHorizontal: 72, paddingTop: 56, paddingBottom: 56 },

  // Header
  title:    { fontFamily:'Times-Roman', fontSize:25, letterSpacing:8, textAlign:'center', color:DARK, marginBottom:10 },
  subtitle: { fontFamily:'Times-Italic', fontSize:11.5, textAlign:'center', color:'#3A3A3C', marginBottom:14 },
  location: { fontFamily:'Helvetica', fontSize:7.5, letterSpacing:3, textAlign:'center', color:GOLD, marginBottom:3 },
  phone:    { fontFamily:'Helvetica', fontSize:7.5, letterSpacing:3, textAlign:'center', color:GOLD, marginBottom:48 },

  // Info grid
  infoRow:  { flexDirection:'row', gap:36, marginBottom:22 },
  infoCell: { flex:1 },
  infoLbl:  { fontFamily:'Helvetica', fontSize:6.5, letterSpacing:2.5, color:MUTED, marginBottom:10 },
  infoWrap: { borderBottomWidth:0.5, borderBottomColor:DARK, paddingBottom:6, minHeight:22 },
  infoVal:  { fontFamily:'Times-Roman', fontSize:11, color:DARK },

  // Alterations header
  altHeader: { fontFamily:'Times-Roman', fontSize:12, letterSpacing:5, textAlign:'center', color:DARK, marginTop:6, marginBottom:16 },

  // Garment block
  garmentLabel: { fontFamily:'Helvetica', fontSize:7, letterSpacing:2, color:MUTED, marginTop:12, marginBottom:6 },
  altRow:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:9, borderBottomWidth:0.75, borderBottomColor:DOT, borderBottomStyle:'dashed' },
  altName: { fontFamily:'Times-Roman', fontSize:10.5, color:DARK, flex:1 },
  altQty:  { fontFamily:'Times-Roman', fontSize:9.5, color:MUTED, marginRight:6 },
  altAmt:  { fontFamily:'Times-Roman', fontSize:10.5, color:DARK, width:56, textAlign:'right' },

  // Garment subtotal line
  garmentSub: { flexDirection:'row', justifyContent:'space-between', paddingVertical:5, borderTopWidth:0.5, borderTopColor:DOT, marginBottom:6 },
  garmentSubLbl: { fontFamily:'Helvetica', fontSize:6.5, letterSpacing:1.5, color:MUTED },
  garmentSubVal: { fontFamily:'Times-Italic', fontSize:10.5, color:MUTED },

  // Totals
  totSection: { marginTop:20 },
  totRow:  { flexDirection:'row', justifyContent:'space-between', paddingVertical:7 },
  totLbl:  { fontFamily:'Helvetica', fontSize:7, letterSpacing:2, color:DARK },
  totVal:  { fontFamily:'Times-Roman', fontSize:10.5, color:DARK },
  divider: { borderTopWidth:0.75, borderTopColor:DARK, marginVertical:5 },
  grandRow: { flexDirection:'row', justifyContent:'space-between', paddingVertical:9 },
  grandLbl: { fontFamily:'Times-Roman', fontSize:14, letterSpacing:4, color:DARK },
  grandVal: { fontFamily:'Times-Bold', fontSize:14, color:DARK },
  depLbl:  { fontFamily:'Helvetica', fontSize:7, letterSpacing:2, color:DIMMED },
  depVal:  { fontFamily:'Times-Roman', fontSize:10.5, color:DIMMED },
  balLbl:  { fontFamily:'Helvetica', fontSize:7, letterSpacing:2, color:DARK },
  balVal:  { fontFamily:'Times-Bold', fontSize:11, color:DARK },

  // Footer
  footer:    { marginTop:52, alignItems:'center' },
  thankYou:  { fontFamily:'Times-Italic', fontSize:12, color:'#3A3A3C', textAlign:'center', marginBottom:8 },
  tagline:   { fontFamily:'Helvetica', fontSize:6.5, letterSpacing:3, color:GOLD, textAlign:'center' },
  pickupNote:{ fontFamily:'Helvetica', fontSize:7, letterSpacing:1.5, color:MUTED, textAlign:'center', marginTop:14 },
})

function fmt(n: number) { return `$${n.toFixed(2)}` }

function fmtDate(d: string | null): string {
  if (!d) return ''
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })
}

interface Props { order: OrderWithRelations }

export function InvoicePDF({ order }: Props) {
  const garments = [...order.order_garments].sort((a, b) => a.sort_order - b.sort_order)

  // All fabric fee items across all garments
  const fabricTotal = garments.reduce(
    (s, g) => s + g.garment_alterations
      .filter((a) => isFabricFee(a.service_name))
      .reduce((gs, a) => gs + a.price * a.quantity, 0),
    0
  )
  const altTotal = order.subtotal - fabricTotal
  const hasDeposit = (order.deposit_paid ?? 0) > 0
  const balance = Math.max(0, order.subtotal - (order.total_paid ?? 0))

  // For the GARMENT info cell: if single garment, show type; else show count
  const garmentLabel = garments.length === 1
    ? `${garments[0].garment_type}${garments[0].garment_color ? ` (${garments[0].garment_color})` : ''}`
    : `${garments.length} garments`

  const invoiceDate = order.pickup_date
    ? fmtDate(order.pickup_date)
    : fmtDate(order.created_at.slice(0, 10))

  return (
    <Document title={`AlterationsByLisa — Invoice #${order.order_number}`} author="AlterationsByLisa">
      <Page size="LETTER" style={s.page}>

        {/* Header */}
        <Text style={s.title}>ALTERATIONSBYLISA</Text>
        <Text style={s.subtitle}>Luxury Alterations &amp; Modest Fashion</Text>
        <Text style={s.location}>MANHATTAN  ◆  FIVE TOWNS</Text>
        <Text style={s.phone}>WHATSAPP  917 · 282 · 4524</Text>

        {/* Client / Date */}
        <View style={s.infoRow}>
          <View style={s.infoCell}>
            <Text style={s.infoLbl}>CLIENT</Text>
            <View style={s.infoWrap}><Text style={s.infoVal}>{order.customers.name}</Text></View>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLbl}>DATE</Text>
            <View style={s.infoWrap}><Text style={s.infoVal}>{invoiceDate}</Text></View>
          </View>
        </View>

        {/* Garment / Notes */}
        <View style={s.infoRow}>
          <View style={s.infoCell}>
            <Text style={s.infoLbl}>GARMENT</Text>
            <View style={s.infoWrap}><Text style={s.infoVal}>{garmentLabel}</Text></View>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLbl}>NOTES</Text>
            <View style={s.infoWrap}><Text style={s.infoVal}>{order.notes ?? ''}</Text></View>
          </View>
        </View>

        {/* Alterations Performed */}
        <Text style={s.altHeader}>ALTERATIONS  PERFORMED</Text>

        {garments.map((garment, gi) => {
          const regularAlts = garment.garment_alterations.filter((a) => !isFabricFee(a.service_name))
          const fabricAlts  = garment.garment_alterations.filter((a) => isFabricFee(a.service_name))
          const gSub = regularAlts.reduce((s, a) => s + a.price * a.quantity, 0)
          const label = garments.length > 1
            ? `${gi + 1}. ${garment.garment_type}${garment.garment_color ? ` — ${garment.garment_color}` : ''}`
            : undefined

          return (
            <View key={garment.id}>
              {label && <Text style={s.garmentLabel}>{label.toUpperCase()}</Text>}
              {regularAlts.map((alt) => (
                <View key={alt.id} style={s.altRow}>
                  <Text style={s.altName}>{alt.service_name}</Text>
                  {alt.quantity > 1 && <Text style={s.altQty}>× {alt.quantity}</Text>}
                  <Text style={s.altAmt}>{fmt(alt.price * alt.quantity)}</Text>
                </View>
              ))}
              {fabricAlts.map((alt) => (
                <View key={alt.id} style={s.altRow}>
                  <Text style={[s.altName, { color: MUTED }]}>{alt.service_name}</Text>
                  {alt.quantity > 1 && <Text style={s.altQty}>× {alt.quantity}</Text>}
                  <Text style={[s.altAmt, { color: MUTED }]}>{fmt(alt.price * alt.quantity)}</Text>
                </View>
              ))}
              {garments.length > 1 && (
                <View style={s.garmentSub}>
                  <Text style={s.garmentSubLbl}>{garment.garment_type.toUpperCase()} SUBTOTAL</Text>
                  <Text style={s.garmentSubVal}>{fmt(garment.subtotal)}</Text>
                </View>
              )}
            </View>
          )
        })}

        {/* Totals */}
        <View style={s.totSection}>
          <View style={s.totRow}>
            <Text style={s.totLbl}>SUBTOTAL</Text>
            <Text style={s.totVal}>{fmt(altTotal)}</Text>
          </View>
          <View style={s.totRow}>
            <Text style={s.totLbl}>FABRIC FEE</Text>
            <Text style={s.totVal}>{fmt(fabricTotal)}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.grandRow}>
            <Text style={s.grandLbl}>TOTAL</Text>
            <Text style={s.grandVal}>{fmt(order.subtotal)}</Text>
          </View>
          <View style={s.divider} />
          {hasDeposit && (
            <>
              <View style={s.totRow}>
                <Text style={s.depLbl}>DEPOSIT PAID</Text>
                <Text style={s.depVal}>− {fmt(order.deposit_paid ?? 0)}</Text>
              </View>
              <View style={s.totRow}>
                <Text style={s.balLbl}>BALANCE DUE</Text>
                <Text style={s.balVal}>{fmt(balance)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.thankYou}>Thank you for choosing AlterationsByLisa.</Text>
          <Text style={s.tagline}>COUTURE CARE  ·  MODEST BY DESIGN</Text>
          {order.pickup_date && (
            <Text style={s.pickupNote}>PICKUP DATE:  {fmtDate(order.pickup_date).toUpperCase()}</Text>
          )}
        </View>

      </Page>
    </Document>
  )
}
