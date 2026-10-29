import { Clock, Users } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import type { BellaIntent, GroupBasket } from '../bella/types'
import { etaLabel, naira } from '../lib/formatting'
import { FoodIllustration } from './FoodIllustration'

export function GroupBasketCard({ basket, intent }: { basket: GroupBasket; intent: BellaIntent }) {
  const { addBasket, openSheet } = useApp()
  const title = intent.mealTime === 'lunch' ? `Lunch for ${basket.people}` : intent.mealTime === 'dinner' ? `Dinner for ${basket.people}` : intent.mealTime === 'breakfast' ? `Breakfast for ${basket.people}` : `Food for ${basket.people}`
  return (
    <article className="anim-fade-up overflow-hidden rounded-[16px] bg-white shadow-[var(--shadow-card)]" aria-label={title}>
      <div className="flex items-center justify-between bg-green-deep px-3.5 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
            <Users size={18} aria-hidden />
          </span>
          <div>
            <h3 className="text-[16px] font-extrabold leading-tight">{title}</h3>
            <div className="text-[12px] text-white/75">
              {basket.vendor.brand} · {basket.vendor.branch} · one delivery
            </div>
          </div>
        </div>
        <span className="rounded-full bg-yellow px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#5c4300]">Group order</span>
      </div>
      <ul className="divide-y divide-line px-3">
        {basket.lines.map((l) => (
          <li key={l.item.id} className="flex items-center gap-3 py-2.5">
            <FoodIllustration emoji={l.item.emoji} seed={l.item.name} size="xs" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-bold">{l.item.name}</div>
              <div className="text-[11.5px] text-ink-3">{naira(l.item.price)} approx. each</div>
            </div>
            <span className="tnum rounded-full bg-bg px-2 py-0.5 text-[12.5px] font-extrabold">×{l.qty}</span>
          </li>
        ))}
      </ul>
      <div className="mx-3 rounded-xl bg-bg p-3" data-tour="group-total">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">Total</div>
            <div className="tnum text-[22px] font-extrabold leading-none text-green">
              {naira(basket.pricing.total)} <span className="text-[12px] font-bold text-ink-3">approx.</span>
            </div>
          </div>
          <div className="text-right">
            <div className="tnum text-[15px] font-extrabold">{naira(basket.perPerson)}</div>
            <div className="text-[11.5px] text-ink-2">per person approx.</div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-2">
          <span>
            Food {naira(basket.pricing.food)} + fees charged once {naira(basket.pricing.total - basket.pricing.food)} ·{' '}
            <button
              className="font-bold text-green underline underline-offset-2"
              onClick={() => openSheet({ kind: 'breakdown', source: { title, vendorId: basket.vendor.id, lines: basket.lines.map((l) => ({ itemId: l.item.id, qty: l.qty })), areaId: intent.area ?? basket.vendor.area ?? 'yaba', recId: basket.id } })}
            >
              See breakdown
            </button>
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-green-deep">
            <Clock size={12} aria-hidden /> {etaLabel(basket.eta)}
          </span>
        </div>
        {basket.budget != null && (
          <div className="mt-2 text-[11.5px] font-semibold text-green-deep">
            ✓ Within your {naira(basket.budget)} budget ({naira(basket.budget - basket.pricing.total)} to spare)
          </div>
        )}
      </div>
      <p className="px-3 pt-2 text-[11.5px] leading-relaxed text-ink-2">
        Assumes one meal item per person — the menu data has no serving sizes. You can change quantities in your cart.
      </p>
      <div className="p-3">
        <button onClick={() => addBasket(basket, intent)} className="h-11 w-full rounded-full bg-green text-[14px] font-bold text-white transition hover:bg-[#027a51] active:scale-[0.98]">
          Add group basket to cart
        </button>
      </div>
    </article>
  )
}
