import { Check, MapPin, Send } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../app/AppProvider'
import { AREAS } from '../data/dataAccess'
import { PillEditorSheet } from './PillEditorSheet'
import { PriceBreakdownSheet } from './PriceBreakdownSheet'
import { Sheet } from './Sheet'
import { Button } from './ui'

function AreaSheet() {
  const { areaId, setArea, closeSheet } = useApp()
  return (
    <Sheet title="Deliver to" onClose={closeSheet}>
      <p className="mb-3 text-[12.5px] text-ink-2">Pick your area. Distances, fees, ETAs and Bella's picks update instantly. Area centres are approximate — no GPS is used.</p>
      <ul className="divide-y divide-line">
        {AREAS.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => {
                setArea(a.id)
                closeSheet()
              }}
              className="flex w-full items-center gap-3 py-3 text-left"
              aria-current={areaId === a.id}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-full ${areaId === a.id ? 'bg-green text-white' : 'bg-bg text-ink-2'}`}>
                <MapPin size={16} />
              </span>
              <span className="flex-1">
                <span className="block text-[14px] font-bold">{a.name}</span>
                <span className="block text-[12px] text-ink-3">{a.defaultAddress}</span>
              </span>
              {areaId === a.id && <Check size={18} className="text-green" aria-label="Selected" />}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

function RiderChat() {
  const { closeSheet } = useApp()
  const [msgs, setMsgs] = useState<{ me: boolean; t: string }[]>([{ me: false, t: "Hi, I'm Tunde 👋 I'm on my way with your order." }])
  const [text, setText] = useState('')
  const send = (t: string) => {
    if (!t.trim()) return
    setMsgs((m) => [...m, { me: true, t: t.trim() }, { me: false, t: 'Alright, no wahala! (Simulated rider reply — demo only.)' }])
    setText('')
  }
  return (
    <Sheet title="Chat with Tunde" onClose={closeSheet}>
      <div className="mb-2 rounded-lg bg-cream px-3 py-2 text-[11.5px] font-semibold text-[#9b2f15]">Simulated conversation — no message is sent to a real rider.</div>
      <div className="space-y-2 pb-2">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13.5px] ${m.me ? 'ml-auto rounded-br-md bg-green text-white' : 'rounded-bl-md bg-bg'}`}>
            {m.t}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 pb-2">
        {['Please call when you arrive', "I'm at the gate", 'Thank you!'].map((q) => (
          <button key={q} onClick={() => send(q)} className="rounded-full border border-line px-3 py-1.5 text-[12.5px] font-semibold">
            {q}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="Message Tunde (demo)" aria-label="Message rider" className="h-11 flex-1 rounded-full border border-line px-4 text-[14px] outline-none focus:border-green" />
        <button aria-label="Send message" className="grid h-11 w-11 place-items-center rounded-full bg-green text-white">
          <Send size={17} />
        </button>
      </form>
    </Sheet>
  )
}

export function SheetHost() {
  const { sheet, closeSheet, clearCart } = useApp()
  if (!sheet) return null
  switch (sheet.kind) {
    case 'breakdown':
      return <PriceBreakdownSheet source={sheet.source} />
    case 'area':
      return <AreaSheet />
    case 'pill':
      return <PillEditorSheet msgId={sheet.msgId} field={sheet.field} />
    case 'rider-chat':
      return <RiderChat />
    case 'switch-vendor':
      return (
        <Sheet
          title="Start a new cart?"
          onClose={closeSheet}
          footer={
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={closeSheet}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={() => {
                  clearCart()
                  sheet.onConfirm()
                }}
              >
                Clear cart & add
              </Button>
            </div>
          }
        >
          <p className="text-[14px] leading-relaxed text-ink-2">
            Your cart has items from <b className="text-ink">{sheet.vendorName}</b>. One order comes from one kitchen, so we won't mix baskets. Clear it to add from this vendor?
          </p>
        </Sheet>
      )
    case 'confirm':
      return (
        <Sheet
          title={sheet.title}
          onClose={closeSheet}
          footer={
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={closeSheet}>Cancel</Button>
              <Button
                className="flex-1 !bg-orange"
                onClick={() => {
                  closeSheet()
                  sheet.onConfirm()
                }}
              >
                {sheet.confirmLabel}
              </Button>
            </div>
          }
        >
          <p className="text-[14px] leading-relaxed text-ink-2">{sheet.body}</p>
        </Sheet>
      )
  }
}
