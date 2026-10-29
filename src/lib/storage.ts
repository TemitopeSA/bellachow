/** Safe localStorage: every access is guarded so the app keeps working in memory when storage is blocked. */
const memory = new Map<string, string>()
const PREFIX = 'bellachow.v1.'

function ls(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    const s = window.localStorage
    const probe = `${PREFIX}__probe`
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}

let cached: Storage | null | undefined

function store(): Storage | null {
  if (cached === undefined) cached = ls()
  return cached
}

export function storageAvailable(): boolean {
  return store() !== null
}

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = store()?.getItem(PREFIX + key) ?? memory.get(key) ?? null
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function save<T>(key: string, value: T): void {
  const raw = JSON.stringify(value)
  memory.set(key, raw)
  try {
    store()?.setItem(PREFIX + key, raw)
  } catch {
    /* quota / privacy mode — memory copy keeps the session working */
  }
}

export function remove(key: string): void {
  memory.delete(key)
  try {
    store()?.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}

export function clearAll(): void {
  memory.clear()
  try {
    const s = store()
    if (!s) return
    Object.keys(s)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => s.removeItem(k))
  } catch {
    /* ignore */
  }
}
