import { AlertTriangle, ArrowLeftRight, Clock, Plus, Star } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import type { BellaIntent, Recommendation } from '../bella/types'
import { etaLabel, naira } from '../lib/formatting'
import { FoodIllustration } from './FoodIllustration'

const TAG_STYLE: Record<string, string> = {
  'Best match': 'bg-green-deep text-white',
  Cheapest: 'bg-orange text-white',
  Fastest: 'bg-yellow text-[#5c4300]',
  'Closest option': 'bg-[#FDE3DA] text-[#9b2f15]',
}

export function RecommendationCard({ rec, intent, msgId, first, onSwap }: { rec: Recommendation; intent: BellaIntent; msgId: string; first?: boolean; onSwap?: () => void }) {
  const { addToCart, openSheet, navigate, cart } = useApp()
  const inCart = cart.vendorId === rec.vendor.id && cart.lines.some((l) => l.itemId === rec.item.id)
  const fees = rec.pricing.total - rec.pricing.food
  const over = !rec.withinBudget && intent.budget != null
  return (
    <article className="anim-fade-up overflow-hidden rounded-[16px] bg-white shadow-[var(--shadow-card)]" aria-label={`${rec.item.name} from ${rec.vendor.name}`} data-msg={msgId}>
      <div className="flex gap-3 p-3 pb-2">
        <FoodIllustration emoji={rec.item.emoji} seed={rec.item.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-extrabold leading-snug">{rec.item.name}</h3>
            {rec.tag && (
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${TAG_STYLE[rec.tag] ?? 'bg-green-soft text-green-deep'}`}>
                {rec.tag}
              </span>
            )}
          </div>
          <button onClick={() => navigate({ name: 'vendor', id: rec.vendor.id, highlight: rec.item.id })} className="mt-0.5 text-left text-[12.5px] font-semibold text-ink-2 underline-offset-2 hover:underline">
            {rec.vendor.brand} · {rec.vendor.branch}
          </button>
          {rec.vendor.rating != null && (
            <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-2">
              <Star size={11} className="fill-[#F5B301] text-[#F5B301]" aria-hidden />
              {rec.vendor.rating.toFixed(1)} {rec.vendor.ratingCount && `(${rec.vendor.ratingCount})`}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 px-3">
        <div data-tour={first ? 'rec-price' : undefined} className="rounded-xl">
          <div className="tnum text-[22px] font-extrabold leading-none tracking-tight text-green" aria-label={`All-in estimated total ${naira(rec.pricing.total)}`}>
            {naira(rec.pricing.total)} <span className="text-[12px] font-bold text-ink-3">approx.</span>
          </div>
          <div className="mt-1 text-[11.5px] text-ink-2">
            Food {naira(rec.pricing.food)} + est. fees {naira(fees)} ·{' '}
            <button
              onClick={() =>
                openSheet({ kind: 'breakdown', source: { title: rec.item.name, vendorId: rec.vendor.id, lines: [{ itemId: rec.item.id, qty: 1 }], areaId: intent.area ?? rec.vendor.area ?? 'yaba', recId: rec.id } })
              }
              className="font-bold text-green underline underline-offset-2"
              data-tour={first ? 'rec-breakdown' : undefined}
            >
              See breakdown
            </button>
          </div>
        </div>
        <div
          data-tour={first ? 'rec-eta' : undefined}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${rec.etaFit === 'tight' ? 'bg-yellow text-[#5c4300]' : 'bg-green-soft text-green-deep'}`}
        >
          <Clock size={13} aria-hidden /> {etaLabel(rec.eta)}
          {rec.etaFit === 'tight' && <span className="font-semibold">· tight</span>}
        </div>
      </div>

      <p className="px-3 pt-2 text-[12.5px] leading-relaxed text-ink">{rec.reason}</p>
      {(over || rec.dietUnverified.length > 0) && (
        <div className="mx-3 mt-2 flex items-start gap-1.5 rounded-lg bg-cream px-2.5 py-1.5 text-[11.5px] font-semibold text-[#9b2f15]">
          <AlertTriangle size={13} className="mt-px shrink-0" aria-hidden />
          <span>
            {over && `Over your budget by ${naira(rec.overBudgetBy)}. `}
            {rec.dietUnverified.includes('no-pork') && 'Pork-free not verified — no ingredient data. '}
            {rec.dietUnverified.includes('vegetarian') && 'Vegetarian not verified — no ingredient data.'}
          </span>
        </div>
      )}

      <div className="flex gap-2 p-3">
        <button
          onClick={() => addToCart(rec.item.id, { source: 'bella', rec, intent })}
          data-tour={first ? 'rec-add' : undefined}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-green text-[13.5px] font-bold text-white transition hover:bg-[#027a51] active:scale-[0.98]"
        >
          <Plus size={16} strokeWidth={2.8} /> {inCart ? 'Add another' : 'Add to cart'}
        </button>
        {onSwap && (
          <button onClick={onSwap} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-[13.5px] font-bold text-ink transition hover:border-green/40">
            <ArrowLeftRight size={15} /> Swap
          </button>
        )}
      </div>
    </article>
  )
}
