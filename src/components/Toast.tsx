import { CheckCircle2 } from 'lucide-react'
import { useApp } from '../app/AppProvider'

export function Toast() {
  const { toast } = useApp()
  return (
    <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-[calc(84px+var(--safe-bottom))] z-50 flex justify-center px-4">
      {toast && (
        <div key={toast.id} className="anim-fade-up flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg">
          <CheckCircle2 size={16} className="text-[#7BE0B4]" aria-hidden />
          {toast.text}
        </div>
      )}
    </div>
  )
}
