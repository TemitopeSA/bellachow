/**
 * Tracking simulation. The PROMISED window comes only from the frozen order snapshot,
 * so changing the delivery area later can never change it. The demo runs accelerated
 * (1 real second = 1 simulated minute) but never alters the promised window.
 */
export const SIM_MS_PER_MIN = 1000

export const STAGES = ['Order received', 'Vendor preparing', 'Rider on the way', 'Delivered'] as const

type Frozen = { placedAt: number; eta: [number, number] }

export function promisedWindow(o: Frozen) {
  return { from: o.placedAt + o.eta[0] * 60_000, to: o.placedAt + o.eta[1] * 60_000 }
}

/** Simulated minute the rider arrives: deterministically inside the promised window. */
export function deliveryMinute(o: Frozen): number {
  return o.eta[0] + Math.round((o.eta[1] - o.eta[0]) * 0.4)
}

export function simulate(o: Frozen, now: number) {
  const simMin = Math.max(0, (now - o.placedAt) / SIM_MS_PER_MIN)
  const deliveredAtSimMin = deliveryMinute(o)
  const riderAt = Math.round(deliveredAtSimMin * 0.65)
  const stage = simMin >= deliveredAtSimMin ? 3 : simMin >= riderAt ? 2 : simMin >= 1 ? 1 : 0
  const remainingMins = stage === 3 ? 0 : Math.max(0, Math.ceil(o.eta[1] - simMin))
  const remainingLow = stage === 3 ? 0 : Math.max(0, Math.ceil(o.eta[0] - simMin))
  const progress = Math.min(1, simMin / deliveredAtSimMin)
  const riderProgress = stage < 2 ? 0 : Math.min(1, (simMin - riderAt) / Math.max(1, deliveredAtSimMin - riderAt))
  return { simMin, stage, remainingMins, remainingLow, progress, riderProgress, deliveredAtSimMin, riderAt }
}
