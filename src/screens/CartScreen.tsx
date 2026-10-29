import { Clock, Plus } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import { CartItem } from '../components/CartItem'
import { FulfilmentToggle } from '../components/FulfilmentToggle'
import { BreakdownRows, Switch } from '../components/PriceBreakdownSheet'
import { Button, Card, EmptyState, ScreenHeader } from '../components/ui'
import { etaLabel, naira } from '../lib/formatting'

export function CartScreen() {
  const { cart, cartQuote, back, navigate, openSheet, clearCart, setNote, chowpass, setChowpass, vendorStatus } = useApp()

  if (!cartQuote || !cartQuote.lines.length)
    return (
      <div>
        <ScreenHeader title="Cart" onBack={back} />
        <EmptyState emoji="🛍️" title="Your cart is empty" body="Find something you'll love — or let Bella pick for you in seconds." action={<div className="flex gap-2"><Button variant="outline" onClick={() => navigate({ name: 'home' })}>Browse</Button><Button onClick={() => navigate({ name: 'bella' })}>Ask Bella</Button></div>} />
      </div>
    )

  const { vendor, lines, pricing, eta } = cartQuote
  const closed = vendorStatus(vendor.id).state !== 'open'
  return (
    <div className="pb-4">
      <ScreenHeader title="Cart" onBack={back} />
      <div className="space-y-3 px-4 pt-3">
        <Card className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10.5px] font-extrabold tracking-[0.12em] text-ink-3">YOUR CART FROM</div>
              <div className="text-[16px] font-extrabold uppercase tracking-tight">{vendor.name}</div>
            </div>
            <button
              onClick={() => openSheet({ kind: 'confirm', title: 'Clear cart?', body: `Remove all ${pricing.units} items from ${vendor.name}?`, confirmLabel: 'Clear Cart', onConfirm: clearCart })}
              className="rounded-full px-2.5 py-1 text-[12.5px] font-bold text-orange hover:bg-cream"
            >
              Clear Cart
            </button>
          </div>
          {cart.bellaContext && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-soft px-2.5 py-1 text-[11.5px] font-bold text-green-deep">
              ✨ Picked with Bella{cart.bellaContext.group ? ' · group order' : ''}
            </div>
          )}
          <ul className="mt-1 divide-y divide-line">
            {lines.map((l) => (
              <CartItem key={l.item.id} item={l.item} qty={l.qty} />
            ))}
          </ul>
          <button onClick={() => navigate({ name: 'vendor', id: vendor.id })} className="mt-1 inline-flex items-center gap-1 text-[13px] font-bold text-green">
            <Plus size={15} strokeWidth={2.8} /> Add more items
          </button>
        </Card>

        <Card className="p-3.5">
          <label htmlFor="vendor-note" className="text-[13.5px] font-bold">Leave a note for the vendor</label>
          <textarea id="vendor-note" value={cart.note} onChange={(e) => setNote(e.target.value)} maxLength={140} rows={2} placeholder="e.g. Extra pepper, please" className="mt-2 w-full resize-none rounded-xl border border-line px-3 py-2 text-[14px] outline-none focus:border-green" />
          <div className="text-right text-[11px] text-ink-3">{cart.note.length}/140 · don't include personal or payment details</div>
        </Card>

        <Card className="space-y-3 p-3.5">
          <FulfilmentToggle />
          <BreakdownRows p={pricing} foodLabel="Subtotal" />
          <div className="flex items-center justify-between gap-3 rounded-xl bg-bg p-2.5">
            <span className="text-[12.5px] font-semibold">Chowpass free delivery <span className="text-ink-3">(demo)</span></span>
            <Switch checked={chowpass} onChange={setChowpass} label="Chowpass free delivery" />
          </div>
          {eta && (
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-green-deep">
              <Clock size={14} aria-hidden /> {pricing.fulfilment === 'pickup' ? `Ready for pickup in ${etaLabel(eta)}` : `Estimated arrival ${etaLabel(eta)}`}
            </div>
          )}
        </Card>
      </div>
      <div className="sticky bottom-0 z-10 mt-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur">
        <Button size="lg" className="w-full justify-between !px-5" disabled={closed} onClick={() => navigate({ name: 'checkout' })} data-tour="cart-continue">
          <span>{closed ? 'Vendor closed' : 'Continue to checkout'}</span>
          <span className="tnum">{naira(pricing.total)}</span>
        </Button>
      </div>
    </div>
  )
}
