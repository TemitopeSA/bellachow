import { QUICK_PROMPTS } from '../bella/fixtures'
import { DISCLOSURE } from '../lib/config'
import type { TourApi } from './TourProvider'

export type TourStep = {
  id: string
  title: string
  body: string
  disclosure?: string
  /** Initial spotlight selector (data-tour value). Steps may retarget during enter(). */
  target: string | ((api: TourApi) => string)
  /** Drives the real app into the state this step describes. Must be idempotent. */
  enter?: (api: TourApi) => Promise<void>
  /** Runs when the user presses Next on this step (before the next step's enter). */
  next?: (api: TourApi) => Promise<void>
  leave?: (api: TourApi) => void
}

const PROMPT = QUICK_PROMPTS[0]

async function ensureBellaResult(api: TourApi) {
  if (api.app().route.name !== 'bella') api.app().navigate({ name: 'bella' })
  await api.waitFor('chat-input')
  const hasResult = () => {
    const msgs = api.app().messages
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
    return lastUser?.role === 'user' && lastUser.text === PROMPT && msgs[msgs.length - 1].role === 'bella'
  }
  if (!hasResult()) {
    if (!api.app().busy) {
      // Type the prompt visibly, then submit it through the real engine (once).
      for (let i = 1; i <= PROMPT.length; i += 2) {
        if (api.cancelled()) return
        api.app().setDraft(PROMPT.slice(0, i))
        await api.sleep(28)
      }
      api.app().setDraft(PROMPT)
      await api.sleep(250)
      if (api.cancelled()) return
      void api.app().submitPrompt(PROMPT, 'tour')
    }
    await api.waitUntil(hasResult, 6000)
  }
  await api.waitFor('intent-pills')
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'meet',
    title: 'Meet BellaChow 👋',
    body: 'An AI food concierge concept for Chowdeck, by Temitope. 60 seconds, 8 taps.',
    disclosure: DISCLOSURE,
    target: 'phone',
    enter: async (api) => {
      api.app().closeSheet()
      if (api.app().route.name !== 'home') api.app().navigate({ name: 'home' })
      await api.waitFor('bella-banner')
    },
  },
  {
    id: 'banner',
    title: 'Start from "I don\'t know"',
    body: 'Today, hungry users scroll and scroll. Bella turns "I don\'t know what to eat" into a cart.',
    target: 'bella-banner',
    enter: async (api) => {
      api.app().closeSheet()
      if (api.app().route.name !== 'home') api.app().navigate({ name: 'home' })
      await api.waitFor('bella-banner')
      api.scrollTo('bella-banner')
    },
    next: async (api) => {
      api.click('bella-banner')
      await api.waitFor('chat-input')
    },
  },
  {
    id: 'type',
    title: 'Talk like a Lagosian',
    body: 'Users talk like Lagosians: budget, area, time, mood. No filters to learn.',
    target: 'chat-input',
    enter: async (api) => {
      api.app().closeSheet()
      await ensureBellaResult(api)
    },
  },
  {
    id: 'pills',
    title: 'Show what she understood',
    body: 'Bella shows what she understood. Tap any pill to change it. That builds trust.',
    target: 'intent-pills',
    enter: async (api) => {
      api.app().closeSheet()
      await ensureBellaResult(api)
      api.scrollTo('intent-pills', 'start')
    },
  },
  {
    id: 'price',
    title: 'The real price, up front',
    body: 'The price includes food, pack, delivery and service fee. Fee surprises come up in about 13% of 1–2 star Play Store reviews.',
    target: 'rec-price',
    enter: async (api) => {
      await ensureBellaResult(api)
      await api.waitFor('rec-price')
      api.scrollTo('rec-price', 'center')
      await api.sleep(450)
      if (api.cancelled()) return
      api.click('rec-breakdown')
      await api.waitFor('breakdown-sheet')
      api.setTarget('breakdown-sheet')
    },
    leave: (api) => api.app().closeSheet(),
  },
  {
    id: 'eta',
    title: 'Honest arrival times',
    body: 'Honest arrival times based on distance and prep time. About 38% of 1–2 star reviews mention delays.',
    target: 'rec-eta',
    enter: async (api) => {
      api.app().closeSheet()
      await ensureBellaResult(api)
      await api.waitFor('rec-eta')
      api.scrollTo('rec-eta', 'center')
    },
  },
  {
    id: 'checkout',
    title: 'One tap to checkout',
    body: 'One tap from idea to checkout. Fewer steps, higher conversion.',
    target: 'rec-add',
    enter: async (api) => {
      api.app().closeSheet()
      await ensureBellaResult(api)
      await api.waitFor('rec-add')
      api.scrollTo('rec-add', 'center')
      api.prepareCartForTour()
      await api.sleep(500)
      if (api.cancelled()) return
      api.click('rec-add')
      await api.waitUntil(() => api.app().cart.lines.length > 0, 3000)
      await api.sleep(700)
      if (api.cancelled()) return
      api.app().navigate({ name: 'cart' })
      await api.waitFor('cart-continue')
      api.setTarget('cart-continue')
      await api.sleep(1000)
      if (api.cancelled()) return
      api.app().navigate({ name: 'checkout' })
      await api.waitFor('checkout-place')
      api.setTarget('checkout-place')
    },
  },
  {
    id: 'lead',
    title: 'The plan behind it',
    body: "How I'd measure it, ship it and grow it. Want the full plan? Let's talk.",
    target: 'product-lead-contacts',
    enter: async (api) => {
      api.app().closeSheet()
      if (!api.panelVisible()) {
        api.app().navigate({ name: 'lead' })
      }
      await api.waitFor('product-lead-contacts')
      api.scrollTo('product-lead-contacts', 'center')
    },
  },
]
