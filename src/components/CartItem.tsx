import { Trash2 } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import type { MenuItem } from '../data/types'
import { naira } from '../lib/formatting'
import { FoodIllustration } from './FoodIllustration'
import { Stepper } from './ui'

export function CartItem({ item, qty }: { item: MenuItem; qty: number }) {
  const { setQty } = useApp()
  return (
    <li className="flex items-center gap-3 py-3">
      <FoodIllustration emoji={item.emoji} seed={item.name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold leading-snug">{item.name}</div>
        <div className="tnum text-[12.5px] text-ink-2">
          {naira(item.price)} approx.{qty > 1 && <span className="text-ink-3"> · {naira(item.price * qty)}</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Stepper qty={qty} label={item.name} onChange={(n) => setQty(item.id, n)} />
        <button onClick={() => setQty(item.id, 0)} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink-3 hover:text-orange" aria-label={`Remove ${item.name}`}>
          <Trash2 size={12} /> Remove
        </button>
      </div>
    </li>
  )
}
