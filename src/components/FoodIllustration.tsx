const PALETTES: [string, string][] = [
  ['#FFEDB3', '#FFD36B'],
  ['#FDE3DA', '#F6AE96'],
  ['#DDF1E7', '#94D4B4'],
  ['#FCEBD4', '#F2C27F'],
  ['#E6EDF8', '#B3C5E8'],
  ['#F1E6F7', '#CDB2E2'],
]

function hash(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

const SIZES = {
  xs: { box: 'h-10 w-10 rounded-xl', plate: 30, emoji: 'text-lg' },
  sm: { box: 'h-14 w-14 rounded-xl', plate: 40, emoji: 'text-2xl' },
  md: { box: 'h-20 w-20 rounded-2xl', plate: 56, emoji: 'text-[32px]' },
  lg: { box: 'h-28 w-full rounded-2xl', plate: 76, emoji: 'text-[44px]' },
  xl: { box: 'h-36 w-full rounded-2xl', plate: 96, emoji: 'text-[56px]' },
} as const

/** Original emoji-on-plate illustration with CSS decoration. No photos, no third-party artwork. */
export function FoodIllustration({ emoji, seed, size = 'md', className = '', dim = false }: { emoji: string; seed: string; size?: keyof typeof SIZES; className?: string; dim?: boolean }) {
  const h = hash(seed)
  const [bg, accent] = PALETTES[h % PALETTES.length]
  const s = SIZES[size]
  const rot = (h % 40) - 20
  return (
    <div aria-hidden className={`relative shrink-0 overflow-hidden ${s.box} ${dim ? 'grayscale opacity-60' : ''} ${className}`} style={{ background: bg }}>
      <span className="absolute -right-3 -top-3 h-10 w-10 rounded-full opacity-70" style={{ background: accent }} />
      <span className="absolute -bottom-4 -left-2 h-9 w-14 rounded-full opacity-40" style={{ background: accent, transform: `rotate(${rot}deg)` }} />
      <span className="absolute left-[18%] top-[22%] h-1.5 w-1.5 rounded-full bg-white/70" />
      <span className="absolute right-[22%] bottom-[20%] h-1 w-1 rounded-full bg-white/80" />
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="grid place-items-center rounded-full bg-white shadow-[0_6px_14px_rgb(0_0_0/0.12),inset_0_-3px_0_rgb(0_0_0/0.05)]"
          style={{ width: s.plate, height: s.plate }}
        >
          <span className={`${s.emoji} leading-none`} style={{ transform: `rotate(${rot / 3}deg)` }}>
            {emoji}
          </span>
        </div>
      </div>
    </div>
  )
}
