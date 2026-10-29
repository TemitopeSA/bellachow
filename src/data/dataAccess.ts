import vendorsJson from '../../data/vendors.json'
import areasJson from '../../data/areas.json'
import type { Area, AreaId, Hours, MenuItem, Vendor } from './types'
import { haversineKm, parseHHMM } from '../lib/delivery'

type RawItem = {
  slug: string
  name: string
  section: string
  price: number
  previousPrice?: number
  tags: string[]
  diet: string[]
  emoji: string
}

type RawVendor = {
  id: string
  brand: string
  branch: string | null
  area: string | null
  address: string | null
  lat: number | null
  lng: number | null
  rating: number | null
  ratingCount: string | null
  prepMins: number[] | null
  hours: Hours | null
  verified: boolean
  promo: string[]
  categories: string[]
  keywords: string[]
  menuId: string | null
  provenance: string
}

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

/** Validates a raw item. Invalid records are dropped — never patched with invented values. */
function validItem(raw: RawItem): boolean {
  return !!raw.slug && !!raw.name && isNum(raw.price) && raw.price > 0 && Number.isInteger(raw.price)
}

function validHours(h: Hours | null): Hours | null {
  if (!h) return null
  return Number.isFinite(parseHHMM(h.opens)) && Number.isFinite(parseHHMM(h.closes)) ? h : null
}

export function buildVendors(
  raw: { vendors: RawVendor[]; menus: Record<string, { items: RawItem[] }> },
): Vendor[] {
  const seen = new Set<string>()
  const out: Vendor[] = []
  for (const v of raw.vendors) {
    if (!v.id || seen.has(v.id) || !v.brand) continue
    seen.add(v.id)
    const menu = v.menuId ? raw.menus[v.menuId] : undefined
    const items: MenuItem[] = (menu?.items ?? []).filter(validItem).map((it) => ({
      id: `${v.id}:${it.slug}`,
      slug: it.slug,
      vendorId: v.id,
      name: it.name,
      section: it.section || 'Menu',
      price: it.price,
      previousPrice: isNum(it.previousPrice) ? it.previousPrice : undefined,
      tags: Array.isArray(it.tags) ? it.tags : [],
      diet: Array.isArray(it.diet) ? it.diet : [],
      emoji: it.emoji || '🍽️',
    }))
    const prep =
      Array.isArray(v.prepMins) && v.prepMins.length === 2 && v.prepMins.every(isNum)
        ? ([v.prepMins[0], v.prepMins[1]] as [number, number])
        : null
    out.push({
      id: v.id,
      brand: v.brand,
      name: v.branch ? `${v.brand} — ${v.branch}` : v.brand,
      branch: v.branch,
      area: v.area,
      address: v.address,
      lat: isNum(v.lat) ? v.lat : null,
      lng: isNum(v.lng) ? v.lng : null,
      rating: isNum(v.rating) ? v.rating : null,
      ratingCount: v.ratingCount || null,
      prepMins: prep,
      hours: validHours(v.hours),
      verified: !!v.verified,
      promo: Array.isArray(v.promo) ? v.promo : [],
      categories: v.categories ?? [],
      keywords: v.keywords ?? [],
      menuId: v.menuId,
      provenance: v.provenance ?? '',
      items,
    })
  }
  return out
}

export const VENDORS: Vendor[] = buildVendors(vendorsJson as unknown as Parameters<typeof buildVendors>[0])
export const AREAS: Area[] = (areasJson.areas as Area[]).filter((a) => isNum(a.lat) && isNum(a.lng))

const vendorById = new Map(VENDORS.map((v) => [v.id, v]))
const itemById = new Map(VENDORS.flatMap((v) => v.items.map((i) => [i.id, i] as const)))
const areaById = new Map(AREAS.map((a) => [a.id, a]))

export const getVendor = (id: string | null | undefined) => (id ? vendorById.get(id) : undefined)
export const getItem = (id: string) => itemById.get(id)
export const getArea = (id: AreaId) => areaById.get(id) ?? AREAS[0]

/** A vendor is orderable in the demo only if it has supplied menu data, a location and prep time. */
export function isOrderable(v: Vendor): v is Vendor & { lat: number; lng: number; prepMins: [number, number] } {
  return v.items.length > 0 && v.lat != null && v.lng != null && v.prepMins != null
}

export function distanceTo(v: Vendor, area: Area): number | null {
  if (v.lat == null || v.lng == null) return null
  return haversineKm({ lat: area.lat, lng: area.lng }, { lat: v.lat, lng: v.lng })
}

export const CATEGORIES = ['All', 'Pizza', 'African', 'Chicken', 'Drinks', 'Fit Fam', 'Burgers', 'Fast Food', 'Parfait'] as const
