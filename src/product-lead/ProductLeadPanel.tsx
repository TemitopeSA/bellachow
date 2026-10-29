import { Briefcase, FlaskConical, Globe, Mail, Rocket, Target, TriangleAlert } from 'lucide-react'
import { useSyncExternalStore, type ReactNode } from 'react'
import { funnel, getEvents, subscribe } from '../lib/analytics'
import { CONTACT, DISCLOSURE } from '../lib/config'
import { LinkedinIcon } from '../components/icons'
import { EVIDENCE, GUARDRAILS, INPUT_METRICS, NORTH_STAR, ROLLOUT } from './metrics'

function PCard({ n, icon, title, children, tour }: { n: number; icon: ReactNode; title: string; children: ReactNode; tour?: string }) {
  return (
    <section className="rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.08)]" data-tour={tour} aria-labelledby={`pl-${n}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-green-soft text-green-deep">{icon}</span>
        <span className="text-[11px] font-extrabold tracking-[0.1em] text-ink-3">0{n}</span>
        <h3 id={`pl-${n}`} className="text-[16px] font-extrabold tracking-tight">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function Bar({ label, pct, tone = 'green' }: { label: string; pct: number; tone?: 'green' | 'orange' }) {
  return (
    <div className="grid grid-cols-[96px_1fr_36px] items-center gap-2 text-[12px]">
      <span className="text-ink-2">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-bg">
        <span className={`block h-full rounded-full ${tone === 'orange' ? 'bg-orange' : 'bg-green'}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="tnum text-right font-extrabold">{pct}%</span>
    </div>
  )
}

export function ProductLeadPanel({ inPhone = false }: { inPhone?: boolean }) {
  const events = useSyncExternalStore(subscribe, getEvents, getEvents)
  const f = funnel(events)
  const steps = [
    { label: 'Bella opened', n: f.bellaOpened },
    { label: 'Prompt submitted', n: f.promptSubmitted },
    { label: 'Added to cart', n: f.bellaAdds },
    { label: 'Order placed', n: f.ordersViaBella },
  ]
  const max = Math.max(1, ...steps.map((s) => s.n))

  return (
    <div className={`space-y-3 ${inPhone ? '' : ''}`} data-tour="product-lead">
      {!inPhone && (
        <div className="px-1 pb-1 text-white">
          <div className="text-[11px] font-extrabold tracking-[0.14em] text-yellow/90">PRODUCT LEAD VIEW</div>
          <h2 className="mt-1 text-[22px] font-extrabold leading-tight tracking-tight">How I'd measure it, ship it and grow it</h2>
          <p className="mt-1 text-[13px] text-white/70">A concise briefing behind the prototype. Hypotheses, not results.</p>
        </div>
      )}
      <div className={`grid gap-3 ${inPhone ? '' : '2xl:grid-cols-2'}`}>
        <PCard n={1} icon={<TriangleAlert size={16} />} title="The problem">
          <p className="text-[14px] font-bold leading-snug text-ink">Users don't just want food fast. They want to know the real price and time before they pay.</p>
          <div className="mt-3 inline-flex rounded-full bg-yellow px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-[#5c4300]">{EVIDENCE.status}</div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1.5 text-[11px] font-bold text-ink-3">Base: all {EVIDENCE.sample} · {EVIDENCE.period}</div>
              <Bar label="Rated 1 star" pct={EVIDENCE.oneStarShareOfAll} tone="orange" />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-bold text-ink-3">Base: 1–2★ reviews only · themes overlap, not additive</div>
              <div className="space-y-1.5">
                {EVIDENCE.themesWithinLowStar.map((t) => (
                  <Bar key={t.label} label={`Mention ${t.label.toLowerCase()}`} pct={t.pct} />
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">{EVIDENCE.caveat} These figures come from the portfolio brief; this app did not collect or audit the reviews.</p>
        </PCard>

        <PCard n={2} icon={<FlaskConical size={16} />} title="The product bet">
          <ol className="space-y-2.5 text-[13.5px] leading-snug">
            <li className="rounded-xl bg-bg p-3"><span className="text-[10.5px] font-extrabold uppercase tracking-wide text-green">Hypothesis 1</span><br /><b>Intent-based ordering lifts conversion among users who do not know what to eat.</b><span className="mt-1 block text-[12px] text-ink-2">Bella turns one sentence into a ranked shortlist with an "Add to cart" on every card — fewer screens between craving and basket.</span></li>
            <li className="rounded-xl bg-bg p-3"><span className="text-[10.5px] font-extrabold uppercase tracking-wide text-green">Hypothesis 2</span><br /><b>All-in pricing reduces checkout abandonment and fee-related support tickets.</b><span className="mt-1 block text-[12px] text-ink-2">Every card shows food + pack + delivery + service, reconciled to the naira with checkout, plus an honest ETA range.</span></li>
          </ol>
          <p className="mt-2 text-[11px] text-ink-3">Both are hypotheses to test in Phase 1–2, not proven outcomes.</p>
        </PCard>

        <PCard n={3} icon={<Target size={16} />} title="How I'd measure it">
          <div className="rounded-xl bg-green-deep p-3 text-white">
            <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-yellow">North star</div>
            <div className="text-[15px] font-extrabold">{NORTH_STAR}</div>
          </div>
          <ul className="mt-3 space-y-1.5 text-[12.5px]">
            {INPUT_METRICS.map((m) => (
              <li key={m.name} className="flex items-start justify-between gap-2">
                <span>{m.name}</span>
                <span className="shrink-0 text-right text-ink-2"><span className="mr-1 rounded bg-yellow px-1 py-px text-[9.5px] font-extrabold uppercase text-[#5c4300]">Hypothesis</span>{m.target}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-[11px] font-extrabold uppercase tracking-wide text-ink-3">Guardrails</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px] text-ink-2">
            {GUARDRAILS.map((g) => <li key={g}>{g}</li>)}
          </ul>
          <div className="mt-3 rounded-xl border border-line p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[12px] font-extrabold">Bella funnel · this demo session</span>
              <span className="text-[10.5px] text-ink-3">simulated local events</span>
            </div>
            <div className="space-y-1.5" aria-label="Simulated funnel">
              {steps.map((s, i) => (
                <div key={s.label} className="grid grid-cols-[104px_1fr_28px] items-center gap-2 text-[12px]">
                  <span className="text-ink-2">{s.label}</span>
                  <span className="h-4 overflow-hidden rounded bg-bg">
                    <span className="block h-full rounded bg-green transition-all duration-500" style={{ width: `${(s.n / max) * 100}%`, opacity: 1 - i * 0.14 }} />
                  </span>
                  <span className="tnum text-right font-extrabold">{s.n}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[10.5px] leading-relaxed text-ink-3">
              Median time to first add: {f.medianTimeToFirstAddSec != null ? `${f.medianTimeToFirstAddSec}s` : '—'} · Breakdowns opened: {f.breakdownOpened}. Logged in your browser only — not Chowdeck analytics.
            </div>
          </div>
        </PCard>

        <PCard n={4} icon={<Rocket size={16} />} title="How I'd ship it">
          <ol className="space-y-3">
            {ROLLOUT.map((p) => (
              <li key={p.phase} className="relative border-l-2 border-green-soft pl-3">
                <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-green" aria-hidden />
                <div className="text-[13px] font-extrabold">{p.phase} <span className="font-semibold text-ink-3">· {p.duration}</span></div>
                <ul className="mt-1 space-y-0.5 text-[12.5px] text-ink-2">
                  {p.points.map((x) => <li key={x}>• {x}</li>)}
                </ul>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[11px] text-ink-3">Proposed plan — none of this has shipped.</p>
        </PCard>
      </div>

      <section className="rounded-[18px] bg-white p-4 shadow-[0_8px_24px_rgb(0_0_0/0.08)]" data-tour="product-lead-contacts" aria-label="Contact">
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-green" />
          <span className="text-[14px] font-extrabold">Built by Temitope Samuel Akinmoladun, Product Manager</span>
        </div>
        <p className="mt-1 text-[12.5px] text-ink-2">Want the full plan? Let's talk.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={CONTACT.email} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-green px-4 text-[13px] font-bold text-white hover:bg-[#027a51]"><Mail size={15} /> Email</a>
          <a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-bold hover:border-green/40"><LinkedinIcon size={15} /> LinkedIn</a>
          <a href={CONTACT.portfolio} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-bold hover:border-green/40"><Globe size={15} /> Portfolio</a>
        </div>
        <p className="mt-3 text-[11px] text-ink-3">{DISCLOSURE}</p>
      </section>
    </div>
  )
}
