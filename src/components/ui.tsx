import { Minus, Plus } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'outline' | 'dark' | 'soft'; size?: 'sm' | 'md' | 'lg' }) {
  const v = {
    primary: 'bg-green text-white hover:bg-[#027a51] disabled:bg-[#9ccbb8]',
    dark: 'bg-green-deep text-white hover:bg-[#013d28]',
    ghost: 'bg-transparent text-green hover:bg-green-soft',
    outline: 'border border-line bg-white text-ink hover:border-green/40',
    soft: 'bg-green-soft text-green-deep hover:bg-[#d3ebdf]',
  }[variant]
  const s = { sm: 'h-9 px-3.5 text-[13px]', md: 'h-11 px-4 text-[14px]', lg: 'h-[52px] px-5 text-[15px]' }[size]
  return <button className={`inline-flex items-center justify-center gap-1.5 rounded-full font-bold transition duration-200 active:scale-[0.98] ${v} ${s} ${className}`} {...rest} />
}

export function Chip({ active, children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition duration-200 ${
        active ? 'border-green-deep bg-green-deep text-white' : 'border-line bg-white text-ink hover:border-green/40'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Badge({ tone = 'green', children, className = '' }: { tone?: 'green' | 'orange' | 'yellow' | 'grey' | 'dark' | 'cream'; children: ReactNode; className?: string }) {
  const t = {
    green: 'bg-green-soft text-green-deep',
    orange: 'bg-orange text-white',
    yellow: 'bg-yellow text-[#6b4e00]',
    grey: 'bg-[#eceeed] text-ink-2',
    dark: 'bg-ink text-white',
    cream: 'bg-cream text-orange',
  }[tone]
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide ${t} ${className}`}>{children}</span>
}

export function Stepper({ qty, onChange, label, disabled }: { qty: number; onChange: (n: number) => void; label: string; disabled?: boolean }) {
  return (
    <div className="inline-flex h-9 items-center rounded-full border border-line bg-white" role="group" aria-label={`Quantity for ${label}`}>
      <button disabled={disabled} aria-label={`Decrease ${label}`} onClick={() => onChange(qty - 1)} className="grid h-9 w-9 place-items-center rounded-full text-green-deep hover:bg-green-soft">
        <Minus size={15} strokeWidth={2.6} />
      </button>
      <span className="tnum w-6 text-center text-[14px] font-extrabold" aria-live="polite">
        {qty}
      </span>
      <button disabled={disabled || qty >= 20} aria-label={`Increase ${label}`} onClick={() => onChange(qty + 1)} className="grid h-9 w-9 place-items-center rounded-full text-green-deep hover:bg-green-soft disabled:opacity-40">
        <Plus size={15} strokeWidth={2.6} />
      </button>
    </div>
  )
}

export function EmptyState({ emoji, title, body, action }: { emoji: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="anim-fade-up flex flex-col items-center px-8 py-12 text-center">
      <div className="relative mb-4 grid h-24 w-24 place-items-center rounded-full bg-yellow">
        <span className="absolute -right-1 top-2 h-5 w-5 rounded-full bg-cream" />
        <span className="absolute bottom-1 left-0 h-3 w-3 rounded-full bg-green-soft" />
        <span className="text-[44px]" aria-hidden>
          {emoji}
        </span>
      </div>
      <h3 className="text-[17px] font-extrabold">{title}</h3>
      <p className="mt-1.5 max-w-[260px] text-[13.5px] leading-relaxed text-ink-2">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ScreenHeader({ title, subtitle, onBack, right }: { title: ReactNode; subtitle?: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line/70 bg-white/95 px-3 pb-2.5 pt-[calc(10px+var(--phone-top,0px))] backdrop-blur">
      {onBack && (
        <button onClick={onBack} aria-label="Go back" className="grid h-10 w-10 place-items-center rounded-full hover:bg-bg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1 px-1">
        <h1 className="truncate text-[17px] font-extrabold tracking-tight">{title}</h1>
        {subtitle && <div className="truncate text-[12px] text-ink-2">{subtitle}</div>}
      </div>
      {right}
    </header>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[16px] bg-white shadow-[var(--shadow-card)] ${className}`}>{children}</div>
}
