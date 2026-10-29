import { Search, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../app/AppProvider'
import { VENDORS, isOrderable } from '../data/dataAccess'
import { VendorCard } from '../components/VendorCard'
import { FoodIllustration } from '../components/FoodIllustration'
import { naira } from '../lib/formatting'
import { sortVendors } from './HomeScreen'

const SUGGESTED = ['spicy', 'burger', 'breakfast', 'jollof', 'suya', 'pizza', 'chicken', 'combo']

export function SearchScreen({ initial }: { initial?: string }) {
  const { navigate, submitPrompt, areaId, vendorStatus } = useApp()
  const [q, setQ] = useState(initial ?? '')
  const term = q.trim().toLowerCase()

  const { vendors, items } = useMemo(() => {
    if (!term) return { vendors: [], items: [] }
    const words = term.split(/\s+/)
    const has = (s: string) => words.every((w) => s.includes(w))
    const vendors = sortVendors(
      VENDORS.filter((v) => has(`${v.name} ${v.categories.join(' ')} ${v.keywords.join(' ')}`.toLowerCase())),
      areaId,
      (v) => vendorStatus(v.id).state === 'open',
    )
    const seen = new Set<string>()
    const items = VENDORS.filter(isOrderable)
      .flatMap((v) => v.items.map((i) => ({ i, v })))
      .filter(({ i }) => words.some((w) => `${i.name} ${i.section} ${i.tags.join(' ')}`.toLowerCase().includes(w)))
      .filter(({ v, i }) => {
        const k = `${v.brand}:${i.slug}`
        if (seen.has(k) || v.area !== areaId) return false
        seen.add(k)
        return true
      })
    return { vendors, items }
  }, [term, areaId, vendorStatus])

  const askBella = () => {
    navigate({ name: 'bella' })
    void submitPrompt(q, 'home')
  }

  return (
    <div className="pb-6">
      <div className="sticky top-0 z-20 bg-bg px-4 pb-3 pt-[calc(12px+var(--phone-top,0px))]">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (term) askBella()
          }}
          className="flex h-12 items-center gap-2 rounded-full bg-white px-4 shadow-[var(--shadow-card)] focus-within:ring-2 focus-within:ring-green"
          role="search"
        >
          <Search size={18} className="text-ink-2" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Restaurants, meals, cravings..." aria-label="Search restaurants, meals, cravings" className="h-full flex-1 bg-transparent text-[15px] outline-none" maxLength={120} />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="grid h-7 w-7 place-items-center rounded-full bg-bg">
              <X size={14} />
            </button>
          )}
        </form>
      </div>

      {term && (
        <div className="px-4">
          <button onClick={askBella} className="flex w-full items-center gap-3 rounded-[16px] bg-green-deep p-3 text-left text-white">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15"><Sparkles size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-extrabold">Ask Bella: "{q.trim()}"</span>
              <span className="block text-[11.5px] text-white/75">Get ranked picks with the full estimated cost</span>
            </span>
          </button>
        </div>
      )}

      {!term && (
        <div className="px-4">
          <h2 className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-ink-3">Try searching</h2>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button key={s} onClick={() => setQ(s)} className="rounded-full border border-line bg-white px-3.5 py-2 text-[13px] font-semibold">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {term && items.length > 0 && (
        <section className="px-4 pt-5">
          <h2 className="mb-2 text-[15px] font-extrabold">Meals near {areaId === 'vi' ? 'VI' : 'you'}</h2>
          <ul className="grid gap-2">
            {items.slice(0, 8).map(({ i, v }) => (
              <li key={i.id}>
                <button onClick={() => navigate({ name: 'vendor', id: v.id, highlight: undefined })} className="flex w-full items-center gap-3 rounded-[14px] bg-white p-2.5 text-left shadow-[var(--shadow-card)]">
                  <FoodIllustration emoji={i.emoji} seed={i.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold">{i.name}</span>
                    <span className="block text-[12px] text-ink-2">{v.name}</span>
                  </span>
                  <span className="tnum text-[13.5px] font-extrabold text-green">{naira(i.price)}<span className="block text-right text-[10px] font-semibold text-ink-3">approx.</span></span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {term && (
        <section className="px-4 pt-5">
          <h2 className="mb-2 text-[15px] font-extrabold">Restaurants</h2>
          {vendors.length ? (
            <div className="grid gap-2.5">
              {vendors.map((v) => (
                <VendorCard key={v.id} v={v} compact />
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-white p-4 text-[13px] text-ink-2">
              No supplied vendors match "{q.trim()}". This demo only shows real supplied data — try asking Bella for alternatives.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
