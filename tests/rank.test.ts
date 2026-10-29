import { describe, expect, it } from 'vitest'
import { parseIntent } from '../src/bella/parse'
import { runBella } from '../src/bella/respond'
import { decorate, rankSingle, type RankContext } from '../src/bella/rank'
import { buildGroupBasket } from '../src/bella/group'
import { QUICK_PROMPTS, EXTRA_TEST_PROMPTS } from '../src/bella/fixtures'
import { buildVendors, VENDORS } from '../src/data/dataAccess'
import { priceOrder } from '../src/lib/pricing'

const LUNCH = 13 * 60 + 15
const ctx = (over: Partial<RankContext> = {}): RankContext => ({ areaId: 'yaba', minuteOfDay: LUNCH, chowpass: false, fulfilment: 'delivery', ...over })
const sum = (p: { food: number; packaging: number; delivery: number; service: number }) => p.food + p.packaging + p.delivery + p.service

describe('Bella end-to-end on quick prompts', () => {
  it('prompt 1 → up to 3 in-budget spicy-first picks with reconciled all-in prices', () => {
    const intent = parseIntent(QUICK_PROMPTS[0])
    const r = runBella(intent, ctx())
    expect(r.mode).toBe('single')
    const top = decorate(r.ranked.slice(0, 3), intent)
    expect(top.length).toBeGreaterThan(0)
    expect(top.length).toBeLessThanOrEqual(3)
    for (const rec of top) {
      expect(rec.pricing.total).toBeLessThanOrEqual(6000)
      expect(rec.pricing.total).toBe(sum(rec.pricing))
      expect(rec.pricing.packaging).toBeGreaterThan(0)
      expect(rec.pricing.delivery).toBeGreaterThan(0)
      expect(rec.pricing.service).toBeGreaterThan(0)
      expect(rec.eta[0]).toBeLessThanOrEqual(30)
      expect(rec.vendor.area).toBe('yaba')
      if (rec.matched.includes('spicy')) expect(rec.item.tags).toContain('spicy')
      else expect(rec.reason).toMatch(/isn't spicy/)
    }
    expect(top[0].item.tags).toContain('spicy')
  })

  it('prompt 2 → one-vendor group basket ≤ ₦25k with per-person price', () => {
    const r = runBella(parseIntent(QUICK_PROMPTS[1]), ctx())
    expect(r.mode).toBe('group')
    const g = r.group!
    expect(g.people).toBe(5)
    expect(r.areaId).toBe('lekki')
    expect(g.pricing.total).toBeLessThanOrEqual(25000)
    expect(g.pricing.total).toBe(sum(g.pricing))
    expect(g.lines.reduce((s, l) => s + l.qty, 0)).toBe(5)
    expect(new Set(g.lines.map((l) => l.item.vendorId)).size).toBe(1)
    expect(g.lines.every((l) => l.item.vendorId === g.vendor.id)).toBe(true)
    expect(g.perPerson).toBe(Math.round(g.pricing.total / 5))
    // the basket total is the same central price function applied to its lines
    expect(priceOrder({ lines: g.lines.map((l) => ({ price: l.item.price, qty: l.qty })), distanceKm: g.distanceKm }).total).toBe(g.pricing.total)
  })

  it('prompt 3 → breakfast picks, pork-free NOT asserted, limitation explained', () => {
    const intent = parseIntent(QUICK_PROMPTS[2])
    const r = runBella(intent, ctx())
    const top = decorate(r.ranked.slice(0, 3), intent)
    expect(top[0].item.tags).toContain('breakfast')
    for (const rec of top) {
      expect(rec.dietUnverified).toContain('no-pork')
      expect(rec.reason.toLowerCase()).not.toMatch(/pork-free|healthy/)
    }
    expect(r.notes.join(' ')).toMatch(/can't confirm anything is pork-free/)
    expect(r.notes.join(' ')).toMatch(/healthy/)
  })

  it('prompt 4 → honest fallback: no swallow invented, related vendors shown as coming soon', () => {
    const intent = parseIntent(QUICK_PROMPTS[3])
    const r = runBella(intent, ctx())
    expect(r.unavailableCravings).toEqual(expect.arrayContaining(['swallow', 'assorted meat']))
    expect(r.comingSoon.some((v) => v.brand === 'Amala Ibadan')).toBe(true)
    expect(r.comingSoon.every((v) => v.items.length === 0)).toBe(true)
    for (const rec of r.ranked) expect(rec.matched).toEqual([])
  })

  it.each(EXTRA_TEST_PROMPTS)('extra prompt "%s" yields honest, real-data results', (p) => {
    const intent = parseIntent(p)
    const r = runBella(intent, ctx())
    const recs = r.group ? r.group.lines.map((l) => l.item) : r.ranked.map((x) => x.item)
    for (const item of recs) expect(VENDORS.find((v) => v.id === item.vendorId)?.items).toContain(item)
    if (['pizza', 'suya', 'sweet', 'jollof'].some((c) => intent.cravings.includes(c as never))) expect(r.unavailableCravings.length).toBeGreaterThan(0)
  })
})

describe('ranking guardrails', () => {
  it('hard budget is enforced', () => {
    const intent = parseIntent('anything under 4k')
    for (const rec of rankSingle(intent, ctx()).ranked) expect(rec.pricing.total).toBeLessThanOrEqual(4000)
  })
  it('dietary exclusions cannot be overridden by rating', () => {
    const vendors = buildVendors({
      menus: { m: { items: [
        { slug: 'pork', name: 'Pork Thing', section: 'A', price: 2000, tags: ['spicy'], diet: ['contains-pork'], emoji: 'x' },
        { slug: 'ok', name: 'Fine Thing', section: 'A', price: 2000, tags: [], diet: ['pork-free'], emoji: 'x' },
      ] } },
      vendors: [{ id: 'top', brand: 'Top', branch: 'Yaba', area: 'yaba', address: null, lat: 6.51, lng: 3.37, rating: 5, ratingCount: '1', prepMins: [10, 15], hours: { opens: '00:01', closes: '23:59' }, verified: true, promo: [], categories: [], keywords: [], menuId: 'm', provenance: 'test' }],
    })
    const ranked = rankSingle(parseIntent('spicy, no pork'), ctx({ vendors })).ranked
    expect(ranked.map((r) => r.item.slug)).toEqual(['ok'])
    expect(ranked[0].dietUnverified).toEqual([])
  })
  it('closed vendors are excluded from immediate recommendations', () => {
    const late = 22 * 60 + 30 // Ikeja branch is configured until 23:00, others until 22:00
    const ranked = rankSingle(parseIntent('anything'), ctx({ minuteOfDay: late })).ranked
    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked.every((r) => r.vendor.id === 'cr-ikeja')).toBe(true)
  })
  it('everything closed → no fake picks, binding = closed', () => {
    const r = runBella(parseIntent('anything'), ctx({ minuteOfDay: 3 * 60 }))
    expect(r.ranked).toEqual([])
    expect(r.binding).toBe('closed')
  })
  it('empty-menu vendors never produce purchasable recommendations', () => {
    const ranked = rankSingle(parseIntent('pizza suya swallow'), ctx()).ranked
    expect(ranked.every((r) => r.vendor.items.length > 0 && r.vendor.menuId)).toBe(true)
  })
  it('tags come from the actual set and are never all the same', () => {
    const intent = parseIntent(QUICK_PROMPTS[0])
    const top = decorate(rankSingle(intent, ctx()).ranked.slice(0, 3), intent)
    expect(top[0].tag).toBe('Best match')
    const cheapest = top.find((t) => t.tag === 'Cheapest')
    if (cheapest) expect(cheapest.pricing.total).toBe(Math.min(...top.map((t) => t.pricing.total)))
    expect(new Set(top.map((t) => t.tag)).size).toBeGreaterThan(1)
  })
  it('budget too low → closest option flagged as over budget, never "within budget"', () => {
    const r = runBella(parseIntent('food under ₦1,500 in Lekki'), ctx())
    expect(r.ranked).toEqual([])
    expect(r.binding).toBe('budget')
    expect(r.message).toBe("Omo, ₦1,500 is tight for Lekki delivery. Here's the closest I can do, or try pickup.")
    expect(r.closest!.withinBudget).toBe(false)
    expect(r.closest!.overBudgetBy).toBe(r.closest!.pricing.total - 1500)
    expect(r.suggestions.map((s) => s.kind)).toEqual(expect.arrayContaining(['raise-budget', 'pickup', 'change-area']))
  })
})

describe('group orders', () => {
  it('never accepts an over-budget basket; explains the constraint', () => {
    const out = buildGroupBasket(parseIntent('lunch for 10 in Lekki, 8k total'), ctx({ areaId: 'lekki' }))
    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.reason).toBe('budget')
      expect(out.suggestions.some((s) => s.kind === 'raise-budget')).toBe(true)
    }
  })
  it('per-person budget is multiplied once', () => {
    const out = buildGroupBasket(parseIntent('lunch for 3, 5k each'), ctx())
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.basket.budget).toBe(15000)
      expect(out.basket.pricing.total).toBeLessThanOrEqual(15000)
    }
  })
  it('deterministic', () => {
    const a = buildGroupBasket(parseIntent(QUICK_PROMPTS[1]), ctx({ areaId: 'lekki' }))
    const b = buildGroupBasket(parseIntent(QUICK_PROMPTS[1]), ctx({ areaId: 'lekki' }))
    expect(a.ok && b.ok && a.basket.id === b.basket.id).toBe(true)
  })
})

describe('optional AI layer is never authoritative', () => {
  it('drops unknown item IDs and out-of-range fields', async () => {
    const { validateAiResponse, mergeIntent } = await import('../src/bella/ai')
    const ok = validateAiResponse(
      { parsed: { budget: 5, area: 'mars', people: 3, cravings: ['spicy', 'caviar'] }, picks: [{ item_id: 'cr-yaba:spicy-yam-meal' }, { item_id: 'fake:item' }] },
      new Set(['cr-yaba:spicy-yam-meal']),
    )!
    expect(ok.pickIds).toEqual(['cr-yaba:spicy-yam-meal'])
    expect(ok.parsed.budget).toBeUndefined()
    expect(ok.parsed.area).toBeUndefined()
    expect(ok.parsed.cravings).toEqual(['spicy'])
    expect(validateAiResponse('nonsense', new Set())).toBeNull()
    // local parse wins; AI only fills gaps
    const merged = mergeIntent(parseIntent('spicy under 6k'), { budget: 9000, people: 3 })
    expect(merged.budget).toBe(6000)
    expect(merged.people).toBe(3)
  })
})
