import { BadgeCheck, Star, Tag } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import type { Vendor } from '../data/types'
import { etaLabel, naira } from '../lib/formatting'
import { vendorMeta } from '../lib/quote'
import { isOrderable } from '../data/dataAccess'
import { Badge } from './ui'
import { FoodIllustration } from './FoodIllustration'

export function vendorEmoji(v: Vendor) {
  if (v.items[0]) return v.items[0].emoji
  if (v.categories.includes('Pizza')) return '🍕'
  if (v.keywords.includes('suya')) return '🍢'
  if (v.keywords.includes('amala')) return '🥣'
  if (v.keywords.includes('jollof')) return '🍛'
  if (v.categories.includes('Desserts')) return '🍨'
  if (v.categories.includes('Parfait')) return '🍓'
  return '🍲'
}

export function VendorMetaLine({ v }: { v: Vendor }) {
  const { areaId, fulfilment, chowpass } = useApp()
  const m = vendorMeta(v, areaId, fulfilment, chowpass)
  const bits: string[] = []
  if (m.fee != null) bits.push(m.fee === 0 ? (fulfilment === 'pickup' ? 'Pickup' : 'Free delivery') : naira(m.fee))
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-ink-2">
      {bits.map((b) => (
        <span key={b} className="font-semibold text-ink">{b}</span>
      ))}
      {v.rating != null && (
        <>
          {bits.length > 0 && <span aria-hidden>·</span>}
          <span className="inline-flex items-center gap-0.5">
            <Star size={12} className="fill-[#F5B301] text-[#F5B301]" aria-hidden />
            <span className="font-semibold text-ink">{v.rating.toFixed(1)}</span>
            {v.ratingCount && <span>({v.ratingCount})</span>}
          </span>
        </>
      )}
      {m.eta && (
        <>
          <span aria-hidden>·</span>
          <span>{etaLabel(m.eta)}</span>
        </>
      )}
    </div>
  )
}

export function VendorCard({ v, compact = false }: { v: Vendor; compact?: boolean }) {
  const { navigate, vendorStatus } = useApp()
  const status = vendorStatus(v.id)
  const orderable = isOrderable(v)
  const closed = status.state === 'closed'
  return (
    <button
      onClick={() => navigate({ name: 'vendor', id: v.id })}
      className={`group w-full overflow-hidden rounded-[16px] bg-white text-left shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 ${compact ? 'flex items-center gap-3 p-2.5' : ''}`}
      aria-label={`${v.name}${closed ? ', closed' : ''}${!orderable ? ', menu data coming soon' : ''}`}
    >
      <div className={compact ? 'w-16 shrink-0' : 'relative'}>
        <FoodIllustration emoji={vendorEmoji(v)} seed={v.brand} size={compact ? 'sm' : 'lg'} dim={closed} className={compact ? '' : 'rounded-b-none'} />
        {!compact && (
          <div className="absolute left-2.5 top-2.5 flex gap-1.5">
            {closed && <Badge tone="dark">CLOSED · Opens {status.opensAt}</Badge>}
            {status.state === 'open' && <Badge tone="green">OPEN</Badge>}
            {!orderable && <Badge tone="grey">Menu coming soon</Badge>}
          </div>
        )}
        {!compact && v.promo[0] && (
          <div className="absolute bottom-2 left-2.5 inline-flex max-w-[90%] items-center gap-1 rounded-full bg-orange px-2 py-0.5 text-[10.5px] font-bold text-white">
            <Tag size={11} aria-hidden /> <span className="truncate">{v.promo[0]}</span>
          </div>
        )}
      </div>
      <div className={compact ? 'min-w-0 flex-1' : 'px-3 pb-3 pt-2.5'}>
        <div className="flex items-center gap-1">
          <span className={`truncate text-[14.5px] font-extrabold ${closed ? 'text-ink-2' : ''}`}>{v.name}</span>
          {v.verified && <BadgeCheck size={15} className="shrink-0 fill-green text-white" aria-label="Verified demo listing" />}
        </div>
        {compact && closed && <div className="text-[11.5px] font-bold text-ink-2">CLOSED · Opens {status.opensAt}</div>}
        {compact && !orderable && <div className="text-[11.5px] font-semibold text-ink-3">Menu data coming soon</div>}
        <VendorMetaLine v={v} />
      </div>
    </button>
  )
}
