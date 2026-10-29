import { useApp } from '../app/AppProvider'
import { ScreenHeader } from '../components/ui'
import { ProductLeadPanel } from '../product-lead/ProductLeadPanel'

export function ProductLeadScreen() {
  const { back } = useApp()
  return (
    <div className="pb-6">
      <ScreenHeader title="Product Lead view" subtitle="How I'd measure it, ship it and grow it" onBack={back} />
      <div className="px-3 pt-3">
        <ProductLeadPanel inPhone />
      </div>
    </div>
  )
}
