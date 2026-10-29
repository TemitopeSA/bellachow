import { ChevronRight } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import { Button, Card, EmptyState, ScreenHeader } from '../components/ui'
import { naira } from '../lib/formatting'
import { simulate } from '../lib/tracking'

export function OrdersScreen() {
  const { orders, navigate } = useApp()
  return (
    <div className="pb-6">
      <ScreenHeader title="Orders" />
      {orders.length === 0 ? (
        <EmptyState emoji="🧾" title="No orders yet" body="Completed demo orders will appear here after checkout. Nothing is charged — it's a simulation." action={<Button onClick={() => navigate({ name: 'bella' })}>Ask Bella what to eat</Button>} />
      ) : (
        <ul className="space-y-2.5 px-4 pt-3">
          {orders.map((o) => {
            const s = simulate(o, Date.now())
            return (
              <li key={o.id}>
                <button onClick={() => navigate({ name: 'tracking', orderId: o.id })} className="w-full text-left">
                  <Card className="flex items-center gap-3 p-3.5">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-yellow text-[20px]" aria-hidden>{o.lines[0]?.emoji ?? '🍽️'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-extrabold">{o.vendorName}</div>
                      <div className="text-[12px] text-ink-2">{o.id} · {o.lines.reduce((n, l) => n + l.qty, 0)} items{o.group ? ' · group' : ''}{o.viaBella ? ' · via Bella' : ''}</div>
                      <div className={`mt-0.5 text-[11.5px] font-bold ${s.stage === 3 ? 'text-ink-3' : 'text-green'}`}>{s.stage === 3 ? 'Delivered' : 'In progress'}</div>
                    </div>
                    <span className="tnum text-[14px] font-extrabold">{naira(o.pricing.total)}</span>
                    <ChevronRight size={18} className="text-ink-3" />
                  </Card>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
