import { PRICING } from './config'
import type { Fulfilment } from '../data/types'

export type PriceInput = {
  lines: { price: number; qty: number }[]
  /** Straight-line km from delivery area to vendor branch. */
  distanceKm: number
  fulfilment?: Fulfilment
  chowpass?: boolean
}

export type PriceBreakdown = {
  food: number
  packaging: number
  /** Delivery actually charged (0 with Chowpass or pickup). */
  delivery: number
  /** Delivery before Chowpass, used to show the saving. */
  deliveryBeforePass: number
  chowpassSaving: number
  service: number
  total: number
  units: number
  fulfilment: Fulfilment
  chowpass: boolean
}

const int = (n: number) => Math.max(0, Math.round(n))

export function deliveryFee(distanceKm: number): number {
  const d = PRICING.delivery
  const raw = d.base + d.perKm * Math.max(0, distanceKm)
  const rounded = Math.round(raw / d.roundTo) * d.roundTo
  return int(Math.min(d.cap, rounded))
}

export function packagingFee(units: number): number {
  if (units <= 0) return 0
  const p = PRICING.packaging
  return int(Math.min(p.max, Math.max(p.min, p.base + p.perExtraUnit * (units - 1))))
}

export function serviceFee(food: number): number {
  return int(Math.min(PRICING.service.cap, food * PRICING.service.rate))
}

/**
 * The ONE place an all-in total is computed. Every screen (cards, breakdown sheet,
 * cart, checkout, order snapshot) calls this so the numbers always reconcile.
 */
export function priceOrder(input: PriceInput): PriceBreakdown {
  const fulfilment = input.fulfilment ?? 'delivery'
  const chowpass = !!input.chowpass
  const lines = input.lines.filter((l) => l.qty > 0 && Number.isFinite(l.price) && l.price > 0)
  const units = lines.reduce((s, l) => s + Math.floor(l.qty), 0)
  const food = int(lines.reduce((s, l) => s + int(l.price) * Math.floor(l.qty), 0))
  if (units === 0) {
    return { food: 0, packaging: 0, delivery: 0, deliveryBeforePass: 0, chowpassSaving: 0, service: 0, total: 0, units: 0, fulfilment, chowpass }
  }
  const packaging = packagingFee(units)
  const deliveryBeforePass = fulfilment === 'pickup' ? 0 : deliveryFee(input.distanceKm)
  const delivery = chowpass && PRICING.chowpass.waivesDelivery ? 0 : deliveryBeforePass
  const service = serviceFee(food)
  const total = food + packaging + delivery + service
  return {
    food,
    packaging,
    delivery,
    deliveryBeforePass,
    chowpassSaving: deliveryBeforePass - delivery,
    service,
    total,
    units,
    fulfilment,
    chowpass,
  }
}
