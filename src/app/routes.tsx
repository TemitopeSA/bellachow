export type Route =
  | { name: 'home' }
  | { name: 'search'; q?: string }
  | { name: 'bella' }
  | { name: 'vendor'; id: string; highlight?: string }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'tracking'; orderId: string }
  | { name: 'orders' }
  | { name: 'account' }
  | { name: 'lead' }

export function pathFor(r: Route): string {
  switch (r.name) {
    case 'home': return '/'
    case 'search': return '/search'
    case 'bella': return '/bella'
    case 'vendor': return `/vendor/${encodeURIComponent(r.id)}`
    case 'cart': return '/cart'
    case 'checkout': return '/checkout'
    case 'tracking': return `/orders/${encodeURIComponent(r.orderId)}`
    case 'orders': return '/orders'
    case 'account': return '/account'
    case 'lead': return '/product-lead'
  }
}

export function routeFromPath(path: string): Route {
  const parts = path.replace(/\/+$/, '').split('/').filter(Boolean)
  const [a, b] = parts
  switch (a) {
    case undefined: return { name: 'home' }
    case 'search': return { name: 'search' }
    case 'bella': return { name: 'bella' }
    case 'vendor': return b ? { name: 'vendor', id: decodeURIComponent(b) } : { name: 'home' }
    case 'cart': return { name: 'cart' }
    case 'checkout': return { name: 'checkout' }
    case 'orders': return b ? { name: 'tracking', orderId: decodeURIComponent(b) } : { name: 'orders' }
    case 'account': return { name: 'account' }
    case 'product-lead': return { name: 'lead' }
    default: return { name: 'home' }
  }
}

/** Which bottom tab is active for a route. */
export function tabFor(r: Route): 'home' | 'search' | 'bella' | 'orders' | 'account' | null {
  switch (r.name) {
    case 'home':
    case 'vendor':
      return 'home'
    case 'search': return 'search'
    case 'bella': return 'bella'
    case 'orders':
    case 'tracking':
      return 'orders'
    case 'account':
    case 'lead':
      return 'account'
    default: return null
  }
}
