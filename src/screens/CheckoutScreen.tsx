import { Banknote, Clock, CreditCard, MapPin, ShieldCheck, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../app/AppProvider'
import type { PaymentMethod } from '../data/types'
import { BreakdownRows } from '../components/PriceBreakdownSheet'
import { FulfilmentToggle } from '../components/FulfilmentToggle'
import { Button, Card, EmptyState, ScreenHeader } from '../components/ui'
import { formatClock } from '../lib/delivery'
import { etaLabel, naira } from '../lib/formatting'

const METHODS: { id: PaymentMethod; label: string; sub: string; icon: typeof CreditCard }[] = [
  { id: 'card', label: 'Card', sub: 'Simulated · no card details', icon: CreditCard },
  { id: 'transfer', label: 'Transfer', sub: 'Simulated · no bank details', icon: Banknote },
  { id: 'wallet', label: 'Wallet', sub: 'Simulated demo balance', icon: Wallet },
]

export function CheckoutScreen() {
  const { cartQuote, back, navigate, address, openSheet, placeOrder, minuteOfDay, vendorStatus } = useApp()
  const [method, setMethod] = useState<PaymentMethod>('card')
  if (!cartQuote || !cartQuote.lines.length)
    return (
      <div>
        <ScreenHeader title="Checkout" onBack={back} />
        <EmptyState emoji="🧾" title="Nothing to check out" body="Your cart is empty. Add something first." action={<Button onClick={() => navigate({ name: 'home' })}>Back to Home</Button>} />
      </div>
    )
  const { vendor, lines, pricing, eta } = cartQuote
  const closed = vendorStatus(vendor.id).state !== 'open'
  return (
    <div className="pb-4">
      <ScreenHeader title="Checkout" subtitle={vendor.name} onBack={back} />
      <div className="space-y-3 px-4 pt-3" data-tour="checkout-summary">
        <Card className="p-3.5">
          {pricing.fulfilment === 'delivery' ? (
            <button onClick={() => openSheet({ kind: 'area' })} className="flex w-full items-center gap-3 text-left">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-green-soft text-green-deep"><MapPin size={18} /></span>
              <span className="flex-1">
                <span className="block text-[11px] font-extrabold uppercase tracking-wide text-ink-3">Deliver to</span>
                <span className="block text-[14px] font-bold">{address}</span>
              </span>
              <span className="text-[12.5px] font-bold text-green">Change</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-green-soft text-green-deep"><MapPin size={18} /></span>
              <span>
                <span className="block text-[11px] font-extrabold uppercase tracking-wide text-ink-3">Pickup from</span>
                <span className="block text-[14px] font-bold">{vendor.address}</span>
              </span>
            </div>
          )}
          <div className="mt-3"><FulfilmentToggle /></div>
        </Card>

        <Card className="p-3.5">
          <div className="mb-2 text-[13.5px] font-extrabold">{vendor.name}</div>
          <ul className="space-y-1.5 text-[13.5px]">
            {lines.map((l) => (
              <li key={l.item.id} className="flex justify-between gap-3">
                <span><b className="tnum">{l.qty}×</b> {l.item.name}</span>
                <span className="tnum font-semibold">{naira(l.item.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="my-3 border-t border-line" />
          <BreakdownRows p={pricing} />
          {pricing.chowpassSaving > 0 && <div className="mt-2 rounded-lg bg-green-soft px-2.5 py-1.5 text-[12px] font-bold text-green-deep">Chowpass saves you {naira(pricing.chowpassSaving)} on delivery (demo)</div>}
        </Card>

        {eta && (
          <Card className="flex items-center gap-3 p-3.5">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-yellow text-[#5c4300]"><Clock size={18} /></span>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-ink-3">Promised {pricing.fulfilment === 'pickup' ? 'ready time' : 'delivery'}</div>
              <div className="text-[14px] font-bold">
                {etaLabel(eta)} · {formatClock(minuteOfDay + eta[0])}–{formatClock(minuteOfDay + eta[1])}
              </div>
              <div className="text-[11px] text-ink-3">Frozen when you place the order — tracking uses this window.</div>
            </div>
          </Card>
        )}

        <Card className="p-3.5">
          <h2 className="mb-2 text-[13.5px] font-extrabold">Payment method</h2>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method (simulated)">
            {METHODS.map((m) => {
              const Icon = m.icon
              const on = method === m.id
              return (
                <button key={m.id} role="radio" aria-checked={on} onClick={() => setMethod(m.id)} className={`rounded-[14px] border p-2.5 text-left transition ${on ? 'border-green bg-green-soft' : 'border-line bg-white'}`}>
                  <Icon size={18} className={on ? 'text-green-deep' : 'text-ink-2'} />
                  <div className="mt-1.5 text-[13px] font-extrabold">{m.label}</div>
                  <div className="text-[10.5px] leading-tight text-ink-3">{m.sub}</div>
                </button>
              )
            })}
          </div>
        </Card>

        <div className="flex items-start gap-2 rounded-xl bg-cream px-3 py-2.5 text-[12.5px] font-semibold text-[#9b2f15]">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>Demo checkout — no real payment will be processed. No restaurant receives this order.</span>
        </div>
      </div>
      <div className="sticky bottom-0 z-10 mt-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur">
        <Button size="lg" className="w-full justify-between !px-5" disabled={closed} onClick={() => placeOrder(method)} data-tour="checkout-place">
          <span>{closed ? 'Vendor closed' : 'Place order'}</span>
          <span className="tnum">{naira(pricing.total)}</span>
        </Button>
      </div>
    </div>
  )
}
