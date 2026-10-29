import { useState } from 'react'
import { useApp, type PillField } from '../app/AppProvider'
import { AREAS } from '../data/dataAccess'
import type { BellaIntent, Craving, Diet, MealTime } from '../bella/types'
import { naira } from '../lib/formatting'
import { Sheet } from './Sheet'
import { Button, Chip, Stepper } from './ui'
import { CRAVING_EMOJI } from './UnderstandingPills'

const FIELDS: { id: PillField; label: string }[] = [
  { id: 'budget', label: 'Budget' },
  { id: 'area', label: 'Area' },
  { id: 'time', label: 'Time' },
  { id: 'cravings', label: 'Cravings' },
  { id: 'people', label: 'People' },
  { id: 'diet', label: 'Diet' },
]

const CRAVINGS: Craving[] = ['spicy', 'chicken', 'burger', 'yam', 'filling', 'pastry', 'rice', 'jollof', 'swallow', 'assorted meat', 'pizza', 'suya', 'sweet', 'drinks', 'healthy']
const MEALS: MealTime[] = ['breakfast', 'lunch', 'dinner', 'late-night']

export function PillEditorSheet({ msgId, field }: { msgId: string; field: PillField }) {
  const { messages, updateIntent, closeSheet, areaId } = useApp()
  const msg = messages.find((m) => m.id === msgId)
  const original = msg && msg.role === 'bella' && msg.kind === 'result' ? msg.intent : null
  const [tab, setTab] = useState<PillField>(field)
  const [draft, setDraft] = useState<BellaIntent>(() => (original ? { ...original, cravings: [...original.cravings], dietaryRestrictions: [...original.dietaryRestrictions] } : { cravings: [], dietaryRestrictions: [] }))
  const [budgetText, setBudgetText] = useState(draft.budget ? String(draft.budget) : '')
  if (!original) return null

  const set = (patch: Partial<BellaIntent>) => setDraft((d) => ({ ...d, ...patch }))
  const apply = () => {
    const n = Number(budgetText.replace(/[^\d]/g, ''))
    const next: BellaIntent = { ...draft }
    if (budgetText.trim() === '') {
      delete next.budget
      delete next.budgetMode
    } else if (Number.isFinite(n) && n >= 200) {
      next.budget = Math.round(n)
      next.budgetMode = next.budgetMode ?? 'total'
    }
    next.groupOrder = (next.people ?? 1) >= 2
    next.spicy = next.cravings.includes('spicy') || undefined
    updateIntent(msgId, next)
    closeSheet()
  }
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const effectiveArea = draft.area ?? areaId

  return (
    <Sheet title="Tell Bella what to change" onClose={closeSheet} footer={<Button size="lg" className="w-full" onClick={apply}>Update results</Button>}>
      <div role="tablist" aria-label="Field" className="scrollbar-none -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1">
        {FIELDS.map((f) => (
          <Chip key={f.id} role="tab" aria-selected={tab === f.id} active={tab === f.id} onClick={() => setTab(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>

      {tab === 'budget' && (
        <div className="space-y-3">
          <label className="block text-[13px] font-bold" htmlFor="budget-input">
            {draft.budgetMode === 'per-person' ? 'Budget per person' : 'Total budget (all-in, including fees)'}
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-line px-3 focus-within:border-green">
            <span className="font-bold text-ink-2">₦</span>
            <input id="budget-input" inputMode="numeric" value={budgetText} onChange={(e) => setBudgetText(e.target.value.replace(/[^\d]/g, '').slice(0, 7))} placeholder="No budget" className="h-12 flex-1 bg-transparent text-[16px] font-bold outline-none" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[3000, 5000, 6000, 8000, 10000, 15000, 25000].map((v) => (
              <Chip key={v} active={budgetText === String(v)} onClick={() => setBudgetText(String(v))}>
                {naira(v)}
              </Chip>
            ))}
            <Chip active={budgetText === ''} onClick={() => setBudgetText('')}>No budget</Chip>
          </div>
          {(draft.people ?? 1) > 1 && (
            <div className="flex gap-1.5">
              <Chip active={draft.budgetMode !== 'per-person'} onClick={() => set({ budgetMode: 'total' })}>Total for group</Chip>
              <Chip active={draft.budgetMode === 'per-person'} onClick={() => set({ budgetMode: 'per-person' })}>Per person</Chip>
            </div>
          )}
        </div>
      )}

      {tab === 'area' && (
        <div className="grid grid-cols-3 gap-1.5">
          {AREAS.map((a) => (
            <Chip key={a.id} active={effectiveArea === a.id} onClick={() => set({ area: a.id, areaDetail: undefined, nearMe: false })} className="justify-center">
              {a.short}
            </Chip>
          ))}
          <div className="col-span-3 mt-2 flex gap-1.5">
            <Chip active={draft.fulfilment !== 'pickup'} onClick={() => set({ fulfilment: undefined })}>🛵 Delivery</Chip>
            <Chip active={draft.fulfilment === 'pickup'} onClick={() => set({ fulfilment: 'pickup' })}>🛍 Pickup (no delivery fee)</Chip>
          </div>
        </div>
      )}

      {tab === 'time' && (
        <div className="flex flex-wrap gap-1.5">
          {[30, 40, 45, 60, 90].map((m) => (
            <Chip key={m} active={draft.maxMinutes === m} onClick={() => set({ maxMinutes: m, maxMinutesInferred: false })}>
              ⏱ {m} mins
            </Chip>
          ))}
          <Chip active={draft.maxMinutes == null} onClick={() => set({ maxMinutes: undefined, maxMinutesInferred: false, urgent: false })}>No limit</Chip>
          <p className="mt-2 w-full text-[12px] text-ink-2">Bella only shows options whose estimated window can start within your limit, and flags ones that may run over.</p>
        </div>
      )}

      {tab === 'cravings' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {CRAVINGS.map((c) => (
              <Chip key={c} active={draft.cravings.includes(c)} onClick={() => set({ cravings: toggle(draft.cravings, c) })}>
                {CRAVING_EMOJI[c]} {c}
              </Chip>
            ))}
          </div>
          <div className="text-[12px] font-bold uppercase tracking-wide text-ink-3">Meal</div>
          <div className="flex flex-wrap gap-1.5">
            {MEALS.map((m) => (
              <Chip key={m} active={draft.mealTime === m} onClick={() => set({ mealTime: draft.mealTime === m ? undefined : m })}>
                {m.replace('-', ' ')}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {tab === 'people' && (
        <div className="flex items-center justify-between rounded-xl border border-line p-3">
          <div>
            <div className="text-[14px] font-bold">How many people?</div>
            <div className="text-[12px] text-ink-2">2+ builds a one-vendor group basket</div>
          </div>
          <Stepper qty={draft.people ?? 1} label="people" onChange={(n) => set({ people: Math.max(1, Math.min(15, n)) })} />
        </div>
      )}

      {tab === 'diet' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(['no-pork', 'vegetarian'] as Diet[]).map((d) => (
              <Chip key={d} active={draft.dietaryRestrictions.includes(d)} onClick={() => set({ dietaryRestrictions: toggle(draft.dietaryRestrictions, d) })}>
                {d === 'no-pork' ? '🚫 No pork' : '🥬 Vegetarian'}
              </Chip>
            ))}
          </div>
          <p className="text-[12px] leading-relaxed text-ink-2">
            The supplied menus have no ingredient data, so Bella will flag every option as <b>not verified</b> rather than promise it's safe. Always confirm with the vendor.
          </p>
        </div>
      )}
    </Sheet>
  )
}
