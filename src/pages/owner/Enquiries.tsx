import { Bell, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Enquiry } from '../../lib/types'
import { useApp } from '../../hooks/useApp'
import { carTitle, timeAgo, whatsappLink } from '../../lib/format'
import { WhatsAppIcon } from '../CarDetail'
import { Seo } from '../../components/Seo'

export default function Enquiries() {
  const { shop } = useApp()
  const [list, setList] = useState<Enquiry[] | null>(null)
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied')

  const load = async () => {
    if (!shop) return
    const { data } = await supabase.from('enquiries').select('*, cars(make, model, year, slug)')
      .eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(200)
    setList((data as Enquiry[]) ?? [])
  }

  useEffect(() => {
    load()
    if (!shop) return
    const ch = supabase.channel('enquiries-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries', filter: `shop_id=eq.${shop.id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [shop]) // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (id: string, status: Enquiry['status']) => {
    setList((l) => l?.map((e) => (e.id === id ? { ...e, status } : e)) ?? null)
    await supabase.from('enquiries').update({ status }).eq('id', id)
  }

  const askPermission = async () => setPerm(await Notification.requestPermission())
  const shown = (list ?? []).filter((e) => filter === 'all' || e.status !== 'closed')

  return (
    <div>
      <Seo title="Enquiries" />
      <h1 className="font-display text-3xl font-bold">Enquiries</h1>
      {perm !== 'granted' && typeof Notification !== 'undefined' && (
        <button onClick={askPermission} className="mt-4 flex w-full items-center gap-3 rounded-xl bg-accent/10 p-4 text-left text-sm">
          <Bell className="shrink-0 text-accent" />
          <span><b>Turn on alerts</b> so your phone tells you when a buyer asks about a car. On iPhone, first add this app to your Home Screen.</span>
        </button>
      )}
      <div className="mt-5 flex gap-2">
        <button className={`chip ${filter === 'open' ? 'chip-on' : ''}`} onClick={() => setFilter('open')}>Open</button>
        <button className={`chip ${filter === 'all' ? 'chip-on' : ''}`} onClick={() => setFilter('all')}>All</button>
      </div>
      <div className="mt-4 space-y-3">
        {list === null && <div className="shimmer h-28 rounded-2xl" />}
        {list && shown.length === 0 && <p className="card p-10 text-center text-zinc-500">No enquiries yet. They appear here the moment a buyer sends one.</p>}
        {shown.map((e) => (
          <div key={e.id} className={`card p-4 ${e.status === 'new' ? 'border-l-4 !border-l-accent' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{e.name} <span className="font-normal text-zinc-500">· {e.phone}</span></p>
                {e.cars ? <Link to={`/cars/${e.cars.slug}`} className="text-sm font-medium text-accent">{carTitle(e.cars)}</Link> : <p className="text-sm text-zinc-500">General enquiry</p>}
              </div>
              <span className="shrink-0 text-xs text-zinc-500">{timeAgo(e.created_at)}</span>
            </div>
            {e.message && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{e.message}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <a className="btn-wa !min-h-10 text-sm" target="_blank" rel="noopener" onClick={() => e.status === 'new' && setStatus(e.id, 'contacted')}
                href={whatsappLink(e.phone, `Hello ${e.name}, this is ${shop?.name}. Thanks for asking${e.cars ? ` about the ${carTitle(e.cars)}` : ''}.`)}>
                <WhatsAppIcon /> Reply
              </a>
              <a className="btn-ghost !min-h-10 text-sm" href={`tel:${e.phone}`} onClick={() => e.status === 'new' && setStatus(e.id, 'contacted')}><Phone size={16} />Call</a>
              <select value={e.status} onChange={(ev) => setStatus(e.id, ev.target.value as Enquiry['status'])} className="input !min-h-10 !w-auto !py-1 text-sm">
                <option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
