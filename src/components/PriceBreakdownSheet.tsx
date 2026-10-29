import { useApp, type BreakdownSource } from '../app/AppProvider'
import { PRICING } from '../lib/config'
import { etaLabel, km, naira } from '../lib/formatting'
import { quote } from '../lib/quote'
import type { PriceBreakdown } from '../lib/pricing'
import { Sheet } from './Sheet'
import { Button } from './ui'

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition duration-200 ${checked ? 'bg-green' : 'bg-[#d5dcd9]'}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-200 ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

export function BreakdownRows({ p, deliveryLabel, foodLabel = 'Food' }: { p: PriceBreakdown; deliveryLabel?: string; foodLabel?: string }) {
  return (
    <dl className="tnum space-y-2 text-[14px]">
      <Row k={foodLabel} v={naira(p.food)} />
      <Row k="Pack" v={naira(p.packaging)} />
      <Row
        k={deliveryLabel ?? (p.fulfilment === 'pickup' ? 'Delivery (pickup)' : 'Delivery')}
        v={
          p.chowpassSaving > 0 ? (
            <span>
              <s className="mr-1.5 text-ink-3">{naira(p.deliveryBeforePass)}</s>
              <span className="font-bold text-green">₦0</span>
            </span>
          ) : (
            naira(p.delivery)
          )
        }
      />
      <Row k="Service fee" v={naira(p.service)} />
      <div className="my-1 border-t border-dashed border-line" />
      <div className="flex items-center justify-between text-[17px] font-extrabold">
        <dt>Total</dt>
        <dd className="text-green">{naira(p.total)} <span className="text-[12px] font-bold text-ink-3">approx.</span></dd>
      </div>
    </dl>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-2">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  )
}

export function PriceBreakdownSheet({ source }: { source: BreakdownSource }) {
  const { fulfilment, chowpass, setChowpass, closeSheet } = useApp()
  const q = quote(source.vendorId, source.lines, source.areaId, fulfilment, chowpass)
  if (!q) return null
  const p = q.pricing
  return (
    <Sheet title="Price breakdown" onClose={closeSheet} tourId="breakdown-sheet" footer={<Button size="lg" className="w-full" onClick={closeSheet}>Got it</Button>}>
      <p className="sr-only">
        {`Estimated total ${naira(p.total)}: food ${naira(p.food)}, pack ${naira(p.packaging)}, delivery ${naira(p.delivery)}, service fee ${naira(p.service)}.`}
      </p>
      <div className="mb-3 rounded-xl bg-bg px-3 py-2 text-[12.5px] text-ink-2">
        <b className="text-ink">{source.title}</b> · {q.vendor.name} · {km(q.distanceKm)} away{q.eta ? ` · ${etaLabel(q.eta)}` : ''}
      </div>
      <BreakdownRows p={p} />
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line p-3">
        <div>
          <div className="text-[14px] font-bold">Chowpass</div>
          <div className="text-[11.5px] leading-snug text-ink-2">Free delivery on this simulated order. Demo toggle — no membership is bought (illustrative {naira(PRICING.chowpass.illustrativeMonthlyPrice)}/mo).</div>
        </div>
        <Switch checked={chowpass} onChange={setChowpass} label="Chowpass free delivery" />
      </div>
      <p className="mt-4 text-[15px] font-extrabold text-green-deep">No surprises at checkout.</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
        Same numbers on your card, cart and checkout. Demo assumptions: pack {naira(PRICING.packaging.min)}–{naira(PRICING.packaging.max)} per order, delivery {naira(PRICING.delivery.base)} + {naira(PRICING.delivery.perKm)}/km straight-line (cap {naira(PRICING.delivery.cap)}), service {Math.round(PRICING.service.rate * 100)}% of food (cap {naira(PRICING.service.cap)}). Not Chowdeck tariffs. Menu prices are approximate.
      </p>
    </Sheet>
  )
}
