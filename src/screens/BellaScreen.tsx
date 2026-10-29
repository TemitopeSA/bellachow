import { ArrowUp, Info, Mic, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { recKey, useApp, type ChatMessage } from '../app/AppProvider'
import { QUICK_PROMPTS } from '../bella/fixtures'
import { decorate } from '../bella/rank'
import { runBella } from '../bella/respond'
import type { BellaIntent, Recommendation, Suggestion } from '../bella/types'
import { GroupBasketCard } from '../components/GroupBasketCard'
import { RecommendationCard } from '../components/RecommendationCard'
import { UnderstandingPills } from '../components/UnderstandingPills'
import { naira } from '../lib/formatting'

function BellaAvatar() {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-green text-white" aria-hidden>
      <Sparkles size={14} fill="#FFEDB3" strokeWidth={2} />
    </span>
  )
}

function Bubble({ children, me }: { children: React.ReactNode; me?: boolean }) {
  return me ? (
    <div className="anim-fade-up ml-auto max-w-[82%] rounded-[18px] rounded-br-md bg-green px-3.5 py-2.5 text-[14px] leading-relaxed text-white">{children}</div>
  ) : (
    <div className="anim-fade-up flex max-w-[90%] items-end gap-2">
      <BellaAvatar />
      <div className="rounded-[18px] rounded-bl-md bg-white px-3.5 py-2.5 text-[14px] leading-relaxed shadow-[var(--shadow-card)]">{children}</div>
    </div>
  )
}

function suggestionLabel(s: Suggestion): string {
  switch (s.kind) {
    case 'raise-budget': return `Increase budget to ${naira(s.to)}`
    case 'relax-time': return `Allow up to ${s.to} mins`
    case 'pickup': return 'Try pickup'
    case 'change-area': return 'Change location'
    case 'reduce-people': return `Make it ${s.to} people`
    case 'drop-diet': return 'Remove diet filter'
    case 'drop-craving': return `Drop "${s.craving}"`
  }
}

