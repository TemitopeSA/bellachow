import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AREAS, getArea, getItem, getVendor, isOrderable } from '../data/dataAccess'
import type { AreaId, Cart, Fulfilment, OrderSnapshot, PaymentMethod } from '../data/types'
import { parseIntent, summarizeIntent } from '../bella/parse'
import { runBella } from '../bella/respond'
import { aiAvailable, askAi, mergeIntent } from '../bella/ai'
import type { RankContext } from '../bella/rank'
import type { BellaIntent, GroupBasket, Recommendation } from '../bella/types'
import { DEMO_CLOCKS, type DemoClockMode } from '../lib/config'
import { lagosMinuteOfDay, openStatus } from '../lib/delivery'
import { budgetBand } from '../lib/formatting'
import { quote, type Quote, type QuoteLine } from '../lib/quote'
import { clearAll, load, save } from '../lib/storage'
import { resetEvents, track } from '../lib/analytics'
import { pathFor, routeFromPath, type Route } from './routes'

/* ---------------- chat model ---------------- */

export type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'bella'; kind: 'text'; text: string }
  | {
      id: string
      role: 'bella'
      kind: 'result'
      intent: BellaIntent
      /** Stable recommendation keys (brand:slug) currently shown, in order. */
      shown: string[]
      swappedOut: string[]
      aiOrder?: string[]
      createdAt: number
    }

export const recKey = (r: Recommendation) => `${r.vendor.brand}:${r.item.slug}`

/* ---------------- sheets ---------------- */

export type BreakdownSource = { title: string; vendorId: string; lines: QuoteLine[]; areaId: AreaId; recId?: string }

export type Sheet =
  | { kind: 'breakdown'; source: BreakdownSource }
  | { kind: 'area' }
  | { kind: 'pill'; msgId: string; field: PillField }
  | { kind: 'switch-vendor'; vendorName: string; onConfirm: () => void }
  | { kind: 'confirm'; title: string; body: string; confirmLabel: string; onConfirm: () => void }
  | { kind: 'rider-chat' }

export type PillField = 'budget' | 'area' | 'time' | 'cravings' | 'people' | 'diet'

type AddOpts = { source: 'bella' | 'menu' | 'search'; rec?: Recommendation; intent?: BellaIntent; silent?: boolean }

type AppState = {
  route: Route
  navigate: (r: Route, opts?: { replace?: boolean }) => void
  back: () => void
  areaId: AreaId
  address: string
  setArea: (id: AreaId, opts?: { silent?: boolean }) => void
  chowpass: boolean
  setChowpass: (v: boolean) => void
  fulfilment: Fulfilment
  setFulfilment: (f: Fulfilment) => void
  clockMode: DemoClockMode
  setClockMode: (m: DemoClockMode) => void
  minuteOfDay: number
  ctxFor: (intent?: BellaIntent) => RankContext
  vendorStatus: (vendorId: string) => ReturnType<typeof openStatus>
  cart: Cart
  cartQuote: Quote | null
  addToCart: (itemId: string, opts: AddOpts) => void
  addBasket: (basket: GroupBasket, intent: BellaIntent) => void
  setQty: (itemId: string, qty: number) => void
  loadCart: (vendorId: string, lines: { itemId: string; qty: number }[]) => boolean
  clearCart: () => void
  setNote: (note: string) => void
  orders: OrderSnapshot[]
  placeOrder: (payment: PaymentMethod) => string | null
  messages: ChatMessage[]
  busy: boolean
  draft: string
  setDraft: (s: string) => void
  submitPrompt: (text: string, source: 'typed' | 'quick' | 'tour' | 'home') => Promise<void>
  updateIntent: (msgId: string, intent: BellaIntent) => void
  showMore: (msgId: string) => void
  swap: (msgId: string, key: string) => void
  resetChat: () => void
  sheet: Sheet | null
  openSheet: (s: Sheet) => void
  closeSheet: () => void
  toast: { id: number; text: string } | null
  showToast: (text: string) => void
  resetDemo: () => void
  bellaOpenedAt: React.MutableRefObject<number | null>
}

const Ctx = createContext<AppState | null>(null)

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside AppProvider')
  return v
}

const emptyCart: Cart = { vendorId: null, lines: [], note: '' }
const uid = () => Math.random().toString(36).slice(2, 10)

