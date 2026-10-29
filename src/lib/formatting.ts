const ngn = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 })

export function naira(n: number): string {
  return `₦${ngn.format(Math.round(n))}`
}

/** Compact budget label: 6000 → ₦6k, 25000 → ₦25k, 6500 → ₦6.5k */
export function nairaCompact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000
    return `₦${Number.isInteger(k) ? k : k.toFixed(1).replace(/\.0$/, '')}k`
  }
  return naira(n)
}

export function etaLabel([a, b]: [number, number]): string {
  return a === b ? `${a} mins` : `${a}–${b} mins`
}

export function km(n: number): string {
  return n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(1)} km`
}

export function budgetBand(n: number | undefined): string {
  if (n == null) return 'none'
  if (n < 3000) return '<3k'
  if (n < 6000) return '3–6k'
  if (n < 10000) return '6–10k'
  if (n < 25000) return '10–25k'
  return '25k+'
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}
