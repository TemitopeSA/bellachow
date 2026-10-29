export type AreaId = string

export type Area = {
  id: AreaId
  name: string
  short: string
  lat: number
  lng: number
  aliases: string[]
  defaultAddress: string
}

export type Hours = { opens: string; closes: string }

export type MenuItem = {
  /** Globally unique: `${vendorId}:${slug}` */
  id: string
  slug: string
  vendorId: string
  name: string
  section: string
  /** Approximate reference price in whole naira. */
  price: number
  /** Historical reference price supplied by the brief — not a current verified price. */
  previousPrice?: number
  tags: string[]
  diet: string[]
  emoji: string
}

export type Vendor = {
  id: string
  brand: string
  /** Display name, e.g. "Chicken Republic — Yaba" */
  name: string
  branch: string | null
  area: AreaId | null
  address: string | null
  lat: number | null
  lng: number | null
  rating: number | null
  ratingCount: string | null
  prepMins: [number, number] | null
  hours: Hours | null
  verified: boolean
  promo: string[]
  categories: string[]
  keywords: string[]
  menuId: string | null
  provenance: string
  items: MenuItem[]
}

export type Fulfilment = 'delivery' | 'pickup'

export type CartLine = {
  itemId: string
  qty: number
}

export type Cart = {
  vendorId: string | null
  lines: CartLine[]
  note: string
  /** Set when the basket came from a Bella recommendation — kept for measurement/context. */
  bellaContext?: {
    recommendationId: string
    intentSummary: string
    promisedEta: [number, number]
    group: boolean
    addedAt: number
    bellaOpenedAt?: number
  }
}

export type PaymentMethod = 'card' | 'transfer' | 'wallet'

export type OrderSnapshot = {
  id: string
  placedAt: number
  /** Demo-clock minute of day when placed — used to show the promised arrival clock time. */
  placedClockMin: number
  vendorId: string
  vendorName: string
  areaId: AreaId
  areaName: string
  address: string
  fulfilment: Fulfilment
  chowpass: boolean
  lines: { itemId: string; name: string; emoji: string; unitPrice: number; qty: number }[]
  pricing: import('../lib/pricing').PriceBreakdown
  /** Promised window in minutes from placedAt — frozen at checkout. */
  eta: [number, number]
  payment: PaymentMethod
  note: string
  viaBella: boolean
  group: boolean
}
