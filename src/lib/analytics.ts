import { load, save } from './storage'

/**
 * Simulated, local-only product analytics. Nothing leaves the browser.
 * Raw chat text is never logged — only structured intent properties.
 */
export type EventName =
  | 'home_viewed'
  | 'bella_opened'
  | 'prompt_submitted'
  | 'intent_parsed'
  | 'recommendations_shown'
  | 'recommendation_swapped'
  | 'price_breakdown_opened'
  | 'item_added_to_cart'
  | 'cart_viewed'
  | 'checkout_started'
  | 'order_placed'
  | 'tracking_viewed'
  | 'order_delivered'
  | 'intent_edited'

export type EventProps = Record<string, string | number | boolean | undefined>
export type AnalyticsEvent = { name: EventName; at: number; props: EventProps }

const KEY = 'events'
const MAX = 400
let events: AnalyticsEvent[] = load<AnalyticsEvent[]>(KEY, [])
const listeners = new Set<() => void>()

export function track(name: EventName, props: EventProps = {}) {
  events = [...events, { name, at: Date.now(), props }].slice(-MAX)
  save(KEY, events)
  listeners.forEach((l) => l())
}

export function getEvents() {
  return events
}

export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function resetEvents() {
  events = []
  save(KEY, events)
  listeners.forEach((l) => l())
}

export function funnel(list: AnalyticsEvent[] = events) {
  const count = (n: EventName) => list.filter((e) => e.name === n).length
  const bellaOrders = list.filter((e) => e.name === 'order_placed' && e.props.viaBella).length
  const adds = list.filter((e) => e.name === 'item_added_to_cart' && e.props.source === 'bella')
  const ttfa = adds.map((e) => Number(e.props.timeToFirstAddSec)).filter((n) => Number.isFinite(n) && n > 0)
  return {
    bellaOpened: count('bella_opened'),
    promptSubmitted: count('prompt_submitted'),
    recsShown: count('recommendations_shown'),
    bellaAdds: adds.length,
    ordersViaBella: bellaOrders,
    ordersTotal: count('order_placed'),
    breakdownOpened: count('price_breakdown_opened'),
    medianTimeToFirstAddSec: ttfa.length ? ttfa.sort((a, b) => a - b)[Math.floor(ttfa.length / 2)] : null,
  }
}
