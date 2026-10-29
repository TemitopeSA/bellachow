import { VENDORS, distanceTo, getArea, isOrderable } from '../data/dataAccess'
import type { MenuItem, Vendor } from '../data/types'
import { etaRange } from '../lib/delivery'
import { naira } from '../lib/formatting'
import { priceOrder, type PriceBreakdown } from '../lib/pricing'
import { dietStatus, itemMatches, vendorOpen, type RankContext } from './rank'
import type { BellaIntent, Craving, Diet, GroupBasket, Suggestion } from './types'

export const MAX_GROUP = 15

export type GroupOutcome =
  | { ok: true; basket: GroupBasket }
  | { ok: false; reason: 'closed' | 'budget' | 'diet' | 'nomenu'; minTotal?: number; maxPeople?: number; suggestions: Suggestion[] }

/** Enumerate multisets of `k` units over `n` pool indices (deterministic order). */
function* multisets(n: number, k: number, start = 0, acc: number[] = []): Generator<number[]> {
  if (k === 0) {
    yield acc
    return
  }
  for (let i = start; i < n; i++) {
    acc.push(i)
    yield* multisets(n, k - 1, i, acc)
    acc.pop()
  }
}

/**
 * Builds a mixed basket from ONE vendor using only supplied menu items.
 * Assumption (shown to the user): one menu item per person. We do not claim serving sizes.
 * Fees are order-level (charged once). The all-in total must be ≤ the group budget.
 */
