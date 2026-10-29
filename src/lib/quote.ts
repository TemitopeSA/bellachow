import { distanceTo, getArea, getItem, getVendor } from '../data/dataAccess'
import type { AreaId, Fulfilment, MenuItem, Vendor } from '../data/types'
import { etaRange } from './delivery'
import { deliveryFee, priceOrder, type PriceBreakdown } from './pricing'

export type QuoteLine = { itemId: string; qty: number }

export type Quote = {
  vendor: Vendor
  lines: { item: MenuItem; qty: number }[]
  pricing: PriceBreakdown
  eta: [number, number] | null
  distanceKm: number
}

/**
 * Quote any basket (a single recommendation, a group basket, or the cart) with the
 * same central pricing + ETA functions. This is what keeps every screen reconciled.
 */
export function quote(vendorId: string | null, lines: QuoteLine[], areaId: AreaId, fulfilment: Fulfilment, chowpass: boolean): Quote | null {
  const vendor = getVendor(vendorId)
  if (!vendor) return null
  const km = distanceTo(vendor, getArea(areaId))
  if (km == null) return null
  const resolved = lines
    .map((l) => ({ item: getItem(l.itemId), qty: l.qty }))
    .filter((l): l is { item: MenuItem; qty: number } => !!l.item && l.item.vendorId === vendor.id && l.qty > 0)
  const pricing = priceOrder({ lines: resolved.map((l) => ({ price: l.item.price, qty: l.qty })), distanceKm: km, fulfilment, chowpass })
  return { vendor, lines: resolved, pricing, eta: vendor.prepMins ? etaRange(vendor.prepMins, km, fulfilment) : null, distanceKm: km }
}

/** Card-level metadata for a vendor (delivery fee estimate, ETA, distance) from the same central functions. */
export function vendorMeta(vendor: Vendor, areaId: AreaId, fulfilment: Fulfilment, chowpass: boolean) {
  const km = distanceTo(vendor, getArea(areaId))
  if (km == null) return { km: null, fee: null, eta: null }
  const fee = fulfilment === 'pickup' || chowpass ? 0 : deliveryFee(km)
  return { km, fee, eta: vendor.prepMins ? etaRange(vendor.prepMins, km, fulfilment) : null }
}
