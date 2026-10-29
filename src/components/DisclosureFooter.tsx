import { DISCLOSURE } from '../lib/config'

export function DisclosureFooter() {
  return (
    <footer className="mx-4 mt-6 rounded-xl border border-line bg-white/60 px-3 py-2.5 text-center text-[11px] leading-relaxed text-ink-2">
      {DISCLOSURE}
      <br />
      <span className="text-ink-3">Portfolio concept · simulated ordering · prices approximate</span>
    </footer>
  )
}
