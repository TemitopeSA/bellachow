import { describe, expect, it } from 'vitest'
import { deliveryFee, packagingFee, priceOrder, serviceFee } from '../src/lib/pricing'
import { PRICING } from '../src/lib/config'
import { etaRange, haversineKm, isOpenAt, openStatus, lagosMinuteOfDay } from '../src/lib/delivery'
import { promisedWindow, simulate } from '../src/lib/tracking'

const sum = (p: ReturnType<typeof priceOrder>) => p.food + p.packaging + p.delivery + p.service

describe('priceOrder', () => {
  it('total = food + pack + delivery + service, in whole naira', () => {
    const p = priceOrder({ lines: [{ price: 3500, qty: 1 }], distanceKm: 2.3 })
    expect(p.total).toBe(sum(p))
    for (const v of Object.values(p)) if (typeof v === 'number') expect(Number.isInteger(v)).toBe(true)
    expect(p.food).toBe(3500)
    expect(p.service).toBe(210)
    expect(p.packaging).toBe(300)
    expect(p.delivery).toBe(deliveryFee(2.3))
  })
  it('delivery = ₦500 + ₦150/km, rounded, capped at ₦2,500', () => {
    expect(deliveryFee(0)).toBe(500)
    expect(deliveryFee(4)).toBe(1100)
    expect(deliveryFee(100)).toBe(PRICING.delivery.cap)
  })
  it('packaging stays within ₦200–₦500 and is charged once per order', () => {
    expect(packagingFee(1)).toBe(300)
    expect(packagingFee(50)).toBe(500)
    expect(packagingFee(0)).toBe(0)
  })
  it('service fee is capped', () => {
    expect(serviceFee(100000)).toBe(PRICING.service.cap)
  })
  it('Chowpass sets delivery to ₦0 and recalculates the total', () => {
    const base = priceOrder({ lines: [{ price: 4800, qty: 1 }], distanceKm: 3 })
    const pass = priceOrder({ lines: [{ price: 4800, qty: 1 }], distanceKm: 3, chowpass: true })
    expect(pass.delivery).toBe(0)
    expect(pass.chowpassSaving).toBe(base.delivery)
    expect(pass.total).toBe(base.total - base.delivery)
    expect(pass.total).toBe(sum(pass))
  })
  it('quantity changes update totals', () => {
    const one = priceOrder({ lines: [{ price: 2800, qty: 1 }], distanceKm: 1 })
    const three = priceOrder({ lines: [{ price: 2800, qty: 3 }], distanceKm: 1 })
    expect(three.food).toBe(8400)
    expect(three.total).toBe(sum(three))
    expect(three.total).toBeGreaterThan(one.total)
  })
  it('group fees are not double-counted (order-level pack + delivery)', () => {
    const p = priceOrder({ lines: [{ price: 3000, qty: 5 }], distanceKm: 1 })
    expect(p.packaging).toBe(PRICING.packaging.max)
    expect(p.delivery).toBe(deliveryFee(1))
  })
  it('pickup removes delivery only', () => {
    const d = priceOrder({ lines: [{ price: 3000, qty: 1 }], distanceKm: 5 })
    const pu = priceOrder({ lines: [{ price: 3000, qty: 1 }], distanceKm: 5, fulfilment: 'pickup' })
    expect(pu.delivery).toBe(0)
    expect(pu.packaging).toBe(d.packaging)
    expect(pu.service).toBe(d.service)
  })
  it('never negative; empty or invalid lines give zero', () => {
    expect(priceOrder({ lines: [], distanceKm: 1 }).total).toBe(0)
    expect(priceOrder({ lines: [{ price: -100, qty: 2 }], distanceKm: -3 }).total).toBe(0)
  })
})

describe('ETA & hours', () => {
  it('ETA = prep + 3 min/km + 5, respecting the prep range', () => {
    expect(etaRange([24, 34], 2)).toEqual([35, 45])
    expect(etaRange([24, 34], 0, 'pickup')).toEqual([24, 34])
  })
  it('ETA increases with distance', () => {
    expect(etaRange([24, 34], 8)[0]).toBeGreaterThan(etaRange([24, 34], 2)[0])
  })
  it('haversine is sane (Yaba → Lekki ≈ 13 km)', () => {
    const d = haversineKm({ lat: 6.5095, lng: 3.3711 }, { lat: 6.4474, lng: 3.473 })
    expect(d).toBeGreaterThan(12)
    expect(d).toBeLessThan(14)
  })
  it('opening hours, including schedules that cross midnight', () => {
    const day = { opens: '08:00', closes: '22:00' }
    expect(isOpenAt(day, 13 * 60)).toBe(true)
    expect(isOpenAt(day, 22 * 60 + 30)).toBe(false)
    const night = { opens: '17:00', closes: '02:00' }
    expect(isOpenAt(night, 23 * 60)).toBe(true)
    expect(isOpenAt(night, 60)).toBe(true)
    expect(isOpenAt(night, 12 * 60)).toBe(false)
    expect(openStatus(day, 22 * 60 + 30)).toEqual({ state: 'closed', opensAt: '8:00 AM' })
    expect(openStatus(null, 0)).toEqual({ state: 'unknown' })
  })
  it('Lagos clock is UTC+1 (injectable date)', () => {
    expect(lagosMinuteOfDay(new Date('2026-10-29T12:15:00Z'))).toBe(13 * 60 + 15)
  })
})

describe('tracking simulation uses the frozen ETA', () => {
  const order = { placedAt: 1_000_000, eta: [30, 40] as [number, number] }
  it('promised window is derived from the snapshot only', () => {
    expect(promisedWindow(order)).toEqual({ from: 1_000_000 + 30 * 60_000, to: 1_000_000 + 40 * 60_000 })
  })
  it('deterministic: same clock → same state; delivered inside the promised window', () => {
    const a = simulate(order, order.placedAt + 5_000)
    const b = simulate(order, order.placedAt + 5_000)
    expect(a).toEqual(b)
    const end = simulate(order, order.placedAt + 10 * 60_000)
    expect(end.stage).toBe(3)
    expect(end.deliveredAtSimMin).toBeGreaterThanOrEqual(30)
    expect(end.deliveredAtSimMin).toBeLessThanOrEqual(40)
  })
  it('countdown only decreases as time passes (no reset)', () => {
    let last = Infinity
    for (let t = 0; t <= 60_000; t += 2_000) {
      const s = simulate(order, order.placedAt + t)
      expect(s.remainingMins).toBeLessThanOrEqual(last)
      last = s.remainingMins
    }
  })
})
