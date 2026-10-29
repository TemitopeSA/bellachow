import { useEffect, useState, type ReactNode } from 'react'
import { useApp } from '../app/AppProvider'
import { formatClock } from '../lib/delivery'

const W = 390
const H = 844

/** Realistic, fully interactive 390×844 phone. Scales down (never up) to fit short laptop screens. */
export function PhoneFrame({ children, reserve = 120 }: { children: ReactNode; reserve?: number }) {
  const { minuteOfDay } = useApp()
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min(1, Math.max(0.6, (window.innerHeight - reserve) / (H + 24))))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [reserve])
  const clock = formatClock(minuteOfDay).replace(/ (AM|PM)$/, '')
  return (
    <div style={{ width: (W + 24) * scale, height: (H + 24) * scale }} className="shrink-0">
      <div
        data-tour="phone"
        className="relative origin-top-left rounded-[56px] bg-[#0d0f0e] p-3 shadow-[0_30px_80px_rgb(0_0_0/0.45),inset_0_0_0_2px_#2a2e2c]"
        style={{ width: W + 24, height: H + 24, transform: `scale(${scale})` }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[44px] bg-bg" style={{ ['--phone-top' as string]: '38px', ['--safe-bottom' as string]: '16px' }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[60] flex h-[38px] items-center justify-between px-7 text-[13.5px] font-bold text-ink" aria-hidden>
            <span className="tnum">{clock}</span>
            <span className="flex items-center gap-1.5">
              <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor" /><rect x="4.5" y="5" width="3" height="6" rx="1" fill="currentColor" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="currentColor" /><rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor" /></svg>
              <svg width="24" height="12" viewBox="0 0 24 12"><rect x="0.5" y="0.5" width="20" height="11" rx="3" fill="none" stroke="currentColor" opacity="0.5" /><rect x="2" y="2" width="15" height="8" rx="1.8" fill="currentColor" /><rect x="21.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity="0.5" /></svg>
            </span>
          </div>
          <div className="pointer-events-none absolute left-1/2 top-[9px] z-[61] h-[30px] w-[118px] -translate-x-1/2 rounded-full bg-[#0d0f0e]" aria-hidden />
          <div className="h-full w-full">{children}</div>
          <div className="pointer-events-none absolute bottom-[7px] left-1/2 z-[61] h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-ink/80" aria-hidden />
        </div>
      </div>
    </div>
  )
}
