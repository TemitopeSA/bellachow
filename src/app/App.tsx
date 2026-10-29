import { PlayCircle, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { PhoneFrame } from '../components/PhoneFrame'
import { ProductLeadPanel } from '../product-lead/ProductLeadPanel'
import { DISCLOSURE } from '../lib/config'
import { TourProvider } from '../tour/TourProvider'
import { useTour } from '../tour/useTour'
import { AppProvider } from './AppProvider'

function useMedia(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return m
}

function DesktopLayout() {
  const tour = useTour()
  const wide = useMedia('(min-width: 1200px)')
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_20%_-10%,#03593b_0%,transparent_60%),#012b1d]">
      <header className="mx-auto flex max-w-[1240px] items-center gap-3 px-6 py-4 text-white">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-green" aria-hidden>
          <Sparkles size={18} fill="#FFEDB3" />
        </span>
        <div className="leading-tight">
          <div className="text-[18px] font-extrabold tracking-tight">BellaChow</div>
          <div className="text-[12px] text-white/65">An AI food concierge concept for Chowdeck · unofficial</div>
        </div>
        <div className="flex-1" />
        <button onClick={() => tour.start()} className="inline-flex h-10 items-center gap-2 rounded-full bg-yellow px-4 text-[13.5px] font-extrabold text-green-deep transition hover:brightness-95">
          <PlayCircle size={17} /> Take the tour
        </button>
      </header>
      <main className={`mx-auto flex max-w-[1240px] gap-8 px-6 pb-8 ${wide ? 'flex-row items-start' : 'flex-col items-center'}`}>
        <div className={wide ? 'sticky top-4' : ''}>
          <PhoneFrame reserve={wide ? 100 : 120}>
            <AppShell />
          </PhoneFrame>
        </div>
        <aside data-panel="desktop" className={`w-full ${wide ? 'min-w-0 flex-1' : 'max-w-[640px]'}`} aria-label="Product Lead view">
          <ProductLeadPanel />
        </aside>
      </main>
      <footer className="mx-auto max-w-[1240px] px-6 pb-8 text-center text-[12px] text-white/60">{DISCLOSURE}</footer>
    </div>
  )
}

function MobileLayout() {
  return (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden" data-tour="phone" style={{ ['--phone-top' as string]: 'env(safe-area-inset-top, 0px)' }}>
      <AppShell />
    </div>
  )
}

function Layout() {
  const framed = useMedia('(min-width: 768px)')
  return framed ? <DesktopLayout /> : <MobileLayout />
}

export default function App() {
  return (
    <AppProvider>
      <TourProvider>
        <Layout />
      </TourProvider>
    </AppProvider>
  )
}
