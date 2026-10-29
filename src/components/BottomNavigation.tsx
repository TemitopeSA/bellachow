import { Home, Receipt, Search, Sparkles, User } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import { tabFor, type Route } from '../app/routes'
import { simulate } from '../lib/tracking'

const TABS: { id: 'home' | 'search' | 'bella' | 'orders' | 'account'; label: string; icon: typeof Home; route: Route }[] = [
  { id: 'home', label: 'Home', icon: Home, route: { name: 'home' } },
  { id: 'search', label: 'Search', icon: Search, route: { name: 'search' } },
  { id: 'bella', label: 'Bella', icon: Sparkles, route: { name: 'bella' } },
  { id: 'orders', label: 'Orders', icon: Receipt, route: { name: 'orders' } },
  { id: 'account', label: 'Account', icon: User, route: { name: 'account' } },
]

export function BottomNavigation() {
  const { route, navigate, orders } = useApp()
  const active = tabFor(route)
  const live = orders[0] && simulate(orders[0], Date.now()).stage < 3
  return (
    <nav aria-label="Main" className="relative z-30 shrink-0 border-t border-line bg-white pb-[var(--safe-bottom)]">
      <ul className="grid grid-cols-5 items-end px-1.5 pt-1.5">
        {TABS.map((t) => {
          const on = active === t.id
          const Icon = t.icon
          if (t.id === 'bella')
            return (
              <li key={t.id} className="flex justify-center">
                <button
                  data-tour="nav-bella"
                  onClick={() => navigate(t.route)}
                  aria-current={on ? 'page' : undefined}
                  aria-label="Bella, your AI food concierge"
                  className="group -mt-6 flex flex-col items-center gap-1 pb-1.5"
                >
                  <span
                    className={`grid h-[54px] w-[54px] place-items-center rounded-full border-4 border-white shadow-[0_6px_16px_rgb(3_139_92/0.35)] transition duration-200 ${
                      on ? 'bg-green-deep ring-2 ring-yellow' : 'bg-green group-hover:bg-[#027a51]'
                    }`}
                  >
                    <Sparkles size={22} className="text-white" fill={on ? '#FFEDB3' : 'none'} strokeWidth={2.2} />
                  </span>
                  <span className={`text-[11px] font-bold ${on ? 'text-green-deep' : 'text-ink-2'}`}>Bella</span>
                </button>
              </li>
            )
          return (
            <li key={t.id} className="flex justify-center">
              <button
                onClick={() => navigate(t.route)}
                aria-current={on ? 'page' : undefined}
                className="relative flex min-h-[48px] w-full flex-col items-center justify-center gap-1 rounded-xl pb-1.5"
              >
                <Icon size={21} strokeWidth={on ? 2.5 : 2} className={on ? 'text-green' : 'text-ink-3'} />
                <span className={`text-[11px] ${on ? 'font-extrabold text-green' : 'font-semibold text-ink-3'}`}>{t.label}</span>
                {t.id === 'orders' && live && (
                  <span className="absolute right-[22%] top-1 h-2 w-2 rounded-full bg-orange" aria-label="Order in progress" />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
