import { Globe, Loader2, Mail, X } from 'lucide-react'
import { CONTACT } from '../lib/config'
import { LinkedinIcon } from '../components/icons'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useApp } from '../app/AppProvider'
import { findTarget } from './TourProvider'
import type { TourStep } from './tourSteps'

type Rect = { top: number; left: number; width: number; height: number; phoneRight?: number }
const PAD = 6
const GAP = 14
const MARGIN = 16

function sameRect(a: Rect | null, b: Rect | null) {
  if (!a || !b) return a === b
  return Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5
}

/** Tracks the target's viewport rect every frame (handles scroll, resize, layout shifts, phone scaling). */
function useTargetRect(id: string, enabled: boolean): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null)
  const last = useRef<Rect | null>(null)
  useEffect(() => {
    if (!enabled) return
    let raf = 0
    const tick = () => {
      const el = findTarget(id)
      let r: Rect | null = null
      if (el) {
        const b = el.getBoundingClientRect()
        // Clip to the scroll container / phone so the spotlight never extends past visible UI.
        const phone = document.querySelector('[data-tour="phone"]')?.getBoundingClientRect()
        const clip = id !== 'phone' && phone && el.closest('[data-tour="phone"]') ? phone : null
        const top = clip ? Math.max(b.top, clip.top) : b.top
        const bottom = clip ? Math.min(b.bottom, clip.bottom) : b.bottom
        r = { top, left: b.left, width: b.width, height: Math.max(0, bottom - top), phoneRight: clip ? clip.right : undefined }
      }
      if (!sameRect(r, last.current)) {
        last.current = r
        setRect(r)
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [id, enabled])
  return rect
}

type Props = {
  active: boolean
  completed: boolean
  index: number
  total: number
  step: TourStep
  target: string
  busy: boolean
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  onCloseCompletion: () => void
}

export function TourOverlay({ active, completed, index, total, step, target, busy, onNext, onBack, onSkip, onCloseCompletion }: Props) {
  const { navigate } = useApp()
  const rect = useTargetRect(target, active)
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(230)
  const [vw, setVw] = useState(() => window.innerWidth)
  const [vh, setVh] = useState(() => window.innerHeight)

  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth)
      setVh(window.innerHeight)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight)
  })

  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true })
  }, [index, completed])

  useEffect(() => {
    if (!active && !completed) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (active) onSkip()
        else onCloseCompletion()
      }
      if (!active) return
      if (e.key === 'ArrowRight' && !busy) onNext()
      if (e.key === 'ArrowLeft' && !busy) onBack()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [active, completed, busy, onNext, onBack, onSkip, onCloseCompletion])

  if (completed && !active) {
    const openLead = () => {
      onCloseCompletion()
      const panel = document.querySelector<HTMLElement>('[data-panel="desktop"]')
      if (panel && panel.getBoundingClientRect().width > 0) panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else navigate({ name: 'lead' })
    }
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4" data-tour-active="true">
        <div ref={cardRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="tour-done" className="anim-fade-up w-full max-w-[360px] rounded-[22px] bg-white p-5 text-center shadow-2xl outline-none">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-yellow text-[28px]" aria-hidden>✨</div>
          <h2 id="tour-done" className="text-[18px] font-extrabold leading-snug">That's BellaChow. Less scrolling. Clearer choices. Better ordering decisions.</h2>
          <div className="mt-4 grid gap-2">
            <button
              onClick={() => {
                onCloseCompletion()
                navigate({ name: 'home' })
              }}
              className="h-11 rounded-full bg-green text-[14px] font-bold text-white"
            >
              Explore the app
            </button>
            <button onClick={openLead} className="h-11 rounded-full border border-line text-[14px] font-bold">
              Revisit the Product Lead view
            </button>
          </div>
        </div>
      </div>
    )
  }
  if (!active) return null

  // ---- card placement ----
  const mobile = vw < 768
  const cardW = Math.min(340, vw - MARGIN * 2)
  let top: number
  let left: number
  if (!rect) {
    top = vh - cardH - MARGIN
    left = (vw - cardW) / 2
  } else {
    const below = rect.top + rect.height + PAD + GAP
    const above = rect.top - PAD - GAP - cardH
    const rightX = rect.left + rect.width + PAD + GAP
    const leftX = rect.left - PAD - GAP - cardW
    const fullPhone = target === 'phone' || rect.height > vh * 0.7
    if (!mobile && !fullPhone && rect.phoneRight != null && rect.phoneRight + GAP + cardW < vw - MARGIN) {
      // Desktop: keep the phone fully visible and dock the card beside it, level with the target.
      top = rect.top + rect.height / 2 - cardH / 2
      left = rect.phoneRight + GAP + 4
    } else if (!mobile && fullPhone && rightX + cardW < vw - MARGIN) {
      top = Math.max(MARGIN, rect.top + rect.height / 2 - cardH / 2)
      left = rightX
    } else if (!mobile && fullPhone && leftX > MARGIN) {
      top = Math.max(MARGIN, rect.top + rect.height / 2 - cardH / 2)
      left = leftX
    } else if (below + cardH < vh - MARGIN) {
      top = below
      left = rect.left + rect.width / 2 - cardW / 2
    } else if (above > MARGIN) {
      top = above
      left = rect.left + rect.width / 2 - cardW / 2
    } else if (!mobile && rightX + cardW < vw - MARGIN) {
      top = rect.top
      left = rightX
    } else if (!mobile && leftX > MARGIN) {
      top = rect.top
      left = leftX
    } else {
      // Mobile fallback: pin to the screen edge furthest from the target, inside safe areas.
      const targetMid = rect.top + rect.height / 2
      top = targetMid > vh / 2 ? MARGIN + 8 : vh - cardH - MARGIN - 8
      left = (vw - cardW) / 2
    }
  }
  left = Math.min(Math.max(MARGIN, left), vw - cardW - MARGIN)
  top = Math.min(Math.max(MARGIN, top), vh - cardH - MARGIN)

  const spotlight = rect
  return (
    <div className="fixed inset-0 z-[100]" data-tour-active="true" aria-live="polite">
      {/* Click shield: the tour drives the app; nothing underneath is clickable by accident. */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {spotlight ? (
        <div
          className="pointer-events-none absolute rounded-[18px] ring-2 ring-yellow transition-all duration-300 ease-out"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.58)',
            borderRadius: target === 'phone' ? 50 : 18,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/55" />
      )}
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="anim-fade-up absolute rounded-[20px] bg-white p-4 shadow-2xl outline-none transition-[top,left] duration-300 ease-out"
        style={{ top, left, width: cardW }}
        key={index}
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-extrabold text-green-deep">
            Step {index + 1} of {total}
          </span>
          <button onClick={onSkip} aria-label="Close tour" className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-bg">
            <X size={16} />
          </button>
        </div>
        <h2 id="tour-title" className="mt-2 text-[17px] font-extrabold leading-snug">{step.title}</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{step.body}</p>
        {step.disclosure && <p className="mt-2 rounded-lg bg-bg px-2.5 py-1.5 text-[11.5px] leading-snug text-ink-2">{step.disclosure}</p>}
        {step.id === 'lead' && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <a href={CONTACT.email} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-green px-3 text-[12.5px] font-bold text-white"><Mail size={14} /> Email</a>
            <a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] font-bold"><LinkedinIcon size={14} /> LinkedIn</a>
            <a href={CONTACT.portfolio} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] font-bold"><Globe size={14} /> Portfolio</a>
          </div>
        )}
        {(step.id === 'price' || step.id === 'eta') && <p className="mt-1.5 text-[10.5px] text-ink-3">Indicative review-analysis figure from the brief — validation pending.</p>}
        <div className="mt-3 flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-green' : i < index ? 'w-1.5 bg-green/50' : 'w-1.5 bg-line'}`} />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={onSkip} className="h-10 px-2 text-[13px] font-bold text-ink-3 hover:text-ink">Skip</button>
          <div className="flex-1" />
          <button onClick={onBack} disabled={index === 0 || busy} className="h-10 rounded-full border border-line px-4 text-[13px] font-bold disabled:opacity-40">
            Back
          </button>
          <button onClick={onNext} disabled={busy} className="inline-flex h-10 min-w-[86px] items-center justify-center gap-1.5 rounded-full bg-green px-4 text-[13px] font-bold text-white disabled:bg-[#7fbea4]">
            {busy ? <Loader2 size={15} className="animate-spin" aria-label="Working" /> : index === total - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
