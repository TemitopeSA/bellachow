/**
 * Every commercial assumption used by the demo lives here.
 * These are ILLUSTRATIVE PRODUCT-MODEL ASSUMPTIONS for a portfolio prototype —
 * not verified Chowdeck tariffs, fees or courier quotes.
 */
export const PRICING = {
  /** Order-level packaging: base + per extra unit, clamped to [min, max]. */
  packaging: { min: 200, max: 500, base: 300, perExtraUnit: 100 },
  /** Delivery: base + per straight-line km, capped. Rounded to the nearest roundTo naira. */
  delivery: { base: 500, perKm: 150, cap: 2500, roundTo: 50 },
  /** Service fee as a share of food subtotal, capped. */
  service: { rate: 0.06, cap: 750 },
  /** Chowpass (demo toggle only — no membership is bought). Waives delivery on the simulated order. */
  chowpass: { waivesDelivery: true, illustrativeMonthlyPrice: 2000 },
  /** Pickup removes delivery only; packaging and service still apply. */
  pickup: { removesDelivery: true },
} as const

export const ETA = {
  minutesPerKm: 3,
  bufferMins: 5,
  /** "fast", "ASAP", "I'm starving" with no explicit number. */
  defaultFastMaxMins: 30,
} as const

/**
 * Demo clock. Vendor hours are illustrative demo configuration, so the presentation
 * defaults to a fixed Lagos lunchtime to keep open/closed states deterministic.
 */
export type DemoClockMode = 'lunch' | 'late' | 'live'
export const DEMO_CLOCKS: Record<Exclude<DemoClockMode, 'live'>, { label: string; minutes: number }> = {
  lunch: { label: 'Lunch · 1:15 PM', minutes: 13 * 60 + 15 },
  late: { label: 'Late night · 10:30 PM', minutes: 22 * 60 + 30 },
}

export const USER = { firstName: 'Temi' }

export const CONTACT = {
  name: 'Temitope Samuel Akinmoladun',
  email: 'mailto:topkin4real@gmail.com',
  linkedin: 'https://www.linkedin.com/in/temitope-akinmoladun-935656207/',
  portfolio: 'https://temi-sa.vercel.app/',
}

export const DISCLOSURE =
  'An unofficial product concept by Temitope Samuel Akinmoladun. Not affiliated with Chowdeck.'
