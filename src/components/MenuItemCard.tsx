import { Plus, Sparkles } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import type { MenuItem } from '../data/types'
import { naira } from '../lib/formatting'
import { FoodIllustration } from './FoodIllustration'
import { Stepper } from './ui'

export function MenuItemCard({ item, bellaPick, disabled }: { item: MenuItem; bellaPick?: boolean; disabled?: boolean }) {
  const { cart, addToCart, setQty } = useApp()
  const line = cart.vendorId === item.vendorId ? cart.lines.find((l) => l.itemId === item.id) : undefined
  return (
    <div className={`relative flex gap-3 rounded-[16px] bg-white p-3 shadow-[var(--shadow-card)] ${bellaPick ? 'ring-2 ring-green' : ''}`} data-tour={bellaPick ? 'bella-pick' : undefined}>
      {bellaPick && (
        <span className="absolute -top-2 left-3 inline-flex items-center gap-1 rounded-full bg-green px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide text-white shadow">
          <Sparkles size={11} aria-hidden /> Bella's pick
        </span>
      )}
      <FoodIllustration emoji={item.emoji} seed={item.name} size="md" dim={disabled} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h4 className="text-[14.5px] font-bold leading-snug">{item.name}</h4>
        <div className="mt-0.5 text-[11.5px] text-ink-3">{item.section}</div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <div className="tnum text-[15px] font-extrabold text-green">
              {naira(item.price)} <span className="text-[11px] font-semibold text-ink-3">approx.</span>
            </div>
            {item.previousPrice && (
              <div className="text-[10.5px] text-ink-3">
                <s>{naira(item.previousPrice)}</s> · historical reference, not verified
              </div>
            )}
          </div>
          {line ? (
            <Stepper qty={line.qty} label={item.name} onChange={(n) => setQty(item.id, n)} disabled={disabled} />
          ) : (
            <button
              disabled={disabled}
              onClick={() => addToCart(item.id, { source: 'menu' })}
              aria-label={`Add ${item.name}`}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-green px-3.5 text-[13px] font-bold text-white transition hover:bg-[#027a51] disabled:bg-[#c9d3cf]"
            >
              <Plus size={15} strokeWidth={2.8} /> Add
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
