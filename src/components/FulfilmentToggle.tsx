import { useApp } from '../app/AppProvider'

export function FulfilmentToggle() {
  const { fulfilment, setFulfilment } = useApp()
  return (
    <div className="grid grid-cols-2 rounded-full bg-bg p-1" role="radiogroup" aria-label="Delivery or pickup">
      {(['delivery', 'pickup'] as const).map((f) => (
        <button
          key={f}
          role="radio"
          aria-checked={fulfilment === f}
          onClick={() => setFulfilment(f)}
          className={`h-9 rounded-full text-[13px] font-bold capitalize transition ${fulfilment === f ? 'bg-white text-green-deep shadow' : 'text-ink-2'}`}
        >
          {f === 'delivery' ? '🛵 Delivery' : '🛍 Pickup'}
        </button>
      ))}
    </div>
  )
}