export const GREETING_ID = 'greeting'
const greeting = (): ChatMessage[] => [
  { id: GREETING_ID, role: 'bella', kind: 'text', text: 'Hey Temi 👋 What are you craving? Tell me your budget, where you are and how hungry you are.' },
  { id: 'greeting-2', role: 'bella', kind: 'text', text: "I'll find meals that fit your budget and show you the full estimated cost before you order." },
]

/** Stable, deterministic demo order ID: sequence + checksum of vendor/total. */
function orderId(seq: number, vendorId: string, total: number) {
  let h = 7
  for (const ch of `${vendorId}|${total}|${seq}`) h = (h * 31 + ch.charCodeAt(0)) % 1679616
  return `BC-${String(1040 + seq)}-${h.toString(36).toUpperCase().padStart(4, '0')}`
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => routeFromPath(typeof window !== 'undefined' ? window.location.pathname : '/'))
  const [areaId, setAreaId] = useState<AreaId>(() => {
    const a = load<string>('area', 'yaba')
    return AREAS.some((x) => x.id === a) ? a : 'yaba'
  })
  const [chowpass, setChowpassState] = useState<boolean>(() => load('chowpass', false))
  const [fulfilment, setFulfilmentState] = useState<Fulfilment>(() => load<Fulfilment>('fulfilment', 'delivery'))
  const [clockMode, setClockModeState] = useState<DemoClockMode>(() => load<DemoClockMode>('clock', 'lunch'))
  const [liveNow, setLiveNow] = useState(() => Date.now())
  const [cart, setCart] = useState<Cart>(() => load<Cart>('cart', emptyCart))
  const [orders, setOrders] = useState<OrderSnapshot[]>(() => load<OrderSnapshot[]>('orders', []))
  const [messages, setMessages] = useState<ChatMessage[]>(greeting)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const bellaOpenedAt = useRef<number | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => save('area', areaId), [areaId])
  useEffect(() => save('chowpass', chowpass), [chowpass])
  useEffect(() => save('fulfilment', fulfilment), [fulfilment])
  useEffect(() => save('clock', clockMode), [clockMode])
  useEffect(() => save('cart', cart), [cart])
  useEffect(() => save('orders', orders), [orders])

  useEffect(() => {
    if (clockMode !== 'live') return
    const t = window.setInterval(() => setLiveNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [clockMode])

  const minuteOfDay = clockMode === 'live' ? lagosMinuteOfDay(new Date(liveNow)) : DEMO_CLOCKS[clockMode].minutes

  /* ---------- routing (history-synced) ---------- */
  useEffect(() => {
    const onPop = () => setRoute(routeFromPath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((r: Route, opts?: { replace?: boolean }) => {
    setSheet(null)
    setRoute(r)
    const path = pathFor(r)
    try {
      if (window.location.pathname !== path) {
        if (opts?.replace) window.history.replaceState(null, '', path)
        else window.history.pushState(null, '', path)
      }
    } catch {
      /* sandboxed iframes may block history; in-memory routing still works */
    }
    document.querySelector('[data-scroll-root]')?.scrollTo({ top: 0 })
  }, [])

  const back = useCallback(() => {
    if (window.history.length > 1 && route.name !== 'home') window.history.back()
    else navigate({ name: 'home' })
  }, [navigate, route.name])

  /* ---------- toast & sheets ---------- */
  const showToast = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text })
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])
  const openSheet = useCallback((s: Sheet) => {
    setSheet(s)
    if (s.kind === 'breakdown') track('price_breakdown_opened', { vendorId: s.source.vendorId, recommendationId: s.source.recId })
  }, [])
  const closeSheet = useCallback(() => setSheet(null), [])

  /* ---------- settings ---------- */
  const setArea = useCallback(
    (id: AreaId, opts?: { silent?: boolean }) => {
      setAreaId((prev) => {
        if (prev !== id && !opts?.silent) showToast(`Delivering to ${getArea(id).name}`)
        return id
      })
    },
    [showToast],
  )
  const setChowpass = useCallback((v: boolean) => setChowpassState(v), [])
  const setFulfilment = useCallback((f: Fulfilment) => setFulfilmentState(f), [])
  const setClockMode = useCallback((m: DemoClockMode) => setClockModeState(m), [])

  const ctxFor = useCallback(
    (intent?: BellaIntent): RankContext => ({
      areaId: intent?.area ?? areaId,
      minuteOfDay,
      chowpass,
      fulfilment: intent?.fulfilment ?? fulfilment,
    }),
    [areaId, minuteOfDay, chowpass, fulfilment],
  )

  const vendorStatus = useCallback((vendorId: string) => openStatus(getVendor(vendorId)?.hours ?? null, minuteOfDay), [minuteOfDay])

  /* ---------- cart ---------- */
  const cartQuote = useMemo(
    () => (cart.vendorId && cart.lines.length ? quote(cart.vendorId, cart.lines, areaId, fulfilment, chowpass) : null),
    [cart, areaId, fulfilment, chowpass],
  )

  const guardVendor = useCallback(
    (vendorId: string, proceed: () => void) => {
      const v = getVendor(vendorId)
      if (!v || !isOrderable(v)) {
        showToast('Menu data coming soon for this vendor')
        return
      }
      if (openStatus(v.hours, minuteOfDay).state !== 'open') {
        showToast(`${v.name} is closed right now`)
        return
      }
      if (cart.vendorId && cart.vendorId !== vendorId && cart.lines.length) {
        const current = getVendor(cart.vendorId)
        setSheet({ kind: 'switch-vendor', vendorName: current?.name ?? 'another vendor', onConfirm: proceed })
        return
      }
      proceed()
    },
    [cart, minuteOfDay, showToast],
  )

  const addToCart = useCallback(
    (itemId: string, opts: AddOpts) => {
      const item = getItem(itemId)
      if (!item) return
      guardVendor(item.vendorId, () => {
        setSheet(null)
        const now = Date.now()
        setCart((c) => {
          const same = c.vendorId === item.vendorId
          const lines = same ? [...c.lines] : []
          const i = lines.findIndex((l) => l.itemId === itemId)
          if (i >= 0) lines[i] = { ...lines[i], qty: Math.min(20, lines[i].qty + 1) }
          else lines.push({ itemId, qty: 1 })
          const bellaContext =
            opts.rec && opts.intent
              ? {
                  recommendationId: opts.rec.id,
                  intentSummary: summarizeIntent(opts.intent),
                  promisedEta: opts.rec.eta,
                  group: false,
                  addedAt: now,
                  bellaOpenedAt: bellaOpenedAt.current ?? undefined,
                }
              : same
                ? c.bellaContext
                : undefined
          return { vendorId: item.vendorId, lines, note: same ? c.note : '', bellaContext }
        })
        const ttfa = opts.source === 'bella' && bellaOpenedAt.current ? Math.round((now - bellaOpenedAt.current) / 1000) : undefined
        track('item_added_to_cart', { source: opts.source, vendorId: item.vendorId, recommendationId: opts.rec?.id, timeToFirstAddSec: ttfa, group: false })
        if (!opts.silent) showToast(`Added ${item.name} to cart`)
      })
    },
    [guardVendor, showToast],
  )

  const addBasket = useCallback(
    (basket: GroupBasket, intent: BellaIntent) => {
      guardVendor(basket.vendor.id, () => {
        setSheet(null)
        const now = Date.now()
        setCart({
          vendorId: basket.vendor.id,
          lines: basket.lines.map((l) => ({ itemId: l.item.id, qty: l.qty })),
          note: `Group order for ${basket.people}`,
          bellaContext: {
            recommendationId: basket.id,
            intentSummary: summarizeIntent(intent),
            promisedEta: basket.eta,
            group: true,
            addedAt: now,
            bellaOpenedAt: bellaOpenedAt.current ?? undefined,
          },
        })
        const ttfa = bellaOpenedAt.current ? Math.round((now - bellaOpenedAt.current) / 1000) : undefined
        track('item_added_to_cart', { source: 'bella', vendorId: basket.vendor.id, recommendationId: basket.id, timeToFirstAddSec: ttfa, group: true, units: basket.lines.reduce((s, l) => s + l.qty, 0) })
        showToast(`Group basket for ${basket.people} added to cart`)
      })
    },
    [guardVendor, showToast],
  )

  const setQty = useCallback((itemId: string, qty: number) => {
    setCart((c) => {
      const lines = c.lines.map((l) => (l.itemId === itemId ? { ...l, qty: Math.max(0, Math.min(20, qty)) } : l)).filter((l) => l.qty > 0)
      return lines.length ? { ...c, lines } : emptyCart
    })
  }, [])
  const loadCart = useCallback(
    (vendorId: string, lines: { itemId: string; qty: number }[]) => {
      const v = getVendor(vendorId)
      if (!v || !isOrderable(v) || openStatus(v.hours, minuteOfDay).state !== 'open') {
        showToast(`${v?.name ?? 'That vendor'} is closed right now`)
        return false
      }
      setCart({ vendorId, lines: lines.filter((l) => getItem(l.itemId)), note: '' })
      return true
    },
    [minuteOfDay, showToast],
  )
  const clearCart = useCallback(() => setCart(emptyCart), [])
  const setNote = useCallback((note: string) => setCart((c) => ({ ...c, note: note.slice(0, 140) })), [])

  /* ---------- checkout ---------- */
  const placeOrder = useCallback(
    (payment: PaymentMethod): string | null => {
      const q = cartQuote
      if (!q || !q.lines.length || !q.eta) return null
      const v = q.vendor
      if (openStatus(v.hours, minuteOfDay).state !== 'open') {
        showToast(`${v.name} is closed — order not placed`)
        return null
      }
      // Validate the total reconciles before freezing it.
      const p = q.pricing
      if (p.total !== p.food + p.packaging + p.delivery + p.service || p.total <= 0) return null
      const area = getArea(areaId)
      const id = orderId(orders.length, v.id, p.total)
      const snap: OrderSnapshot = {
        id,
        placedAt: Date.now(),
        placedClockMin: minuteOfDay,
        vendorId: v.id,
        vendorName: v.name,
        areaId,
        areaName: area.name,
        address: area.defaultAddress,
        fulfilment,
        chowpass,
        lines: q.lines.map((l) => ({ itemId: l.item.id, name: l.item.name, emoji: l.item.emoji, unitPrice: l.item.price, qty: l.qty })),
        pricing: p,
        eta: q.eta,
        payment,
        note: cart.note,
        viaBella: !!cart.bellaContext,
        group: !!cart.bellaContext?.group,
      }
      setOrders((o) => [snap, ...o])
      setCart(emptyCart)
      track('order_placed', { orderId: id, vendorId: v.id, total: p.total, viaBella: snap.viaBella, group: snap.group, area: areaId, payment })
      navigate({ name: 'tracking', orderId: id })
      return id
    },
    [cartQuote, minuteOfDay, areaId, orders.length, fulfilment, chowpass, cart, navigate, showToast],
  )

  /* ---------- Bella ---------- */
  const busyRef = useRef(false)
  const submitPrompt = useCallback(
    async (text: string, source: 'typed' | 'quick' | 'tour' | 'home') => {
      const clean = text.trim().slice(0, 300)
      if (!clean || busyRef.current) return
      busyRef.current = true
      setBusy(true)
      setDraft('')
      setMessages((m) => [...m, { id: uid(), role: 'user', text: clean }])
      let intent = parseIntent(clean)
      track('prompt_submitted', { source, length: clean.length })
      const started = Date.now()
      let aiOrder: string[] | undefined
      try {
        if (await aiAvailable()) {
          const local = runBella(intent, ctxFor(intent))
          const allowed = local.ranked.slice(0, 40).map((r) => ({ id: r.item.id, name: r.item.name, vendor: r.vendor.name, price: r.item.price, tags: r.item.tags }))
          const ai = await askAi(clean, intent, allowed)
          if (ai) {
            intent = mergeIntent(intent, ai.parsed)
            aiOrder = ai.pickIds
          }
        }
      } catch {
        /* silent fallback to rules */
      }
      const wait = 700 - (Date.now() - started)
      if (wait > 0) await new Promise((r) => setTimeout(r, wait))
      if (intent.area) setArea(intent.area, { silent: true })
      const result = runBella(intent, { ...ctxFor(intent), areaId: intent.area ?? areaId })
      let ranked = result.ranked
      if (aiOrder?.length) {
        const pos = new Map(aiOrder.map((id, i) => [id, i]))
        ranked = [...ranked].sort((a, b) => (pos.get(a.item.id) ?? 99) - (pos.get(b.item.id) ?? 99))
      }
      track('intent_parsed', {
        budgetBand: budgetBand(intent.budget),
        area: intent.area ?? areaId,
        explicitArea: !!intent.area,
        maxMinutes: intent.maxMinutes,
        people: intent.people,
        cravings: intent.cravings.join('+'),
        diet: intent.dietaryRestrictions.join('+'),
        group: !!intent.groupOrder,
      })
      track('recommendations_shown', { count: result.group ? 1 : Math.min(3, ranked.length), group: result.mode === 'group', binding: result.binding, ai: !!aiOrder?.length })
      setMessages((m) => [
        ...m,
        { id: uid(), role: 'bella', kind: 'result', intent, shown: ranked.slice(0, 3).map(recKey), swappedOut: [], aiOrder, createdAt: Date.now() },
      ])
      busyRef.current = false
      setBusy(false)
    },
    [ctxFor, areaId, setArea],
  )

  const rankedFor = useCallback(
    (intent: BellaIntent, aiOrder?: string[]) => {
      let ranked = runBella(intent, ctxFor(intent)).ranked
      if (aiOrder?.length) {
        const pos = new Map(aiOrder.map((id, i) => [id, i]))
        ranked = [...ranked].sort((a, b) => (pos.get(a.item.id) ?? 99) - (pos.get(b.item.id) ?? 99))
      }
      return ranked
    },
    [ctxFor],
  )

  const updateIntent = useCallback(
    (msgId: string, intent: BellaIntent) => {
      if (intent.area) setArea(intent.area, { silent: true })
      const ranked = runBella(intent, { ...ctxFor(intent), areaId: intent.area ?? areaId }).ranked
      setMessages((ms) =>
        ms.map((m) => (m.id === msgId && m.role === 'bella' && m.kind === 'result' ? { ...m, intent, shown: ranked.slice(0, 3).map(recKey), swappedOut: [], aiOrder: undefined } : m)),
      )
      track('intent_edited', { budgetBand: budgetBand(intent.budget), area: intent.area ?? areaId, group: !!intent.groupOrder })
      track('recommendations_shown', { count: Math.min(3, ranked.length), edited: true })
    },
    [ctxFor, areaId, setArea],
  )

  const showMore = useCallback(
    (msgId: string) => {
      setMessages((ms) =>
        ms.map((m) => {
          if (m.id !== msgId || m.role !== 'bella' || m.kind !== 'result') return m
          const ranked = rankedFor(m.intent, m.aiOrder).map(recKey)
          const next = ranked.filter((k) => !m.shown.includes(k) && !m.swappedOut.includes(k)).slice(0, 3)
          return { ...m, shown: [...m.shown, ...next] }
        }),
      )
    },
    [rankedFor],
  )

  const swap = useCallback(
    (msgId: string, key: string) => {
      const m = messages.find((x) => x.id === msgId)
      if (!m || m.role !== 'bella' || m.kind !== 'result') return
      const ranked = rankedFor(m.intent, m.aiOrder).map(recKey)
      const replacement = ranked.find((k) => !m.shown.includes(k) && !m.swappedOut.includes(k) && k !== key)
      if (!replacement) {
        showToast('No other options fit those constraints')
        return
      }
      setMessages((ms) =>
        ms.map((x) =>
          x.id === msgId && x.role === 'bella' && x.kind === 'result'
            ? { ...x, shown: x.shown.map((k) => (k === key ? replacement : k)), swappedOut: [...x.swappedOut, key] }
            : x,
        ),
      )
      showToast('Swapped — same budget, area and time')
      track('recommendation_swapped', { from: key, to: replacement })
    },
    [messages, rankedFor, showToast],
  )

  const resetChat = useCallback(() => {
    setMessages(greeting())
    setDraft('')
  }, [])

  const resetDemo = useCallback(() => {
    clearAll()
    resetEvents()
    setAreaId('yaba')
    setChowpassState(false)
    setFulfilmentState('delivery')
    setClockModeState('lunch')
    setCart(emptyCart)
    setOrders([])
    setMessages(greeting())
    setDraft('')
    setSheet(null)
    navigate({ name: 'home' }, { replace: true })
    showToast('Demo reset')
  }, [navigate, showToast])

  // Route-level analytics.
  useEffect(() => {
    if (route.name === 'home') track('home_viewed', { area: areaId })
    if (route.name === 'bella') {
      bellaOpenedAt.current = Date.now()
      track('bella_opened', { area: areaId })
    }
    if (route.name === 'cart') track('cart_viewed', { vendorId: cart.vendorId ?? undefined })
    if (route.name === 'checkout') track('checkout_started', { vendorId: cart.vendorId ?? undefined })
    if (route.name === 'tracking') track('tracking_viewed', { orderId: route.orderId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route])

  const value: AppState = {
    route, navigate, back,
    areaId, address: getArea(areaId).defaultAddress, setArea,
    chowpass, setChowpass, fulfilment, setFulfilment, clockMode, setClockMode, minuteOfDay,
    ctxFor, vendorStatus,
    cart, cartQuote, addToCart, addBasket, setQty, loadCart, clearCart, setNote,
    orders, placeOrder,
    messages, busy, draft, setDraft, submitPrompt, updateIntent, showMore, swap, resetChat,
    sheet, openSheet, closeSheet, toast, showToast, resetDemo, bellaOpenedAt,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
