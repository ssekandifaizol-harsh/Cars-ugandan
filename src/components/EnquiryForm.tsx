import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { normaliseUgPhone } from '../lib/format'
import type { Car } from '../lib/types'
import { useApp } from '../hooks/useApp'

export function EnquiryForm({ car }: { car?: Car }) {
  const { shop } = useApp()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState(car ? `Hi, I'm interested in the ${car.year} ${car.make} ${car.model}. Is it still available?` : '')
  const [trap, setTrap] = useState('') // hidden field: bots fill it, people don't
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (trap) { setState('done'); return }
    const p = normaliseUgPhone(phone)
    if (name.trim().length < 2) return setError('Please type your name.')
    if (!p) return setError('Please type a valid Ugandan phone number, e.g. 0772 123456.')
    if (!shop) return setError('Shop not loaded. Check your connection and try again.')
    setState('sending')
    const { error } = await supabase.from('enquiries').insert({
      shop_id: shop.id, car_id: car?.id ?? null, name: name.trim(), phone: p, message: message.trim() || null,
    })
    if (error) { setState('idle'); setError(error.message.includes('Too many') ? error.message : 'Could not send. Please try again or use WhatsApp.'); return }
    setState('done')
  }

  if (state === 'done') {
    return (
      <div className="card flex flex-col items-center p-6 text-center">
        <CheckCircle2 className="text-green-600" size={40} />
        <p className="mt-3 font-semibold">Sent! We'll call or WhatsApp you soon.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <h3 className="font-display font-semibold">{car ? 'Ask about this car' : 'Send us a message'}</h3>
      <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
      <input className="input" placeholder="Phone (e.g. 0772 123456)" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" />
      <textarea className="input min-h-24" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
      <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} className="hidden" aria-hidden />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send enquiry'}</button>
    </form>
  )
}
