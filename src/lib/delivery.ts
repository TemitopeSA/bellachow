import { ETA } from './config'
import type { Fulfilment, Hours } from '../data/types'

const R_KM = 6371

/** Straight-line (great-circle) distance. A prototype approximation — not road distance. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function travelMins(distanceKm: number): number {
  return Math.round(Math.max(0, distanceKm) * ETA.minutesPerKm)
}

/**
 * ETA = prep + ~3 min/km + 5 min buffer, applied to both ends of the prep range.
 * Pickup = prep range only (ready for collection).
 */
export function etaRange(prepMins: [number, number], distanceKm: number, fulfilment: Fulfilment = 'delivery'): [number, number] {
  const [p0, p1] = prepMins[0] <= prepMins[1] ? prepMins : [prepMins[1], prepMins[0]]
  if (fulfilment === 'pickup') return [p0, p1]
  const t = travelMins(distanceKm) + ETA.bufferMins
  return [p0 + t, p1 + t]
}

/* ---------------- Opening hours (illustrative demo configuration) ---------------- */

export function parseHHMM(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return NaN
  return Number(m[1]) * 60 + Number(m[2])
}

/** Supports schedules that cross midnight (e.g. 17:00–02:00). */
export function isOpenAt(hours: Hours, minuteOfDay: number): boolean {
  const o = parseHHMM(hours.opens)
  const c = parseHHMM(hours.closes)
  if (!Number.isFinite(o) || !Number.isFinite(c)) return false
  const m = ((minuteOfDay % 1440) + 1440) % 1440
  if (o === c) return false // never assume 24/7
  return o < c ? m >= o && m < c : m >= o || m < c
}

export function formatClock(minuteOfDay: number): string {
  const m = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440
  const h24 = Math.floor(m / 60)
  const mm = m % 60
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(mm).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`
}

export type OpenStatus =
  | { state: 'open'; closesAt: string }
  | { state: 'closed'; opensAt: string }
  | { state: 'unknown' }

export function openStatus(hours: Hours | null, minuteOfDay: number): OpenStatus {
  if (!hours) return { state: 'unknown' }
  if (isOpenAt(hours, minuteOfDay)) return { state: 'open', closesAt: formatClock(parseHHMM(hours.closes)) }
  return { state: 'closed', opensAt: formatClock(parseHHMM(hours.opens)) }
}

/** Minute of day in Lagos (WAT, UTC+1, no DST). */
export function lagosMinuteOfDay(date: Date): number {
  return ((date.getUTCHours() + 1) % 24) * 60 + date.getUTCMinutes()
}
