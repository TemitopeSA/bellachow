import { VENDORS, distanceTo, getArea, isOrderable } from '../data/dataAccess'
import type { Vendor } from '../data/types'
import { naira, nairaCompact } from '../lib/formatting'
import { buildGroupBasket } from './group'
import { decorate, rankSingle, type RankContext } from './rank'
import type { BellaIntent, BellaResult, Craving, Recommendation, Suggestion } from './types'

const CRAVING_KEYWORDS: Record<Craving, string[]> = {
  spicy: ['spicy'], rice: ['rice'], jollof: ['jollof', 'party jollof'], swallow: ['swallow', 'amala'],
  'assorted meat': ['assorted meat'], chicken: ['chicken'], pizza: ['pizza'], healthy: ['healthy', 'fruit'],
  suya: ['suya'], sweet: ['sweet', 'dessert', 'ice cream'], drinks: ['drinks'], burger: ['burger'],
  yam: ['yam'], filling: [], pastry: [],
}

const LABEL: Record<Craving, string> = {
  spicy: 'spicy', rice: 'rice', jollof: 'jollof', swallow: 'swallow', 'assorted meat': 'assorted meat',
  chicken: 'chicken', pizza: 'pizza', healthy: 'healthy', suya: 'suya', sweet: 'sweet treats', drinks: 'drinks',
  burger: 'burgers', yam: 'yam', filling: 'filling', pastry: 'pastry',
}

const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

/** Listed vendors with no menu data yet that might match what the user wants — shown as "coming soon", never as purchasable. */
export function comingSoonFor(cravings: Craving[], areaId: string): Vendor[] {
  const area = getArea(areaId)
  const kws = cravings.flatMap((c) => CRAVING_KEYWORDS[c])
  if (!kws.length) return []
  return VENDORS.filter((v) => !isOrderable(v) && v.keywords.some((k) => kws.includes(k)))
    .map((v) => ({ v, km: distanceTo(v, area) ?? Infinity }))
    .sort((a, b) => a.km - b.km || a.v.name.localeCompare(b.v.name))
    .map((x) => x.v)
    .filter((v, i, arr) => arr.findIndex((o) => o.brand === v.brand) === i) // nearest branch per brand
    .slice(0, 3)
}

const roundUp = (n: number, step: number) => Math.ceil(n / step) * step

