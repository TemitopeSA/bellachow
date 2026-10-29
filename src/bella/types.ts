import type { AreaId, Fulfilment, MenuItem, Vendor } from '../data/types'
import type { PriceBreakdown } from '../lib/pricing'

export type Craving =
  | 'spicy' | 'rice' | 'jollof' | 'swallow' | 'assorted meat' | 'chicken' | 'pizza' | 'healthy'
  | 'suya' | 'sweet' | 'drinks' | 'burger' | 'yam' | 'filling' | 'pastry'

export type Diet = 'no-pork' | 'vegetarian'

export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'late-night'

export type BellaIntent = {
  budget?: number
  budgetMode?: 'total' | 'per-person'
  /** Explicitly named area (resolved id). Absent → the user's selected delivery area is used. */
  area?: AreaId
  /** e.g. "GRA" from "Ikeja GRA" — kept for display only. */
  areaDetail?: string
  nearMe?: boolean
  maxMinutes?: number
  /** true when maxMinutes was inferred from "fast"/"starving" rather than a number. */
  maxMinutesInferred?: boolean
  urgent?: boolean
  people?: number
  cravings: Craving[]
  dietaryRestrictions: Diet[]
  mealTime?: MealTime
  spicy?: boolean
  groupOrder?: boolean
  priceFocus?: 'cheapest' | 'value'
  fulfilment?: Fulfilment
}

export type EtaFit = 'fits' | 'tight' | 'none'

export type Candidate = {
  item: MenuItem
  vendor: Vendor
  distanceKm: number
  eta: [number, number]
  pricing: PriceBreakdown
  open: boolean
}

export type RecTag = 'Best match' | 'Cheapest' | 'Fastest' | 'Matches craving' | 'In budget' | 'Alternative' | 'Closest option'

export type Recommendation = Candidate & {
  id: string
  score: number
  components: Record<string, number>
  matched: Craving[]
  missed: Craving[]
  etaFit: EtaFit
  withinBudget: boolean
  overBudgetBy: number
  dietUnverified: Diet[]
  tag?: RecTag
  reason: string
}

export type GroupLine = { item: MenuItem; qty: number }

export type GroupBasket = {
  id: string
  vendor: Vendor
  lines: GroupLine[]
  people: number
  distanceKm: number
  eta: [number, number]
  pricing: PriceBreakdown
  perPerson: number
  budget?: number
  matched: Craving[]
  dietUnverified: Diet[]
  reason: string
}

export type Constraint = 'budget' | 'time' | 'closed' | 'diet' | 'nomenu'

export type ExclusionStats = Record<Constraint | 'invalid', number>

export type Suggestion =
  | { kind: 'raise-budget'; to: number }
  | { kind: 'relax-time'; to: number }
  | { kind: 'pickup' }
  | { kind: 'change-area' }
  | { kind: 'drop-craving'; craving: Craving }
  | { kind: 'reduce-people'; to: number }
  | { kind: 'drop-diet' }

export type BellaResult = {
  intent: BellaIntent
  areaId: AreaId
  mode: 'single' | 'group'
  /** Full ranked eligible list; UI shows 3 at a time. */
  ranked: Recommendation[]
  group?: GroupBasket
  /** When nothing fits: the closest honest alternative, clearly flagged. */
  closest?: Recommendation
  binding?: Constraint
  suggestions: Suggestion[]
  /** Cravings with no supplied menu item at all. */
  unavailableCravings: Craving[]
  /** Listed vendors (no menu data yet) that might match unavailable cravings. */
  comingSoon: Vendor[]
  notes: string[]
  stats: ExclusionStats
  message: string
  source: 'rules' | 'rules+ai'
}
