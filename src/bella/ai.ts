import { AREAS } from '../data/dataAccess'
import type { BellaIntent, Craving, Diet } from './types'

/**
 * Optional AI layer. The deterministic rules engine is always the source of truth:
 * the AI can only fill intent gaps and re-order item IDs that the local engine already
 * deems eligible. Any failure (no key, timeout, malformed JSON) silently falls back.
 */
let available: Promise<boolean> | null = null

async function fetchJson(url: string, init: RequestInit & { timeoutMs: number }) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), init.timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) return null
    return (await res.json()) as unknown
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export function aiAvailable(): Promise<boolean> {
  if (!available) {
    available = fetchJson('/api/bella', { method: 'GET', timeoutMs: 1500 }).then(
      (j) => !!j && typeof j === 'object' && (j as { ai?: unknown }).ai === true,
    )
  }
  return available
}

const CRAVINGS: Craving[] = ['spicy', 'rice', 'jollof', 'swallow', 'assorted meat', 'chicken', 'pizza', 'healthy', 'suya', 'sweet', 'drinks', 'burger', 'yam', 'filling', 'pastry']
const DIETS: Diet[] = ['no-pork', 'vegetarian']

export type AiAnswer = { parsed: Partial<BellaIntent>; pickIds: string[] }

/** Strict runtime validation of the model's JSON. Unknown fields and IDs are dropped. */
export function validateAiResponse(raw: unknown, allowedIds: Set<string>): AiAnswer | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { parsed?: Record<string, unknown>; picks?: unknown }
  if (!Array.isArray(r.picks)) return null
  const pickIds = r.picks
    .map((p) => (p && typeof p === 'object' ? (p as { item_id?: unknown }).item_id : null))
    .filter((id): id is string => typeof id === 'string' && allowedIds.has(id))
    .filter((id, i, a) => a.indexOf(id) === i)
    .slice(0, 6)
  const parsed: Partial<BellaIntent> = {}
  const p = r.parsed && typeof r.parsed === 'object' ? r.parsed : {}
  const num = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v) : undefined)
  const budget = num(p.budget, 200, 1_000_000)
  if (budget) parsed.budget = budget
  const mins = num(p.maxMinutes, 5, 180)
  if (mins) parsed.maxMinutes = mins
  const people = num(p.people, 1, 50)
  if (people) parsed.people = people
  if (typeof p.area === 'string' && AREAS.some((a) => a.id === p.area)) parsed.area = p.area
  if (Array.isArray(p.cravings)) parsed.cravings = p.cravings.filter((c): c is Craving => CRAVINGS.includes(c as Craving))
  if (Array.isArray(p.dietaryRestrictions)) parsed.dietaryRestrictions = p.dietaryRestrictions.filter((d): d is Diet => DIETS.includes(d as Diet))
  return { parsed, pickIds }
}

export async function askAi(message: string, intent: BellaIntent, allowed: { id: string; name: string; vendor: string; price: number; tags: string[] }[]): Promise<AiAnswer | null> {
  if (!(await aiAvailable())) return null
  const json = await fetchJson('/api/bella', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: message.slice(0, 500), intent, items: allowed.slice(0, 60) }),
    timeoutMs: 4000,
  })
  return validateAiResponse(json, new Set(allowed.map((a) => a.id)))
}

/** Merge AI-parsed fields only where the local parser found nothing. */
export function mergeIntent(local: BellaIntent, ai: Partial<BellaIntent>): BellaIntent {
  const out = { ...local }
  if (out.budget == null && ai.budget != null) {
    out.budget = ai.budget
    out.budgetMode = 'total'
  }
  if (out.maxMinutes == null && ai.maxMinutes != null) out.maxMinutes = ai.maxMinutes
  if (out.people == null && ai.people != null) {
    out.people = ai.people
    out.groupOrder = ai.people > 1
  }
  if (out.area == null && ai.area) out.area = ai.area
  if (!out.cravings.length && ai.cravings?.length) out.cravings = ai.cravings
  if (ai.dietaryRestrictions?.length) out.dietaryRestrictions = [...new Set([...out.dietaryRestrictions, ...ai.dietaryRestrictions])]
  return out
}