function ResultBlock({ msg, latest, tourTarget }: { msg: Extract<ChatMessage, { kind: 'result' }>; latest: boolean; tourTarget: boolean }) {
  const { ctxFor, updateIntent, showMore, swap, openSheet, navigate } = useApp()
  // Results are recomputed from the stored intent, so area / Chowpass / pickup / clock changes re-rank live.
  const result = useMemo(() => runBella(msg.intent, ctxFor(msg.intent)), [msg.intent, ctxFor])
  const byKey = new Map(result.ranked.map((r) => [recKey(r), r]))
  const visible: Recommendation[] = []
  for (const k of msg.shown) {
    const r = byKey.get(k)
    if (r) visible.push(r)
  }
  // If live context changed and a shown pick is no longer eligible, backfill honestly from the ranking.
  for (const r of result.ranked) {
    if (visible.length >= Math.min(msg.shown.length, result.ranked.length)) break
    if (!visible.includes(r) && !msg.swappedOut.includes(recKey(r))) visible.push(r)
  }
  const pages: Recommendation[][] = []
  for (let i = 0; i < visible.length; i += 3) pages.push(decorate(visible.slice(i, i + 3), msg.intent))
  const remaining = result.ranked.filter((r) => !visible.includes(r) && !msg.swappedOut.includes(recKey(r))).length

  const applySuggestion = (s: Suggestion) => {
    const i: BellaIntent = { ...msg.intent }
    if (s.kind === 'raise-budget') i.budget = s.to
    if (s.kind === 'relax-time') {
      i.maxMinutes = s.to
      i.maxMinutesInferred = false
    }
    if (s.kind === 'pickup') i.fulfilment = 'pickup'
    if (s.kind === 'reduce-people') i.people = s.to
    if (s.kind === 'drop-diet') i.dietaryRestrictions = []
    if (s.kind === 'drop-craving') i.cravings = i.cravings.filter((c) => c !== s.craving)
    if (s.kind === 'change-area') return openSheet({ kind: 'pill', msgId: msg.id, field: 'area' })
    updateIntent(msg.id, i)
  }

  return (
    <div className="space-y-2.5">
      <Bubble>
        {result.message}
        {result.notes.length > 0 && (
          <ul className="mt-2 space-y-1 border-t border-line pt-2 text-[12.5px] text-ink-2">
            {result.notes.map((n) => (
              <li key={n} className="flex gap-1.5">
                <Info size={13} className="mt-0.5 shrink-0 text-green" aria-hidden /> {n}
              </li>
            ))}
          </ul>
        )}
      </Bubble>
      <UnderstandingPills msgId={msg.id} intent={msg.intent} tour={tourTarget} />

      {result.mode === 'group' && result.group && <GroupBasketCard basket={result.group} intent={msg.intent} />}

      {result.mode === 'single' &&
        pages.map((page, pi) => (
          <div key={pi} className="space-y-2.5">
            {page.map((r, i) => (
              <RecommendationCard key={recKey(r)} rec={r} intent={msg.intent} msgId={msg.id} first={tourTarget && pi === 0 && i === 0} onSwap={() => swap(msg.id, recKey(r))} />
            ))}
          </div>
        ))}

      {result.closest && (
        <>
          <RecommendationCard rec={result.closest} intent={msg.intent} msgId={msg.id} first={tourTarget} />
        </>
      )}

      {result.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Ways to adjust">
          {result.suggestions.map((s) => (
            <button key={s.kind} onClick={() => applySuggestion(s)} className="h-9 rounded-full border border-green/40 bg-white px-3.5 text-[12.5px] font-bold text-green-deep hover:bg-green-soft">
              {suggestionLabel(s)}
            </button>
          ))}
        </div>
      )}

      {result.comingSoon.length > 0 && (
        <div className="rounded-[14px] border border-dashed border-ink-3/40 bg-white/60 p-2.5">
          <div className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-wide text-ink-3">Listed · menu data coming soon</div>
          <div className="flex flex-wrap gap-1.5">
            {result.comingSoon.map((v) => (
              <button key={v.id} onClick={() => navigate({ name: 'vendor', id: v.id })} className="rounded-full bg-bg px-3 py-1.5 text-[12px] font-semibold text-ink-2">
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {result.mode === 'single' && result.ranked.length > 0 && latest && (
        remaining > 0 ? (
          <button onClick={() => showMore(msg.id)} className="h-10 w-full rounded-full border border-line bg-white text-[13.5px] font-bold text-green-deep hover:border-green/40">
            Show me {Math.min(3, remaining)} more
          </button>
        ) : (
          <p className="text-center text-[12px] text-ink-3">That's every option that fits. Tap a pill to widen the search.</p>
        )
      )}
    </div>
  )
}

export function BellaScreen() {
  const { messages, busy, draft, setDraft, submitPrompt, back, resetChat } = useApp()
  const listRef = useRef<HTMLDivElement>(null)
  const started = messages.some((m) => m.role === 'user')
  const lastResultId = [...messages].reverse().find((m) => m.role === 'bella' && m.kind === 'result')?.id

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    // Scroll so the newest message starts in view (results can be taller than the screen).
    const last = el.querySelector('[data-msg-last]') as HTMLElement | null
    if (last) el.scrollTo({ top: Math.max(0, last.offsetTop - 12), behavior: 'smooth' })
    else el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length, busy])

  const send = () => {
    if (draft.trim()) void submitPrompt(draft, 'typed')
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-line/70 bg-white px-3 pb-2.5 pt-[calc(10px+var(--phone-top,0px))]">
        <button onClick={back} aria-label="Go back" className="grid h-10 w-10 place-items-center rounded-full hover:bg-bg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-green text-white" aria-hidden>
          <Sparkles size={17} fill="#FFEDB3" />
        </span>
        <div className="flex-1">
          <h1 className="text-[16px] font-extrabold leading-tight">BellaChow</h1>
          <div className="text-[12px] font-semibold text-green">your food plug</div>
        </div>
        {started && (
          <button onClick={resetChat} aria-label="Start a new chat" className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-bg">
            <RotateCcw size={18} />
          </button>
        )}
      </header>

      <div ref={listRef} className="relative flex-1 space-y-3 overflow-y-auto px-3.5 py-4" aria-live="polite" data-bella-scroll>
        {messages.map((m, idx) => {
          const isLast = idx === messages.length - 1 && idx > 1
          if (m.role === 'user')
            return (
              <div key={m.id} data-msg-last={isLast || undefined}>
                <Bubble me>{m.text}</Bubble>
              </div>
            )
          if (m.kind === 'text')
            return (
              <div key={m.id} data-msg-last={isLast || undefined}>
                <Bubble>{m.text}</Bubble>
              </div>
            )
          return (
            <div key={m.id} data-msg-last={isLast || undefined}>
              <ResultBlock msg={m} latest={m.id === lastResultId} tourTarget={m.id === lastResultId} />
            </div>
          )
        })}

        {!started && (
          <div className="space-y-2 pl-9" data-tour="quick-prompts">
            {QUICK_PROMPTS.map((p) => (
              <button key={p} disabled={busy} onClick={() => void submitPrompt(p, 'quick')} className="anim-fade-up block w-full rounded-[14px] border border-green/25 bg-white px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-green-deep transition hover:border-green hover:bg-green-soft">
                {p}
              </button>
            ))}
          </div>
        )}

        {busy && (
          <div className="flex items-end gap-2" aria-label="Bella is typing">
            <BellaAvatar />
            <div className="flex gap-1 rounded-[18px] rounded-bl-md bg-white px-4 py-3.5 shadow-[var(--shadow-card)]">
              {[0, 1, 2].map((i) => (
                <span key={i} className="typing-dot h-2 w-2 rounded-full bg-green" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-line bg-white px-3 pb-2.5 pt-2">
        {started && (
          <div className="scrollbar-none -mx-3 mb-2 flex gap-1.5 overflow-x-auto px-3">
            {QUICK_PROMPTS.map((p) => (
              <button key={p} disabled={busy} onClick={() => void submitPrompt(p, 'quick')} className="h-8 shrink-0 rounded-full bg-green-soft px-3 text-[12px] font-semibold text-green-deep disabled:opacity-50">
                {p}
              </button>
            ))}
          </div>
        )}
        <form
          data-tour="chat-input"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="flex items-center gap-2 rounded-full bg-bg py-1 pl-4 pr-1 focus-within:ring-2 focus-within:ring-green"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Tell Bella what you're craving…"
            aria-label="Message Bella"
            maxLength={300}
            enterKeyHint="send"
            className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
          <span className="grid h-9 w-9 place-items-center text-ink-3" title="Voice input is not available in this demo" aria-hidden>
            <Mic size={18} />
          </span>
          <button type="submit" disabled={!draft.trim() || busy} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-full bg-green text-white transition disabled:bg-[#b9d6ca]">
            <ArrowUp size={19} strokeWidth={2.6} />
          </button>
        </form>
      </div>
    </div>
  )
}
