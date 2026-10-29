import { Pencil } from 'lucide-react'
import { useApp, type PillField } from '../app/AppProvider'
import { getArea } from '../data/dataAccess'
import type { BellaIntent, Craving } from '../bella/types'
import { naira } from '../lib/formatting'

export const CRAVING_EMOJI: Record<Craving, string> = {
  spicy: '🌶', rice: '🍚', jollof: '🍛', swallow: '🥣', 'assorted meat': '🥩', chicken: '🍗', pizza: '🍕', healthy: '🥗',
  suya: '🍢', sweet: '🍨', drinks: '🥤', burger: '🍔', yam: '🍠', filling: '💪', pastry: '🥐',
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

type Pill = { field: PillField; label: string; key: string }

export function pillsFor(intent: BellaIntent, effectiveArea: string): Pill[] {
  const p: Pill[] = []
  if (intent.budget != null)
    p.push({ field: 'budget', key: 'budget', label: `💰 ${intent.budgetMode === 'per-person' ? `${naira(intent.budget)} each` : `Under ${naira(intent.budget)}`}` })
  else if (intent.priceFocus) p.push({ field: 'budget', key: 'budget', label: `💰 ${intent.priceFocus === 'cheapest' ? 'Cheapest' : 'Good value'}` })
  const a = getArea(effectiveArea)
  p.push({ field: 'area', key: 'area', label: `📍 ${a.short}${intent.areaDetail ? ` ${intent.areaDetail}` : ''}${intent.area ? '' : ' (your area)'}` })
  if (intent.maxMinutes != null) p.push({ field: 'time', key: 'time', label: `⏱ ${intent.maxMinutes} mins${intent.maxMinutesInferred ? ' (fast)' : ''}` })
  if (intent.people && intent.people > 1) p.push({ field: 'people', key: 'people', label: `👥 ${intent.people} people` })
  if (intent.mealTime) p.push({ field: 'cravings', key: 'meal', label: `${intent.mealTime === 'breakfast' ? '🍳' : intent.mealTime === 'late-night' ? '🌙' : '🍽'} ${cap(intent.mealTime.replace('-', ' '))}` })
  for (const c of intent.cravings) p.push({ field: 'cravings', key: `c-${c}`, label: `${CRAVING_EMOJI[c]} ${cap(c)}` })
  for (const d of intent.dietaryRestrictions) p.push({ field: 'diet', key: `d-${d}`, label: d === 'no-pork' ? '🚫 No pork' : '🥬 Vegetarian' })
  if (intent.fulfilment === 'pickup') p.push({ field: 'area', key: 'pickup', label: '🛍 Pickup' })
  return p
}

export function UnderstandingPills({ msgId, intent, tour }: { msgId: string; intent: BellaIntent; tour?: boolean }) {
  const { openSheet, areaId } = useApp()
  const pills = pillsFor(intent, intent.area ?? areaId)
  return (
    <div data-tour={tour ? 'intent-pills' : undefined} className="rounded-2xl bg-white/70 p-2.5 ring-1 ring-line">
      <div className="mb-1.5 px-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-ink-3">What I understood · tap to edit</div>
      <div className="flex flex-wrap gap-1.5">
        {pills.map((p) => (
          <button
            key={p.key}
            onClick={() => openSheet({ kind: 'pill', msgId, field: p.field })}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-yellow px-3 text-[12.5px] font-bold text-[#4d3800] transition hover:brightness-95"
            aria-label={`Edit: ${p.label}`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => openSheet({ kind: 'pill', msgId, field: intent.budget == null ? 'budget' : intent.maxMinutes == null ? 'time' : 'cravings' })}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-ink-3/50 px-3 text-[12.5px] font-bold text-ink-2 hover:border-green hover:text-green"
        >
          <Pencil size={12} aria-hidden /> Refine
        </button>
      </div>
    </div>
  )
}
