import { VENDORS, distanceTo, getArea, isOrderable } from '../data/dataAccess'
import type { AreaId, Fulfilment, MenuItem, Vendor } from '../data/types'
import { etaRange, isOpenAt } from '../lib/delivery'
import { etaLabel, naira, nairaCompact } from '../lib/formatting'
import { priceOrder } from '../lib/pricing'
import type { BellaIntent, Candidate, Craving, Diet, ExclusionStats, RecTag, Recommendation } from './types'

export type RankContext = {
  areaId: AreaId
  minuteOfDay: number
  chowpass: boolean
  fulfilment: Fulfilment
  vendors?: Vendor[]
}

/** Explicit, documented ranking weights (sum = 1). */
export const WEIGHTS = {
  craving: 0.35,
  budgetFit: 0.15,
  rating: 0.1,
  speed: 0.15,
  value: 0.15,
  distance: 0.1,
} as const

/* ---------- craving ↔ item matching (from supplied names/tags only) ---------- */

export function itemMatches(item: MenuItem, vendor: Vendor, c: Craving): number {
  const tags = item.tags
  switch (c) {
    case 'spicy': return tags.includes('spicy') ? 1 : 0
    case 'yam': return tags.includes('yam') ? 1 : 0
    case 'burger': return tags.includes('burger') ? 1 : 0
    case 'pastry': return tags.includes('pastry') ? 1 : 0
    case 'filling': return tags.includes('filling') ? 1 : 0
    case 'chicken':
      if (tags.includes('chicken')) return 1
      // Vendor specialises in chicken, but the item name doesn't confirm it: partial credit only.
      return vendor.keywords.includes('chicken') ? 0.4 : 0
    default:
      // rice, jollof, swallow, assorted meat, pizza, healthy, suya, sweet, drinks:
      // nothing in the supplied menus is tagged with these, so no claim is made.
      return tags.includes(c) ? 1 : 0
  }
}

/** Dietary handling: a KNOWN violation excludes; missing ingredient data means "unverified", never "safe". */
export function dietStatus(item: MenuItem, diets: Diet[]): { violates: boolean; unverified: Diet[] } {
  const unverified: Diet[] = []
  let violates = false
  for (const d of diets) {
    if (d === 'no-pork') {
      if (item.diet.includes('contains-pork')) violates = true
      else if (!item.diet.includes('pork-free')) unverified.push(d)
    }
    if (d === 'vegetarian') {
      if (item.diet.includes('contains-meat')) violates = true
      else if (!item.diet.includes('vegetarian')) unverified.push(d)
    }
  }
  return { violates, unverified }
}

export function vendorOpen(v: Vendor, minuteOfDay: number): boolean {
  return v.hours ? isOpenAt(v.hours, minuteOfDay) : false
}

