import { useApp } from '../app/AppProvider'
import { AccountScreen } from '../screens/AccountScreen'
import { BellaScreen } from '../screens/BellaScreen'
import { CartScreen } from '../screens/CartScreen'
import { CheckoutScreen } from '../screens/CheckoutScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { OrdersScreen } from '../screens/OrdersScreen'
import { ProductLeadScreen } from '../screens/ProductLeadScreen'
import { SearchScreen } from '../screens/SearchScreen'
import { TrackingScreen } from '../screens/TrackingScreen'
import { VendorScreen } from '../screens/VendorScreen'
import { BottomNavigation } from './BottomNavigation'
import { SheetHost } from './SheetHost'
import { Toast } from './Toast'

function Screen() {
  const { route } = useApp()
  switch (route.name) {
    case 'home': return <HomeScreen />
    case 'search': return <SearchScreen initial={route.q} />
    case 'bella': return <BellaScreen />
    case 'vendor': return <VendorScreen id={route.id} highlight={route.highlight} />
    case 'cart': return <CartScreen />
    case 'checkout': return <CheckoutScreen />
    case 'tracking': return <TrackingScreen orderId={route.orderId} />
    case 'orders': return <OrdersScreen />
    case 'account': return <AccountScreen />
    case 'lead': return <ProductLeadScreen />
  }
}

/** The app inside the phone (or full-screen on a real phone). */
export function AppShell() {
  const { route } = useApp()
  const key = route.name === 'vendor' ? `vendor:${route.id}` : route.name === 'tracking' ? `t:${route.orderId}` : route.name
  const selfScrolling = route.name === 'bella'
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-bg">
      <main data-scroll-root className={`relative flex-1 overflow-x-hidden ${selfScrolling ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <div key={key} className={`anim-fade ${selfScrolling ? 'h-full' : 'min-h-full'}`}>
          <Screen />
        </div>
      </main>
      <BottomNavigation />
      <SheetHost />
      <Toast />
    </div>
  )
}