export function buildGroupBasket(intent: BellaIntent, ctx: RankContext): GroupOutcome {
  const people = Math.min(MAX_GROUP, Math.max(2, intent.people ?? 2))
  const totalBudget =
    intent.budget == null ? undefined : intent.budgetMode === 'per-person' ? intent.budget * people : intent.budget
  const area = getArea(ctx.areaId)

  const orderable = (ctx.vendors ?? VENDORS).filter(isOrderable)
  if (!orderable.length) return { ok: false, reason: 'nomenu', suggestions: [] }
  const open = orderable.filter((v) => vendorOpen(v, ctx.minuteOfDay))
  if (!open.length) return { ok: false, reason: 'closed', suggestions: [{ kind: 'change-area' }] }

  // Nearest open branch per brand — the group gets one delivery from one kitchen.
  const byBrand = new Map<string, { v: Vendor & { prepMins: [number, number] }; km: number }>()
  for (const v of open) {
    const km = distanceTo(v, area)
    if (km == null) continue
    const cur = byBrand.get(v.brand)
    if (!cur || km < cur.km) byBrand.set(v.brand, { v: v as Vendor & { prepMins: [number, number] }, km })
  }

  let best: { score: number; basket: GroupBasket } | null = null
  let minTotalSeen = Infinity
  let cheapestUnit = Infinity
  let anyDietOk = false

  for (const { v, km } of byBrand.values()) {
    const breakfast = intent.mealTime === 'breakfast'
    let pool: MenuItem[] = v.items.filter((i) => (breakfast ? true : !i.tags.includes('breakfast')))
    pool = pool.filter((i) => !dietStatus(i, intent.dietaryRestrictions).violates)
    if (!pool.length) continue
    anyDietOk = true
    const craveScore = (i: MenuItem) =>
      intent.cravings.length ? intent.cravings.reduce((s, c) => s + itemMatches(i, v, c), 0) / intent.cravings.length : 0
    // Pool: craving matches first, then a spread of prices so variety is possible at any budget.
    pool.sort((a, b) => craveScore(b) - craveScore(a) || a.price - b.price || a.slug.localeCompare(b.slug))
    const poolSize = people > 8 ? 6 : 8
    const head = pool.filter((i) => craveScore(i) > 0).slice(0, Math.ceil(poolSize / 2))
    const rest = pool.filter((i) => !head.includes(i)).sort((a, b) => a.price - b.price)
    const need = Math.min(rest.length, poolSize - head.length)
    const step = need > 0 ? rest.length / need : 1
    const spread = Array.from({ length: need }, (_, i) => rest[Math.floor(i * step)])
    const chosenPool = [...head, ...spread]
    cheapestUnit = Math.min(cheapestUnit, ...pool.map((i) => i.price))

    const eta = etaRange(v.prepMins, km, ctx.fulfilment)
    for (const combo of multisets(chosenPool.length, people)) {
      const counts = new Map<number, number>()
      for (const idx of combo) counts.set(idx, (counts.get(idx) ?? 0) + 1)
      const lines = [...counts.entries()].map(([idx, qty]) => ({ price: chosenPool[idx].price, qty }))
      const pricing: PriceBreakdown = priceOrder({ lines, distanceKm: km, fulfilment: ctx.fulfilment, chowpass: ctx.chowpass })
      minTotalSeen = Math.min(minTotalSeen, pricing.total)
      if (totalBudget != null && pricing.total > totalBudget) continue
      const distinct = counts.size
      const maxQty = Math.max(...counts.values())
      const variety = Math.min(distinct, Math.min(3, people)) / Math.min(3, people)
      const balance = 1 - (maxQty - 1) / people
      const utilisation = totalBudget == null ? 0.5 - pricing.total / (people * 20000) : pricing.total / totalBudget
      const crave = combo.reduce((s, idx) => s + craveScore(chosenPool[idx]), 0) / people
      const rating = v.rating == null ? 0.4 : (v.rating - 3) / 2
      const speed = Math.max(0, 1 - (eta[0] - 20) / 60)
      const score = 2 * variety + 0.6 * balance + 2.5 * utilisation + 1.5 * crave + 0.3 * rating + 0.4 * speed
      if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) < 1e-9 && pricing.total < best.basket.pricing.total)) {
        const itemLines = [...counts.entries()]
          .map(([idx, qty]) => ({ item: chosenPool[idx], qty }))
          .sort((a, b) => b.qty - a.qty || a.item.price - b.item.price)
        const matched = intent.cravings.filter((c) => itemLines.some((l) => itemMatches(l.item, v, c) >= 1))
        const dietUnverified = [...new Set(itemLines.flatMap((l) => dietStatus(l.item, intent.dietaryRestrictions).unverified))] as Diet[]
        best = {
          score,
          basket: {
            id: `group:${v.id}:${itemLines.map((l) => `${l.item.slug}x${l.qty}`).join(',')}`,
            vendor: v,
            lines: itemLines,
            people,
            distanceKm: km,
            eta,
            pricing,
            perPerson: Math.round(pricing.total / people),
            budget: totalBudget,
            matched: matched as Craving[],
            dietUnverified,
            reason: '',
          },
        }
      }
    }
  }

  if (!anyDietOk) return { ok: false, reason: 'diet', suggestions: [{ kind: 'drop-diet' }] }

  if (!best) {
    // Explain the constraint honestly: what would it actually take?
    const suggestions: Suggestion[] = []
    let maxPeople = 0
    if (totalBudget != null && Number.isFinite(cheapestUnit)) {
      const nearest = [...byBrand.values()].sort((a, b) => a.km - b.km)[0]
      for (let p = people - 1; p >= 2 && nearest; p--) {
        const t = priceOrder({ lines: [{ price: cheapestUnit, qty: p }], distanceKm: nearest.km, fulfilment: ctx.fulfilment, chowpass: ctx.chowpass }).total
        if (t <= totalBudget) {
          maxPeople = p
          break
        }
      }
      if (maxPeople >= 2) suggestions.push({ kind: 'reduce-people', to: maxPeople })
      suggestions.push({ kind: 'raise-budget', to: Math.ceil(minTotalSeen / 500) * 500 })
      if (ctx.fulfilment !== 'pickup') suggestions.push({ kind: 'pickup' })
    }
    return { ok: false, reason: 'budget', minTotal: minTotalSeen, maxPeople, suggestions }
  }

  const b = best.basket
  const units = b.lines.reduce((s, l) => s + l.qty, 0)
  b.reason =
    `${units} meals from ${b.vendor.name}` +
    (b.budget != null ? `, ${naira(b.pricing.total)} all-in — ${naira(b.budget - b.pricing.total)} under your ${naira(b.budget)} budget` : `, ${naira(b.pricing.total)} all-in`) +
    `. Fees are charged once for the whole order.`
  return { ok: true, basket: b }
}
