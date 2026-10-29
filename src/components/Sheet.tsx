import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

/**
 * Accessible bottom sheet rendered inside the phone screen: dimmed backdrop,
 * Escape + backdrop dismissal, focus trap, focus restore.
 */
export function Sheet({ title, onClose, children, footer, label, tourId }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; label?: string; tourId?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const node = ref.current
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])
    ;(focusables()[0] ?? node)?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[data-tour-active="true"]')) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab') {
        const f = focusables()
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.({ preventScroll: true })
    }
  }, [onClose])

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button aria-label="Close" tabIndex={-1} className="anim-fade absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={label}
        tabIndex={-1}
        data-tour={tourId}
        className="anim-sheet relative max-h-[88%] overflow-hidden rounded-t-[24px] bg-white shadow-[var(--shadow-sheet)] outline-none flex flex-col"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 id={titleId} className="text-[17px] font-extrabold tracking-tight">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close sheet" className="grid h-9 w-9 place-items-center rounded-full bg-bg text-ink-2 transition hover:bg-line">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-line px-5 pt-3 pb-[calc(14px+var(--safe-bottom))]">{footer}</div>}
      </div>
    </div>
  )
}
