import { BadgeCheck, Clock, MapPin, ShoppingBag, Star, Tag } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useApp } from '../app/AppProvider'
import { VENDORS, distanceTo, getArea, getVendor, isOrderable } from '../data/dataAccess'
import { FoodIllustration } from '../components/FoodIllustration'
import { MenuItemCard } from '../components/MenuItemCard'
import { VendorCard, vendorEmoji } from '../components/VendorCard'
import { Badge, EmptyState, ScreenHeader } from '../components/ui'
import { etaLabel, km, naira } from '../lib/formatting'
import { vendorMeta } from '../lib/quote'

export function VendorScreen({ id, highlight }: { id: string; highlight?: string }) {
  const { back, navigate, areaId, fulfilment, chowpass, vendorStatus, cart, cartQuote } = useApp()
  const v = getVendor(id)

  const sections = useMemo(() => {
    const map = new Map<string, NonNullable<typeof v>['items']>()
    for (const it of v?.items ?? []) map.set(it.section, [...(map.get(it.section) ?? []), it])
    return [...map.entries()]
  }, [v])

  useEffect(() => {
    if (!highlight) return
    const t = window.setTimeout(() => document.querySelector('[data-tour="bella-pick"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120)
    return () => window.clearTimeout(t)
  }, [highlight])

  if (!v) return <EmptyState emoji="🤷🏾" title="Vendor not found" body="This link doesn't match a vendor in the demo dataset." />

  const status = vendorStatus(v.id)
  const closed = status.state === 'closed'
  const meta = vendorMeta(v, areaId, fulfilment, chowpass)
  const area = getArea(areaId)
  const openAlt = closed
    ? VENDORS.filter((o) => o.id !== v.id && isOrderable(o) && vendorStatus(o.id).state === 'open').sort((a, b) => (distanceTo(a, area) ?? 99) - (distanceTo(b, area) ?? 99))[0]
    : undefined
  const myCart = cart.vendorId === v.id && cartQuote

  return (
    <div className="pb-6">
      <ScreenHeader
        title={v.name}
        subtitle={v.address ?? 'Location not yet supplied'}
        onBack={back}
        right={
          <button onClick={() => navigate({ name: 'cart' })} aria-label="Cart" className="grid h-10 w-10 place-items-center rounded-full hover:bg-bg">
            <ShoppingBag size={19} />
          </button>
        }
      />
      <div className="px-4 pt-3">
        <FoodIllustration emoji={vendorEmoji(v)} seed={v.brand} size="xl" dim={closed} />
        <div className="mt-3 flex items-center gap-1.5">
          <h2 className="text-[21px] font-extrabold tracking-tight">{v.brand}</h2>
          {v.verified && <BadgeCheck size={18} className="fill-green text-white" aria-label="Verified demo listing" />}
        </div>
        <div className="text-[13px] font-semibold text-ink-2">{v.branch ?? 'Branch not yet supplied'}</div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
          {closed && <Badge tone="dark">CLOSED · Opens {status.opensAt}</Badge>}
          {status.state === 'open' && <Badge tone="green">OPEN · until {status.closesAt}</Badge>}
          {status.state === 'unknown' && <Badge tone="grey">Hours not supplied</Badge>}
          {v.rating != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold shadow-[var(--shadow-card)]">
              <Star size={12} className="fill-[#F5B301] text-[#F5B301]" aria-hidden /> {v.rating.toFixed(1)} {v.ratingCount && <span className="text-ink-3">({v.ratingCount})</span>}
            </span>
          )}
          {meta.eta && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold shadow-[var(--shadow-card)]">
              <Clock size={12} aria-hidden /> {etaLabel(meta.eta)}
            </span>
          )}
          {meta.fee != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold shadow-[var(--shadow-card)]">
              🛵 {meta.fee === 0 ? 'Free' : `${naira(meta.fee)} est.`}
            </span>
          )}
          {meta.km != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold shadow-[var(--shadow-card)]">
              <MapPin size={12} aria-hidden /> {km(meta.km)} from {area.short}
            </span>
          )}
        </div>
        {v.promo.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {v.promo.map((p) => (
              <span key={p} className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-[12px] font-bold text-orange ring-1 ring-[#f8ddd4]">
                <Tag size={12} aria-hidden /> {p}
              </span>
            ))}
            <span className="self-center text-[10.5px] text-ink-3">Supplied promo names · terms not verified</span>
          </div>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-ink-3">{v.provenance}</p>
      </div>

      {closed && (
        <div className="mx-4 mt-4 rounded-[16px] bg-[#f0f2f1] p-3">
          <p className="text-[13px] font-semibold text-ink-2">This branch is closed right now, so items can't be added.</p>
          {openAlt && (
            <div className="mt-2.5">
              <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-3">Open alternative</div>
              <VendorCard v={openAlt} compact />
            </div>
          )}
        </div>
      )}

      {!isOrderable(v) ? (
        <EmptyState emoji="📝" title="Menu data coming soon" body="This vendor is listed, but its menu hasn't been added to this portfolio demo yet. We don't invent meals or prices." action={<button onClick={() => navigate({ name: 'bella' })} className="h-10 rounded-full bg-green px-4 text-[13.5px] font-bold text-white">Ask Bella for an alternative</button>} />
      ) : (
        <div className="space-y-5 px-4 pt-5">
          {sections.map(([section, items]) => (
            <section key={section} aria-labelledby={`sec-${section}`}>
              <h3 id={`sec-${section}`} className="mb-2.5 text-[16px] font-extrabold">{section}</h3>
              <div className="grid gap-3">
                {items.map((it) => (
                  <MenuItemCard key={it.id} item={it} bellaPick={it.id === highlight} disabled={closed} />
                ))}
              </div>
            </section>
          ))}
          <p className="text-center text-[11px] text-ink-3">All prices approximate reference data from the portfolio brief.</p>
        </div>
      )}

      {myCart && (
        <div className="sticky bottom-3 z-10 mt-4 px-4">
          <button onClick={() => navigate({ name: 'cart' })} className="anim-fade-up flex h-[52px] w-full items-center justify-between rounded-full bg-green-deep px-5 text-white shadow-[0_8px_20px_rgb(1_76_50/0.35)]">
            <span className="text-[13.5px] font-bold">View cart · {myCart.pricing.units} item{myCart.pricing.units === 1 ? '' : 's'}</span>
            <span className="tnum text-[14.5px] font-extrabold">{naira(myCart.pricing.total)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
