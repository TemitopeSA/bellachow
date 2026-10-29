import { AREAS } from '../data/dataAccess'
import { ETA } from '../lib/config'
import type { BellaIntent, Craving, Diet, MealTime } from './types'

const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fifteen: 15, twenty: 20,
}

const CRAVING_PATTERNS: [Craving, RegExp][] = [
  ['spicy', /\b(spicy|spice|peppery|pepper|hot)\b|🌶|🔥/],
  ['jollof', /\bjollof\b/],
  ['rice', /\b(fried rice|rice)\b/],
  ['swallow', /\b(swallow|amala|eba|fufu|pounded yam|semo|semovita|iyan|tuwo|wheat)\b/],
  ['assorted meat', /\b(assorted( meat)?|orisirisi|goat meat|cow ?leg|shaki|ponmo|kpomo)\b/],
  ['chicken', /\b(chicken|chick|wings?|drumsticks?)\b|🍗/],
  ['pizza', /\bpizzas?\b|🍕/],
  ['healthy', /\b(healthy|light meal|clean|fit ?fam|salad|low[- ]?cal)\b|🥗/],
  ['suya', /\bsuya\b/],
  ['sweet', /\b(sweet|dessert|ice ?cream|cake|parfait|treat|sugary)\b|🍦|🍰/],
  ['drinks', /\b(drinks?|juice|smoothie|soda|coke|chapman|zobo)\b|🥤/],
  ['burger', /\bburgers?\b|🍔/],
  ['yam', /\byam\b/],
  ['filling', /\b(filling|heavy|belle full|big portion|full me|very hungry)\b/],
  ['pastry', /\b(pastry|pastries|meat ?pie|snack)\b/],
]

const DIET_PATTERNS: [Diet, RegExp][] = [
  ['no-pork', /\b(no pork|pork[- ]?free|without pork|zero pork|halal)\b/],
  ['vegetarian', /\b(vegetarian|veggie|vegan|no meat|meat[- ]?free)\b/],
]

type AreaAlias = { alias: string; areaId: string; re: RegExp }

const AREA_ALIASES: AreaAlias[] = AREAS.flatMap((a) =>
  a.aliases.map((alias) => ({
    alias,
    areaId: a.id,
    re: new RegExp(`(^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`),
  })),
).sort((x, y) => y.alias.length - x.alias.length)

