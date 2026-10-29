import { ChevronDown, Search, ShoppingBag, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../app/AppProvider'
import { CATEGORIES, VENDORS, distanceTo, getArea, isOrderable } from '../data/dataAccess'
import type { Vendor } from '../data/types'
import { VendorCard } from '../components/VendorCard'
import { Chip, EmptyState } from '../components/ui'
import { DisclosureFooter } from '../components/DisclosureFooter'

function matchesCategory(v: Vendor, c: string) {
  if (c === 'All') return true
  if (v.categories.includes(c)) return true
  if (c === 'Burgers') return v.items.some((i) => i.tags.includes('burger'))
  return false
}

export function sortVendors(list: Vendor[], areaId: string, isOpen: (v: Vendor) => boolean) {
  const area = getArea(areaId)
  return [...list].sort((a, b) => {
    const rank = (v: Vendor) => (isOrderable(v) ? (isOpen(v) ? 0 : 1) : 2)
    return rank(a) - rank(b) || (distanceTo(a, area) ?? 999) - (distanceTo(b, area) ?? 999) || a.name.localeCompare(b.name)
  })
}

export function HomeScreen() {
  const { address, openSheet, navigate, cart, areaId, vendorStatus } = useApp()
  const [cat, setCat] = useState<string>('All')
  const units = cart.lines.reduce((s, l) => s + l.qty, 0)
  const vendors = useMemo(
    () => sortVendors(VENDORS.filter((v) => matchesCategory(v, cat)), areaId, (v) => vendorStatus(v.id).state === 'open'),
    [cat, areaId, vendorStatus],
  )

  return (
    <div className="pb-6">
      <header className="flex items-center gap-3 px-4 pb-3 pt-[calc(12px+var(--phone-top,0px))]">
        <button onClick={() => openSheet({ kind: 'area' })} className="min-w-0 flex-1 text-left" aria-label={`Delivery to ${address}. Change area`} data-tour="area-picker">
          <div className="text-[10.5px] font-extrabold tracking-[0.12em] text-ink-3">DELIVERY TO</div>
          <div className="flex items-center gap-1">
            <span className="truncate text-[15.5px] font-extrabold">{address}</span>
            <ChevronDown size={18} className="shrink-0 text-green" strokeWidth={2.6} />
          </div>
        </button>
        <button onClick={() => navigate({ name: 'cart' })} className="relative grid h-10 w-10 place-items-center rounded-full bg-white shadow-[var(--shadow-card)]" aria-label={`Cart, ${units} items`}>
          <ShoppingBag size={19} />
          {units > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-orange px-1 text-[10.5px] font-extrabold text-white">{units}</span>}
        </button>
        <button onClick={() => navigate({ name: 'account' })} className="grid h-10 w-10 place-items-center rounded-full bg-green-deep text-[14px] font-extrabold text-yellow" aria-label="Account">
          T
        </button>
      </header>

      <div className="px-4">
        <button onClick={() => navigate({ name: 'search' })} className="flex h-12 w-full items-center gap-2.5 rounded-full bg-white px-4 text-left text-[14px] text-ink-3 shadow-[var(--shadow-card)]" aria-label="Search restaurants, meals, cravings">
          <Search size={18} className="text-ink-2" />
          Restaurants, meals, cravings...
        </button>
      </div>

      <div className="px-4 pt-4">
        <button
          data-tour="bella-banner"
          onClick={() => navigate({ name: 'bella' })}
          className="relative w-full overflow-hidden rounded-[20px] bg-green-deep p-4 text-left text-white shadow-[0_10px_24px_rgb(1_76_50/0.25)] transition duration-200 hover:brightness-110"
        >
          <span className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-green/60" aria-hidden />
          <span className="absolute -bottom-10 right-12 h-20 w-20 rounded-full bg-yellow/15" aria-hidden />
          <span className="absolute right-4 top-4 text-[34px]" aria-hidden>🍲</span>
          <span className="relative block max-w-[78%] text-[17px] font-extrabold leading-snug">✨ Not sure what to eat? Ask Bella</span>
          <span className="relative mt-1.5 block max-w-[82%] text-[12.5px] leading-relaxed text-white/80">Tell Bella your budget, location and craving. She'll find your next meal.</span>
          <span className="anim-pulse relative mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-yellow px-4 text-[13px] font-extrabold text-green-deep">
            <Sparkles size={14} /> Ask Bella
          </span>
        </button>
      </div>

      <div className="px-4 pt-3">
        <button onClick={() => navigate({ name: 'search', q: 'jollof' })} className="flex w-full items-center gap-3 rounded-[16px] bg-cream px-3.5 py-3 text-left ring-1 ring-[#f8ddd4]">
          <span className="text-[26px]" aria-hidden>🍛</span>
          <span className="flex-1">
            <span className="block text-[14px] font-extrabold text-orange">Up to 20% off party jollof</span>
            <span className="block text-[11px] text-ink-3">Illustrative promo placement · not a live offer</span>
          </span>
          <span className="rounded-full bg-orange px-2.5 py-1 text-[11px] font-extrabold text-white">See</span>
        </button>
      </div>

      <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto px-4 pb-1" role="toolbar" aria-label="Categories">
        {CATEGORIES.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>

      <section className="px-4 pt-4" aria-labelledby="popular">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 id="popular" className="text-[18px] font-extrabold tracking-tight">{cat === 'All' ? 'Popular near you' : cat}</h2>
          <span className="text-[11.5px] text-ink-3">{vendors.length} places</span>
        </div>
        {vendors.length === 0 ? (
          <EmptyState emoji="🥤" title={`No ${cat.toLowerCase()} vendors yet`} body="This portfolio demo only includes supplied vendor data, so we won't invent results. Try another category or ask Bella." />
        ) : (
          <div className="grid gap-3">
            {vendors.map((v) => (
              <VendorCard key={v.id} v={v} />
            ))}
          </div>
        )}
      </section>
      <DisclosureFooter />
    </div>
  )
}
