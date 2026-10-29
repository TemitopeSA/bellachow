import { BarChart3, ChevronRight, Clock, MapPin, PlayCircle, RotateCcw } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import { getArea } from '../data/dataAccess'
import { DisclosureFooter } from '../components/DisclosureFooter'
import { Switch } from '../components/PriceBreakdownSheet'
import { Card, Chip, ScreenHeader } from '../components/ui'
import { DEMO_CLOCKS, type DemoClockMode } from '../lib/config'
import { formatClock } from '../lib/delivery'
import { storageAvailable } from '../lib/storage'
import { useTour } from '../tour/useTour'

export function AccountScreen() {
  const { areaId, openSheet, chowpass, setChowpass, clockMode, setClockMode, minuteOfDay, resetDemo, navigate } = useApp()
  const tour = useTour()
  const row = 'flex w-full items-center gap-3 px-3.5 py-3 text-left'
  return (
    <div className="pb-6">
      <ScreenHeader title="Account" />
      <div className="space-y-3 px-4 pt-3">
        <Card className="flex items-center gap-3 p-3.5">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-green-deep text-[18px] font-extrabold text-yellow">T</span>
          <div>
            <div className="text-[16px] font-extrabold">Temi</div>
            <div className="text-[12px] text-ink-2">Demo profile · no sign-in needed</div>
          </div>
        </Card>

        <Card className="divide-y divide-line">
          <button className={row} onClick={() => openSheet({ kind: 'area' })}>
            <MapPin size={18} className="text-green" />
            <span className="flex-1 text-[14px] font-bold">Delivery area<span className="block text-[12px] font-normal text-ink-2">{getArea(areaId).defaultAddress}</span></span>
            <ChevronRight size={18} className="text-ink-3" />
          </button>
          <div className={row}>
            <span className="text-[18px]" aria-hidden>🎟️</span>
            <span className="flex-1 text-[14px] font-bold">Chowpass (demo)<span className="block text-[12px] font-normal text-ink-2">Free delivery on simulated orders</span></span>
            <Switch checked={chowpass} onChange={setChowpass} label="Chowpass" />
          </div>
        </Card>

        <Card className="p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <Clock size={17} className="text-green" />
            <span className="text-[14px] font-bold">Demo clock</span>
            <span className="ml-auto text-[12px] font-semibold text-ink-2">{formatClock(minuteOfDay)} Lagos</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(DEMO_CLOCKS) as Exclude<DemoClockMode, 'live'>[]).map((k) => (
              <Chip key={k} active={clockMode === k} onClick={() => setClockMode(k)}>{DEMO_CLOCKS[k].label}</Chip>
            ))}
            <Chip active={clockMode === 'live'} onClick={() => setClockMode('live')}>Real Lagos time</Chip>
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">Vendor hours are illustrative demo configuration. Switch to late night to see closed states ("CLOSED · Opens 8:00 AM") and open alternatives.</p>
        </Card>

        <Card className="divide-y divide-line">
          <button className={row} onClick={() => tour.start()}>
            <PlayCircle size={18} className="text-green" />
            <span className="flex-1 text-[14px] font-bold">Take the tour<span className="block text-[12px] font-normal text-ink-2">60 seconds, 8 taps</span></span>
            <ChevronRight size={18} className="text-ink-3" />
          </button>
          <button className={row} onClick={() => navigate({ name: 'lead' })}>
            <BarChart3 size={18} className="text-green" />
            <span className="flex-1 text-[14px] font-bold">Product Lead view<span className="block text-[12px] font-normal text-ink-2">Problem, bet, metrics, rollout</span></span>
            <ChevronRight size={18} className="text-ink-3" />
          </button>
          <button
            className={row}
            onClick={() => openSheet({ kind: 'confirm', title: 'Reset the demo?', body: 'This clears your cart, demo orders, chat, analytics events and settings on this device, and replays from a fresh start.', confirmLabel: 'Reset demo', onConfirm: resetDemo })}
          >
            <RotateCcw size={18} className="text-orange" />
            <span className="flex-1 text-[14px] font-bold">Reset demo<span className="block text-[12px] font-normal text-ink-2">Clear cart, orders and settings</span></span>
          </button>
        </Card>
        {!storageAvailable() && <p className="rounded-xl bg-yellow px-3 py-2 text-[12px] font-semibold">Browser storage is unavailable — the demo is running in memory only.</p>}
      </div>
      <DisclosureFooter />
    </div>
  )
}