/** Every (item × orderable branch) candidate with its distance, ETA and central all-in price. */
export function buildCandidates(ctx: RankContext): Candidate[] {
  const area = getArea(ctx.areaId)
  const out: Candidate[] = []
  for (const v of ctx.vendors ?? VENDORS) {
    if (!isOrderable(v)) continue
    const km = distanceTo(v, area)
    if (km == null) continue
    const eta = etaRange(v.prepMins, km, ctx.fulfilment)
    const open = vendorOpen(v, ctx.minuteOfDay)
    for (const item of v.items) {
      out.push({
        item,
        vendor: v,
        distanceKm: km,
        eta,
        open,
        pricing: priceOrder({ lines: [{ price: item.price, qty: 1 }], distanceKm: km, fulfilment: ctx.fulfilment, chowpass: ctx.chowpass }),
      })
    }
  }
  return out
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

export type RankOutput = {
  ranked: Recommendation[]
  stats: ExclusionStats
  /** Candidates that pass every hard filter EXCEPT the named one — used to explain no-match states. */
  nearMisses: { budget: Recommendation[]; time: Recommendation[]; closed: Recommendation[] }
  availableCravings: Set<Craving>
}

export function rankSingle(intent: BellaIntent, ctx: RankContext): RankOutput {
  const all = buildCandidates(ctx)
  const stats: ExclusionStats = { budget: 0, time: 0, closed: 0, diet: 0, nomenu: 0, invalid: 0 }
  stats.nomenu = (ctx.vendors ?? VENDORS).filter((v) => !isOrderable(v)).length
  const budget = intent.budget
  const maxMins = intent.maxMinutes
  const prices = all.map((c) => c.pricing.total)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)

  const availableCravings = new Set<Craving>()
  for (const c of all) for (const cr of intent.cravings) if (itemMatches(c.item, c.vendor, cr) >= 1) availableCravings.add(cr)

  const scored: (Recommendation & { fails: string[] })[] = all.map((c) => {
    const fails: string[] = []
    if (!(c.item.price > 0)) fails.push('invalid')
    if (!c.open) fails.push('closed')
    const diet = dietStatus(c.item, intent.dietaryRestrictions)
    if (diet.violates) fails.push('diet')
    const withinBudget = budget == null || c.pricing.total <= budget
    if (!withinBudget) fails.push('budget')
    if (maxMins != null && c.eta[0] > maxMins) fails.push('time')
    const etaFit = maxMins == null ? 'fits' : c.eta[1] <= maxMins ? 'fits' : c.eta[0] <= maxMins ? 'tight' : 'none'

    const matched: Craving[] = []
    const missed: Craving[] = []
    let cravingScore = 0.5
    if (intent.cravings.length) {
      let sum = 0
      for (const cr of intent.cravings) {
        const s = itemMatches(c.item, c.vendor, cr)
        sum += s
        if (s >= 1) matched.push(cr)
        else missed.push(cr)
      }
      cravingScore = sum / intent.cravings.length
    }
    const isBreakfast = c.item.tags.includes('breakfast')
    let mealAdj = 0
    if (intent.mealTime === 'breakfast') {
      cravingScore = intent.cravings.length ? (cravingScore + (isBreakfast ? 1 : 0)) / 2 : isBreakfast ? 1 : 0.2
    } else if (isBreakfast) mealAdj = -0.15

    const budgetFit = budget == null ? 0.5 : withinBudget ? 0.6 + 0.4 * (c.pricing.total / budget) : 0
    const rating = c.vendor.rating == null ? 0.4 : clamp01((c.vendor.rating - 3) / 2)
    const speed = clamp01(1 - (c.eta[0] - 20) / 60)
    let value = maxP === minP ? 1 : 1 - (c.pricing.total - minP) / (maxP - minP)
    if (c.item.tags.includes('filling')) value = clamp01(value + 0.15)
    const distance = clamp01(1 - c.distanceKm / 15)

    const w = { ...WEIGHTS } as Record<keyof typeof WEIGHTS, number>
    if (intent.priceFocus === 'cheapest') { w.value = 0.4; w.craving = 0.25; w.budgetFit = 0.05; w.rating = 0.05; w.speed = 0.15; w.distance = 0.1 }
    else if (intent.priceFocus === 'value') { w.value = 0.25; w.craving = 0.3; w.budgetFit = 0.1 }
    if (intent.urgent) { w.speed += 0.1; w.rating -= 0.05; w.budgetFit -= 0.05 }

    const components = { craving: cravingScore, budgetFit, rating, speed, value, distance }
    const score =
      w.craving * cravingScore + w.budgetFit * budgetFit + w.rating * rating + w.speed * speed + w.value * value + w.distance * distance + mealAdj

    return {
      ...c,
      id: `rec:${c.item.id}`,
      score: Math.round(score * 1000) / 1000,
      components,
      matched,
      missed,
      etaFit,
      withinBudget,
      overBudgetBy: budget == null ? 0 : Math.max(0, c.pricing.total - budget),
      dietUnverified: diet.unverified,
      reason: '',
      fails,
    }
  })

  for (const s of scored) for (const f of s.fails) if (f in stats) stats[f as keyof ExclusionStats]++

  const byScore = (a: Recommendation, b: Recommendation) =>
    b.score - a.score || a.pricing.total - b.pricing.total || a.eta[0] - b.eta[0] || a.id.localeCompare(b.id)

  /** One card per menu item: keep the best branch (fastest, then cheapest) so the list isn't 5× the same meal. */
  const dedupe = (list: Recommendation[]) => {
    const best = new Map<string, Recommendation>()
    for (const r of list) {
      const key = `${r.vendor.brand}:${r.item.slug}`
      const cur = best.get(key)
      if (!cur || r.eta[0] < cur.eta[0] || (r.eta[0] === cur.eta[0] && r.pricing.total < cur.pricing.total)) best.set(key, r)
    }
    return [...best.values()].sort(byScore)
  }

  const strip = (s: Recommendation & { fails: string[] }): Recommendation => {
    const r: Partial<typeof s> = { ...s }
    delete r.fails
    return r as Recommendation
  }
  const eligible = dedupe(scored.filter((s) => s.fails.length === 0).map(strip))
  const onlyFails = (f: string) => dedupe(scored.filter((s) => s.fails.length === 1 && s.fails[0] === f).map(strip))

  return {
    ranked: eligible,
    stats,
    nearMisses: { budget: onlyFails('budget'), time: onlyFails('time'), closed: onlyFails('closed') },
    availableCravings,
  }
}