export function normalize(text: string): string {
  let t = text.toLowerCase().replace(/[’']/g, "'")
  t = t.replace(/(\d),(\d{3})/g, '$1$2').replace(/(\d),(\d{3})/g, '$1$2')
  t = t.replace(/\bn(?=\d)/g, '₦') // "n6000" shorthand
  t = t.replace(/\b(a couple( of)?|couple)\b/g, '2')
  for (const [w, n] of Object.entries(NUMBER_WORDS)) t = t.replace(new RegExp(`\\b${w}\\b`, 'g'), String(n))
  return t.replace(/\s+/g, ' ').trim()
}

const MONEY_LEAD = /(under|below|less than|max(imum)?|budget( is| of)?|within|at most|not more than|up to|around|about|only|have|got|spend|for|total( of)?)\s*$/

/**
 * Deterministic, offline intent parser. Never invents a value: a missing budget is
 * undefined (not zero), an unnamed area falls back to the user's selected delivery area.
 */
export function parseIntent(input: string): BellaIntent {
  const t = normalize(input)
  const intent: BellaIntent = { cravings: [], dietaryRestrictions: [] }

  /* ---------- people ---------- */
  const couple = /\b(me and my (babe|bae|boo|wife|husband|partner|guy|babe|girlfriend|boyfriend|friend|sis|bro|man|woman)|for (the )?2 of us|date night)\b/
  if (couple.test(t)) intent.people = 2
  const pm =
    /\bfor (\d{1,2})\b(?!\s*(k\b|thousand|naira|ngn|mins?|minutes?|hours?|hrs?|%))/.exec(t) ??
    /\b(\d{1,2})\s*(people|persons?|pax|guys|heads|of us)\b/.exec(t)
  if (pm) {
    const n = Number(pm[1])
    if (n >= 1 && n <= 50) intent.people = n
  }
  if ((intent.people ?? 1) >= 2) intent.groupOrder = true

  /* ---------- time ---------- */
  const tm = /(\d{1,3})\s*(mins?|minutes?|m)\b/.exec(t)
  const hr = /\b(an|1|one|2)\s*(hours?|hrs?)\b/.exec(t)
  if (tm) intent.maxMinutes = Number(tm[1])
  else if (hr) intent.maxMinutes = (hr[1] === '2' ? 2 : 1) * 60
  if (/\b(fast|quick(ly)?|asap|now now|starving|hungry die|i'm dying|urgent|right now|hurry)\b/.test(t)) {
    intent.urgent = true
    if (intent.maxMinutes == null) {
      intent.maxMinutes = ETA.defaultFastMaxMins
      intent.maxMinutesInferred = true
    }
  }

  /* ---------- money ---------- */
  const moneyRe = /(₦)?\s*(\d+(?:\.\d+)?)\s*(k\b|thousand\b|naira\b|ngn\b|bucks\b)?/g
  let m: RegExpExecArray | null
  const amounts: number[] = []
  while ((m = moneyRe.exec(t))) {
    const [full, cur, num, unit] = m
    const start = m.index
    const after = t.slice(start + full.length, start + full.length + 12)
    if (/^\s*(mins?|minutes?|m\b|hours?|hrs?|people|persons?|pax|guys|heads|of us|%|km|stars?)/.test(after)) continue
    const before = t.slice(Math.max(0, start - 18), start)
    let value = Number(num)
    if (!Number.isFinite(value)) continue
    const isPeopleSlot = /\bfor\s*$/.test(before) && !cur && !unit && value <= 50
    if (isPeopleSlot) continue
    if (unit === 'k' || unit === 'thousand') value *= 1000
    else if (!cur && !unit) {
      if (MONEY_LEAD.test(before) && value > 0 && value < 100) value *= 1000 // "under 5" → ₦5,000
      else if (value < 500) continue // a bare small number is not money
    }
    if (value >= 200 && value <= 1_000_000) {
      amounts.push(Math.round(value))
    }
  }
  if (amounts.length) {
    intent.budget = amounts[amounts.length - 1]
    intent.budgetMode = /\b(each|per (person|head)|a head|apiece|per pax|\/person|per one)\b/.test(t) ? 'per-person' : 'total'
  }
  if (/\b(cheapest|lowest price|least expensive)\b/.test(t)) intent.priceFocus = 'cheapest'
  else if (/\b(cheap|affordable|budget|value|manage|small money|broke)\b/.test(t)) intent.priceFocus = 'value'

  /* ---------- area ---------- */
  for (const a of AREA_ALIASES) {
    if (a.re.test(t)) {
      intent.area = a.areaId
      if (/\bgra\b/.test(t) && a.areaId === 'ikeja') intent.areaDetail = 'GRA'
      if (/phase 1|phase one/.test(t) && a.areaId === 'lekki') intent.areaDetail = 'Phase 1'
      break
    }
  }
  if (/\b(near me|around me|close to me|nearby|my area|where i dey|my side)\b/.test(t)) intent.nearMe = true

  /* ---------- meal time ---------- */
  let meal: MealTime | undefined
  if (/\b(late[- ]night|midnight|night crawl|after hours)\b/.test(t)) meal = 'late-night'
  else if (/\b(breakfast|brunch|morning)\b/.test(t)) meal = 'breakfast'
  else if (/\blunch\b/.test(t)) meal = 'lunch'
  else if (/\b(dinner|supper|tonight)\b/.test(t)) meal = 'dinner'
  if (meal) intent.mealTime = meal

  /* ---------- cravings & diet ---------- */
  const tc = t.replace(/pounded yam/g, 'poundo').replace(/\bpizza night\b/, 'pizza')
  for (const [c, re] of CRAVING_PATTERNS) {
    if (c === 'yam' && /poundo/.test(tc)) continue
    const subject = c === 'swallow' ? t : tc
    if (re.test(subject) && !intent.cravings.includes(c)) intent.cravings.push(c)
  }
  // "hot" alone near time words ("hot and fast") still reads as spicy; acceptable for a food app.
  for (const [d, re] of DIET_PATTERNS) if (re.test(t)) intent.dietaryRestrictions.push(d)
  if (intent.dietaryRestrictions.includes('vegetarian')) intent.cravings = intent.cravings.filter((c) => c !== 'assorted meat' && c !== 'chicken')
  intent.spicy = intent.cravings.includes('spicy') || undefined

  if (/\bpick ?up\b|\bi'?ll come (get|pick)|collect it\b/.test(t)) intent.fulfilment = 'pickup'

  return intent
}

/** Human summary used for analytics and cart context — structured, no raw message stored. */
export function summarizeIntent(i: BellaIntent): string {
  const parts: string[] = []
  if (i.people && i.people > 1) parts.push(`${i.people} people`)
  if (i.budget) parts.push(`${i.budgetMode === 'per-person' ? 'per-person ' : ''}₦${i.budget}`)
  if (i.area) parts.push(i.area)
  if (i.maxMinutes) parts.push(`${i.maxMinutes}m`)
  if (i.cravings.length) parts.push(i.cravings.join('+'))
  if (i.dietaryRestrictions.length) parts.push(i.dietaryRestrictions.join('+'))
  if (i.mealTime) parts.push(i.mealTime)
  return parts.join(' · ') || 'open'
}
