import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../app/AppProvider'
import type { Cart } from '../data/types'
import { load, save } from '../lib/storage'
import { TourOverlay } from './TourOverlay'
import { TOUR_STEPS } from './tourSteps'
import { TourCtx, type TourControls } from './useTour'

export type TourApi = {
  app: () => ReturnType<typeof useApp>
  waitFor: (tourId: string, timeoutMs?: number) => Promise<HTMLElement | null>
  waitUntil: (pred: () => boolean, timeoutMs?: number) => Promise<boolean>
  sleep: (ms: number) => Promise<void>
  click: (tourId: string) => void
  scrollTo: (tourId: string, block?: ScrollLogicalPosition) => void
  setTarget: (tourId: string) => void
  cancelled: () => boolean
  panelVisible: () => boolean
  prepareCartForTour: () => void
}

/** Returns the first *visible* element with this data-tour id (the panel exists twice on some layouts). */
export function findTarget(id: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`))
  return all.find((el) => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
  }) ?? null
}

const DONE_KEY = 'tourDone'

/** Scroll only the element's own scroll container (not the page) when it lives inside the phone. */
function scrollWithin(el: HTMLElement | null, block: ScrollLogicalPosition) {
  if (!el) return
  if (!el.closest('[data-tour="phone"]')) return el.scrollIntoView({ block, behavior: 'smooth' })
  let p = el.parentElement
  while (p && !/(auto|scroll)/.test(getComputedStyle(p).overflowY)) p = p.parentElement
  if (!p) return
  const pr = p.getBoundingClientRect()
  const er = el.getBoundingClientRect()
  const scale = pr.height / p.clientHeight || 1
  const rel = (er.top - pr.top) / scale + p.scrollTop
  const h = er.height / scale
  const top = block === 'start' ? rel - 12 : block === 'center' ? rel - (p.clientHeight - h) / 2 : rel - Math.max(0, p.clientHeight - h - 12)
  p.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

export function TourProvider({ children }: { children: ReactNode }) {
  const app = useApp()
  const appRef = useRef(app)
  appRef.current = app
  const [active, setActive] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [index, setIndex] = useState(0)
  const [target, setTargetState] = useState<string>('phone')
  const [busy, setBusy] = useState(false)
  const token = useRef(0)
  const cartSnapshot = useRef<Cart | null | undefined>(undefined)

  const makeApi = useCallback((my: number): TourApi => {
    const cancelled = () => token.current !== my
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
    const waitUntil = async (pred: () => boolean, timeoutMs = 4000) => {
      const end = Date.now() + timeoutMs
      while (Date.now() < end) {
        if (cancelled()) return false
        if (pred()) return true
        await new Promise((r) => requestAnimationFrame(() => r(null)))
      }
      return pred()
    }
    return {
      app: () => appRef.current,
      sleep,
      waitUntil,
      waitFor: async (id, timeoutMs = 4000) => {
        await waitUntil(() => !!findTarget(id), timeoutMs)
        return findTarget(id)
      },
      click: (id) => findTarget(id)?.click(),
      scrollTo: (id, block = 'nearest') => scrollWithin(findTarget(id), block),
      setTarget: (id) => {
        if (!cancelled()) setTargetState(id)
      },
      cancelled,
      panelVisible: () => {
        const el = document.querySelector<HTMLElement>('[data-panel="desktop"]')
        return !!el && el.getBoundingClientRect().width > 0
      },
      prepareCartForTour: () => {
        const a = appRef.current
        if (cartSnapshot.current === undefined) cartSnapshot.current = a.cart.lines.length ? a.cart : null
        if (a.cart.lines.length) a.clearCart()
      },
    }
  }, [])

  const run = useCallback(
    async (i: number) => {
      const my = ++token.current
      const step = TOUR_STEPS[i]
      const api = makeApi(my)
      setTargetState(typeof step.target === 'function' ? step.target(api) : step.target)
      setBusy(true)
      try {
        await step.enter?.(api)
      } finally {
        if (token.current === my) setBusy(false)
      }
    },
    [makeApi],
  )

  const go = useCallback(
    async (i: number, viaNext: boolean) => {
      const cur = TOUR_STEPS[index]
      const api = makeApi(token.current)
      cur?.leave?.(api)
      if (viaNext && cur?.next) {
        setBusy(true)
        await cur.next(api)
      }
      setIndex(i)
      void run(i)
    },
    [index, makeApi, run],
  )

  const finish = useCallback((reason: 'skip' | 'done') => {
    token.current++
    save(DONE_KEY, true)
    setActive(false)
    setBusy(false)
    appRef.current.closeSheet()
    const snap = cartSnapshot.current
    if (snap && snap.vendorId) appRef.current.loadCart(snap.vendorId, snap.lines)
    cartSnapshot.current = undefined
    if (reason === 'done') setCompleted(true)
  }, [])

  const start = useCallback(() => {
    setCompleted(false)
    setActive(true)
    setIndex(0)
    cartSnapshot.current = undefined
    void run(0)
  }, [run])

  // Auto-start once on first visit.
  useEffect(() => {
    if (load(DONE_KEY, false)) return
    const t = window.setTimeout(() => start(), 900)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const controls: TourControls = useMemo(() => ({ active, completed, index, start, stop: (r = 'skip') => finish(r) }), [active, completed, index, start, finish])

  return (
    <TourCtx.Provider value={controls}>
      {children}
      {(active || completed) && (
        <TourOverlay
          active={active}
          completed={completed}
          index={index}
          total={TOUR_STEPS.length}
          step={TOUR_STEPS[index]}
          target={target}
          busy={busy}
          onNext={() => (index < TOUR_STEPS.length - 1 ? void go(index + 1, true) : finish('done'))}
          onBack={() => index > 0 && void go(index - 1, false)}
          onSkip={() => finish('skip')}
          onCloseCompletion={() => setCompleted(false)}
        />
      )}
    </TourCtx.Provider>
  )
}
