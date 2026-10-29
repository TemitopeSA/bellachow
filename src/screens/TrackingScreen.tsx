import { Check, MessageCircle, Phone, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../app/AppProvider'
import { Button, Card, EmptyState, ScreenHeader } from '../components/ui'
import { formatClock } from '../lib/delivery'
import { etaLabel, naira } from '../lib/formatting'
import { load, save } from '../lib/storage'
import { STAGES, SIM_MS_PER_MIN, simulate } from '../lib/tracking'
import { track } from '../lib/analytics'

const P0 = { x: 46, y: 132 }
const P1 = { x: 110, y: 18 }
const P2 = { x: 258, y: 46 }
const bez = (t: number) => ({
  x: (1 - t) ** 2 * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x,
  y: (1 - t) ** 2 * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y,
})

function MapIllustration({ riderT, delivered }: { riderT: number; delivered: boolean }) {
  const r = bez(riderT)
  return (
    <div
      className="relative h-[190px] overflow-hidden rounded-[16px] bg-[#e9efe9]"
      style={{ backgroundImage: 'linear-gradient(#dfe7e0 1px, transparent 1px), linear-gradient(90deg, #dfe7e0 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      role="img"
      aria-label="Illustrative route map — not live GPS"
    >
      <span className="absolute -left-8 top-16 h-6 w-[140%] -rotate-[14deg] bg-white/90" />
      <span className="absolute left-40 -top-6 h-[140%] w-5 rotate-[18deg] bg-white/90" />
      <span className="absolute right-6 top-24 h-14 w-20 rounded-xl bg-[#d4e8d6]" />
      <span className="absolute left-6 top-5 h-10 w-16 rounded-xl bg-[#dbe6f2]" />
      <svg viewBox="0 0 300 170" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
        <path d={`M${P0.x},${P0.y} Q${P1.x},${P1.y} ${P2.x},${P2.y}`} fill="none" stroke="#9fb9ab" strokeWidth="4" strokeDasharray="2 7" strokeLinecap="round" />
        <path d={`M${P0.x},${P0.y} Q${P1.x},${P1.y} ${P2.x},${P2.y}`} fill="none" stroke="#038B5C" strokeWidth="4.5" strokeLinecap="round" pathLength={1} strokeDasharray={`${riderT} 1`} style={{ transition: 'stroke-dasharray 900ms linear' }} />
      </svg>
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(P0.x / 300) * 100}%`, top: `${(P0.y / 170) * 100}%` }}>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[18px] shadow-md ring-2 ring-orange" aria-hidden>🍗</span>
      </div>
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(P2.x / 300) * 100}%`, top: `${(P2.y / 170) * 100}%` }}>
        <span className="ping-ring absolute inset-0 rounded-full bg-green/40" aria-hidden />
        <span className="relative grid h-9 w-9 place-items-center rounded-full bg-green text-[17px] shadow-md" aria-hidden>🏠</span>
      </div>
      {!delivered && (
        <div className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear" style={{ left: `${(r.x / 300) * 100}%`, top: `${(r.y / 170) * 100}%` }}>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-yellow text-[20px] shadow-lg ring-2 ring-white" aria-hidden>🛵</span>
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-ink-2">Illustration · not live GPS</span>
    </div>
  )
}

export function TrackingScreen({ orderId }: { orderId: string }) {
  const { orders, navigate, openSheet, showToast, loadCart } = useApp()
  const order = orders.find((o) => o.id === orderId)
  const [now, setNow] = useState(() => Date.now())
  const logged = useRef(false)

  const sim = order ? simulate(order, now) : null
  const done = sim?.stage === 3
  useEffect(() => {
    if (!order || done) return
    const t = window.setInterval(() => setNow(Date.now()), SIM_MS_PER_MIN / 2)
    return () => window.clearInterval(t)
  }, [order, done])

  useEffect(() => {
    if (!order || !done || logged.current) return
    logged.current = true
    const key = `delivered.${order.id}`
    if (!load(key, false)) {
      save(key, true)
      track('order_delivered', { orderId: order.id, withinPromise: true, viaBella: order.viaBella })
    }
  }, [order, done])

  if (!order || !sim)
    return (
      <div>
        <ScreenHeader title="Order" onBack={() => navigate({ name: 'orders' })} />
        <EmptyState emoji="🧾" title="Order not found" body="This demo order isn't on this device. Orders are stored locally in your browser." action={<Button onClick={() => navigate({ name: 'home' })}>Back to Home</Button>} />
      </div>
    )

  const arriveFrom = formatClock(order.placedClockMin + order.eta[0])
  const arriveTo = formatClock(order.placedClockMin + order.eta[1])
  const orderAgain = () => {
    if (loadCart(order.vendorId, order.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })))) navigate({ name: 'cart' })
  }

  return (
    <div className="pb-6">
      <ScreenHeader title={done ? 'Delivered 🎉' : 'Tracking your order'} subtitle={`${order.id} · ${order.vendorName}`} onBack={() => navigate({ name: 'orders' })} />
      <div className="space-y-3 px-4 pt-3">
        <Card className="p-3.5">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-ink-3">{done ? 'Arrived' : order.fulfilment === 'pickup' ? 'Ready in' : 'Arriving in'}</div>
              <div className="tnum text-[30px] font-extrabold leading-none tracking-tight text-green-deep" aria-live="polite">
                {done ? 'Enjoy!' : `${sim.remainingLow}–${sim.remainingMins} min`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-ink-3">Promised window</div>
              <div className="text-[13.5px] font-bold">{arriveFrom}–{arriveTo}</div>
              <div className="text-[11px] text-ink-3">{etaLabel(order.eta)} from order</div>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-green transition-all duration-700" style={{ width: `${Math.round(sim.progress * 100)}%` }} />
          </div>
          <div className="mt-1.5 text-[10.5px] text-ink-3">Accelerated demo: 1 second = 1 minute. The promised window never changes.</div>
        </Card>

        {order.fulfilment === 'delivery' && <MapIllustration riderT={sim.stage < 2 ? 0 : done ? 1 : sim.riderProgress} delivered={done} />}

        <Card className="p-3.5">
          <ol className="space-y-0">
            {STAGES.map((s, i) => {
              const reached = sim.stage >= i
              const current = sim.stage === i && !done
              return (
                <li key={s} className="relative flex gap-3 pb-3 last:pb-0">
                  {i < STAGES.length - 1 && <span className={`absolute left-[13px] top-7 h-[calc(100%-20px)] w-0.5 ${sim.stage > i ? 'bg-green' : 'bg-line'}`} aria-hidden />}
                  <span className={`relative grid h-7 w-7 shrink-0 place-items-center rounded-full ${reached ? 'bg-green text-white' : 'bg-bg text-ink-3'}`}>
                    {reached && !current ? <Check size={14} strokeWidth={3} /> : <span className={`h-2 w-2 rounded-full ${current ? 'bg-white' : 'bg-ink-3/50'}`} />}
                    {current && <span className="ping-ring absolute inset-0 rounded-full bg-green/40" aria-hidden />}
                  </span>
                  <div className="pt-0.5">
                    <div className={`text-[14px] ${reached ? 'font-extrabold' : 'font-semibold text-ink-3'}`}>{order.fulfilment === 'pickup' && i === 2 ? 'Ready for pickup' : order.fulfilment === 'pickup' && i === 3 ? 'Collected' : s}</div>
                    {current && <div className="text-[12px] text-ink-2">In progress…</div>}
                  </div>
                </li>
              )
            })}
          </ol>
        </Card>

        {order.fulfilment === 'delivery' && !done && (
          <Card className="flex items-center gap-3 p-3.5">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-yellow text-[20px]" aria-hidden>🧑🏾‍🦱</span>
            <div className="flex-1">
              <div className="text-[14px] font-extrabold">Tunde · Rider</div>
              <div className="text-[12px] text-ink-2">Simulated rider · demo only</div>
            </div>
            <button onClick={() => openSheet({ kind: 'rider-chat' })} aria-label="Chat with rider (demo)" className="grid h-10 w-10 place-items-center rounded-full bg-green-soft text-green-deep"><MessageCircle size={18} /></button>
            <button onClick={() => showToast('Demo only — no call is made')} aria-label="Call rider (demo)" className="grid h-10 w-10 place-items-center rounded-full bg-green text-white"><Phone size={17} /></button>
          </Card>
        )}

        <Card className="p-3.5">
          <div className="mb-2 flex justify-between text-[13px]">
            <span className="font-extrabold">{order.vendorName}</span>
            <span className="text-ink-2">{order.fulfilment === 'pickup' ? 'Pickup' : order.areaName}</span>
          </div>
          <ul className="space-y-1 text-[13px] text-ink-2">
            {order.lines.map((l) => (
              <li key={l.itemId} className="flex justify-between"><span>{l.qty}× {l.name}</span><span className="tnum">{naira(l.unitPrice * l.qty)}</span></li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-[14px] font-extrabold">
            <span>Total paid (simulated)</span>
            <span className="tnum text-green">{naira(order.pricing.total)}</span>
          </div>
        </Card>

        {done && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate({ name: 'home' })}>Back to Home</Button>
            <Button className="flex-1" onClick={orderAgain}><RotateCcw size={15} /> Order again</Button>
          </div>
        )}
      </div>
    </div>
  )
}