export function runBella(intentIn: BellaIntent, baseCtx: RankContext): BellaResult {
  const intent: BellaIntent = { ...intentIn, cravings: [...intentIn.cravings], dietaryRestrictions: [...intentIn.dietaryRestrictions] }
  const ctx: RankContext = {
    ...baseCtx,
    areaId: intent.area ?? baseCtx.areaId,
    fulfilment: intent.fulfilment ?? baseCtx.fulfilment,
  }
  const area = getArea(ctx.areaId)
  const single = rankSingle(intent, ctx)
  const unavailableCravings = intent.cravings.filter((c) => !single.availableCravings.has(c) && c !== 'chicken' && c !== 'filling')
  const comingSoon = comingSoonFor(unavailableCravings, ctx.areaId)
  const notes: string[] = []

  if (intent.nearMe && !intent.area) notes.push(`Using your delivery area: ${area.name}. Change it any time with the 📍 pill.`)
  const missingNamed = unavailableCravings.filter((c) => c !== 'healthy')
  if (missingNamed.length) notes.push(`No ${listJoin(missingNamed.map((c) => LABEL[c]))} on the menus I have yet, so I won't pretend.`)
  if (comingSoon.length)
    notes.push(`${listJoin(comingSoon.map((v) => v.name))} ${comingSoon.length > 1 ? 'are' : 'is'} listed and may fit, but menu data is coming soon.`)
  if (intent.dietaryRestrictions.length) {
    const d = intent.dietaryRestrictions.map((x) => (x === 'no-pork' ? 'pork-free' : 'vegetarian')).join(' or ')
    notes.push(`Heads up: the supplied menu has no ingredient data, so I can't confirm anything is ${d}. Please check with the vendor before you order.`)
  }
  if (intent.cravings.includes('healthy')) notes.push(`I can't call any item "healthy" — there's no nutrition info in this menu data.`)

  const base = {
    intent,
    areaId: ctx.areaId,
    unavailableCravings,
    comingSoon,
    notes,
    stats: single.stats,
    source: 'rules' as const,
  }

  /* ---------------- Group order ---------------- */
  if (intent.groupOrder && (intent.people ?? 1) >= 2) {
    const g = buildGroupBasket(intent, ctx)
    if (g.ok) {
      const b = g.basket
      const label = intent.mealTime ? `${cap(intent.mealTime === 'late-night' ? 'Late-night chow' : intent.mealTime)} for ${b.people}` : `Food for ${b.people}`
      return {
        ...base,
        mode: 'group',
        ranked: [],
        group: b,
        suggestions: [],
        message: `${label}, sorted 🙌 One kitchen, ${b.lines.reduce((s, l) => s + l.qty, 0)} meals, ${naira(b.pricing.total)} all-in — about ${naira(b.perPerson)} per person. I've assumed one meal per person; adjust quantities in your cart.`,
      }
    }
    const suggestions = g.suggestions
    let message = `I couldn't build a group order right now.`
    if (g.reason === 'budget' && g.minTotal != null && Number.isFinite(g.minTotal)) {
      const people = Math.min(15, intent.people ?? 2)
      const budget = intent.budgetMode === 'per-person' && intent.budget ? intent.budget * people : intent.budget
      message = `Omo, ${budget ? naira(budget) : 'that budget'} is tight for ${people} people in ${area.name}. The cheapest one-meal-each basket I can build is about ${naira(g.minTotal)} all-in. ${
        g.maxPeople && g.maxPeople >= 2 ? `I can do ${g.maxPeople} people within budget, ` : ''
      }or you can raise the budget or try pickup.`
    } else if (g.reason === 'closed') message = `The kitchens with menu data are closed right now (demo clock), so I can't place a group order yet.`
    else if (g.reason === 'diet') message = `None of the supplied items are known to fit those dietary needs.`
    return { ...base, mode: 'group', ranked: [], suggestions, binding: g.reason === 'nomenu' ? 'nomenu' : g.reason, message }
  }

  /* ---------------- Single order ---------------- */
  if (single.ranked.length) {
    const top = decorate(single.ranked.slice(0, 3), intent)[0]
    return { ...base, mode: 'single', ranked: single.ranked, suggestions: [], message: openerFor(intent, top, single.ranked.length) }
  }

  // Nothing passes every hard filter — find the binding constraint and the closest honest alternative.
  const suggestions: Suggestion[] = []
  const nm = single.nearMisses
  let binding: BellaResult['binding']
  let closest: Recommendation | undefined
  let message: string

  const orderableOpen = VENDORS.filter((v) => isOrderable(v) && v.hours)
  const anyOpen = single.stats.closed < buildCount(ctx)
  if (!anyOpen && orderableOpen.length) {
    binding = 'closed'
    closest = nm.closed[0]
    const opensAt = closest?.vendor.hours ? closest.vendor.hours.opens : null
    message = `The kitchens I have menus for are closed right now (demo clock)${opensAt ? ` — they open from ${fmt12(opensAt)}` : ''}. I won't suggest something you can't order.`
    suggestions.push({ kind: 'change-area' })
  } else if (nm.budget.length) {
    binding = 'budget'
    closest = [...nm.budget].sort((a, b) => a.pricing.total - b.pricing.total)[0]
    const where = ctx.fulfilment === 'pickup' ? 'pickup' : `${area.name} delivery`
    message = `Omo, ${naira(intent.budget!)} is tight for ${where}. Here's the closest I can do${ctx.fulfilment === 'pickup' ? '' : ', or try pickup'}.`
    suggestions.push({ kind: 'raise-budget', to: roundUp(closest.pricing.total, 500) })
    if (ctx.fulfilment !== 'pickup') suggestions.push({ kind: 'pickup' })
    suggestions.push({ kind: 'change-area' })
  } else if (nm.time.length) {
    binding = 'time'
    closest = [...nm.time].sort((a, b) => a.eta[0] - b.eta[0] || a.pricing.total - b.pricing.total)[0]
    message = `Nothing can honestly reach ${area.name} in ${intent.maxMinutes} mins. The quickest I can do is ${closest.eta[0]}–${closest.eta[1]} mins.`
    suggestions.push({ kind: 'relax-time', to: roundUp(closest.eta[1], 5) })
    if (ctx.fulfilment !== 'pickup') suggestions.push({ kind: 'pickup' })
    suggestions.push({ kind: 'change-area' })
  } else if (single.stats.diet > 0) {
    binding = 'diet'
    message = `Nothing in the supplied menus is known to fit those dietary needs.`
    suggestions.push({ kind: 'drop-diet' })
  } else {
    // Budget AND time both bind — relax both to find the honest closest.
    binding = 'budget'
    const relaxed = rankSingle({ ...intent, budget: undefined, maxMinutes: undefined }, ctx).ranked
    closest = [...relaxed].sort((a, b) => a.pricing.total - b.pricing.total)[0]
    if (closest && intent.budget != null) closest = { ...closest, withinBudget: false, overBudgetBy: Math.max(0, closest.pricing.total - intent.budget) }
    message = intent.budget
      ? `Omo, ${naira(intent.budget)} in ${intent.maxMinutes ?? '—'} mins is tight for ${area.name}. Here's the closest I can do.`
      : `Nothing fits all of that right now. Here's the closest I can do.`
    if (closest) suggestions.push({ kind: 'raise-budget', to: roundUp(closest.pricing.total, 500) })
    if (closest && intent.maxMinutes) suggestions.push({ kind: 'relax-time', to: roundUp(closest.eta[1], 5) })
    suggestions.push({ kind: 'change-area' })
  }
  if (closest) closest = decorate([closest], intent).map((r) => ({ ...r, tag: 'Closest option' as const }))[0]
  return { ...base, mode: 'single', ranked: [], closest, binding, suggestions, message }
}

function buildCount(ctx: RankContext) {
  const area = getArea(ctx.areaId)
  return (ctx.vendors ?? VENDORS).filter((v) => isOrderable(v) && distanceTo(v, area) != null).reduce((s, v) => s + v.items.length, 0)
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function fmt12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

function openerFor(intent: BellaIntent, top: Recommendation, count: number): string {
  const lines: string[] = []
  const missingAll = intent.cravings.filter((c) => c !== 'healthy' && c !== 'filling').length > 0 && !top.matched.length
  if (missingAll) lines.push(`I no fit lie — I don't have that exact thing yet. Here's what's available now.`)
  else if (top.matched.length && top.withinBudget && top.etaFit === 'fits') lines.push('Omo, this one go sweet you.')
  else if (intent.budget != null) lines.push(`I found a solid option for your ${nairaCompact(intent.budget)} budget.`)
  else if (intent.priceFocus) lines.push(`Let's make your money work.`)
  else lines.push(`Here's what I'd order.`)
  if (top.etaFit === 'tight') lines.push(`This one is close, but the delivery time may be tight.`)
  lines.push(`${count} option${count === 1 ? '' : 's'} fit${count === 1 ? 's' : ''} — every price below includes estimated fees.`)
  return lines.join(' ')
}