/* ---------- tags & reasons ---------- */

const cravingWord: Record<Craving, string> = {
  spicy: 'spicy', rice: 'rice', jollof: 'jollof', swallow: 'swallow', 'assorted meat': 'assorted meat',
  chicken: 'chicken', pizza: 'pizza', healthy: 'healthy', suya: 'suya', sweet: 'sweet', drinks: 'drinks',
  burger: 'burger', yam: 'yam', filling: 'filling', pastry: 'pastry',
}

/** Tags are derived from the actual visible set and are only applied when literally true. */
export function assignTags(visible: Recommendation[]): Recommendation[] {
  if (!visible.length) return visible
  const out = visible.map((r) => ({ ...r, tag: undefined as RecTag | undefined }))
  out[0].tag = 'Best match'
  const minTotal = Math.min(...out.map((r) => r.pricing.total))
  const cheapestIdx = out.findIndex((r) => r.pricing.total === minTotal)
  if (cheapestIdx > 0 && out.filter((r) => r.pricing.total === minTotal).length === 1) out[cheapestIdx].tag = 'Cheapest'
  const minEta = Math.min(...out.map((r) => r.eta[0]))
  const fastest = out.filter((r) => r.eta[0] === minEta)
  if (fastest.length === 1) {
    const idx = out.indexOf(fastest[0])
    if (!out[idx].tag) out[idx].tag = 'Fastest'
  }
  for (const r of out) {
    if (r.tag) continue
    r.tag = r.matched.length ? 'Matches craving' : r.withinBudget && r.overBudgetBy === 0 && r.components.budgetFit !== 0.5 ? 'In budget' : 'Alternative'
  }
  return out
}

export function reasonFor(r: Recommendation, intent: BellaIntent): string {
  const out: string[] = []
  if (r.tag === 'Cheapest') out.push('Lowest all-in total of these.')
  else if (r.tag === 'Fastest') out.push('Quickest eligible option from the available branches.')
  const fit: string[] = []
  if (intent.budget != null) {
    fit.push(r.withinBudget ? `fits your ${nairaCompact(intent.budget)} budget` : `is ${naira(r.overBudgetBy)} over your ${naira(intent.budget)} budget`)
  }
  // "healthy" is never asserted or denied — there is no nutrition data — so it is left out of reasons.
  const wanted = intent.cravings.filter((c) => c !== 'healthy')
  if (r.matched.length) fit.push(`matches your ${r.matched.filter((c) => c !== 'healthy').map((c) => cravingWord[c]).join(' + ')} craving`)
  else if (wanted.length) fit.push(`isn't ${wanted.map((c) => cravingWord[c]).join(' or ')}, but it's available now`)
  if (intent.mealTime === 'breakfast' && r.item.tags.includes('breakfast')) fit.push(`is on the breakfast menu`)
  if (r.item.tags.includes('filling') && intent.cravings.includes('filling')) fit.push(`the name suggests a bigger portion`)
  if (fit.length) {
    const joined = fit.length > 1 ? `${fit.slice(0, -1).join(', ')} and ${fit[fit.length - 1]}` : fit[0]
    out.push(`${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`)
  }
  const eta = etaLabel(r.eta)
  if (intent.maxMinutes != null && r.etaFit === 'tight') out.push(`Est. ${eta} — may be tight for your ${intent.maxMinutes}-min limit.`)
  else if (intent.maxMinutes != null && r.etaFit === 'fits') out.push(`Est. ${eta}, within your ${intent.maxMinutes}-min limit.`)
  else out.push(`Est. ${eta}.`)
  return out.join(' ')
}

export function decorate(visible: Recommendation[], intent: BellaIntent): Recommendation[] {
  return assignTags(visible).map((r) => ({ ...r, reason: reasonFor(r, intent) }))
}
