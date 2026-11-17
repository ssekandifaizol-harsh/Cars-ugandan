import { Check, Copy, EyeOff, Plus, Send, ThumbsUp, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Car, Review, Sale } from '../../lib/types'
import { useApp } from '../../hooks/useApp'
import { invalidateCars } from '../../hooks/useCars'
import { carTitle, normaliseUgPhone, timeAgo, ugx, whatsappLink } from '../../lib/format'
import { Stars } from '../../components/Stars'
import { Seo } from '../../components/Seo'

const surveyUrl = (token: string) => `${location.origin}/review/${token}`

export default function Sales() {
  const { shop } = useApp()
  const [sp, setSp] = useSearchParams()
  const [tab, setTab] = useState<'reviews' | 'sales'>(sp.get('car') ? 'sales' : 'reviews')
  const [sales, setSales] = useState<Sale[] | null>(null)
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [cars, setCars] = useState<Car[]>([])
  const [form, setForm] = useState<{ car_id: string; car_label: string; buyer_name: string; buyer_phone: string; sold_price: string } | null>(
    sp.get('car') ? { car_id: sp.get('car')!, car_label: '', buyer_name: '', buyer_phone: '', sold_price: '' } : null)
  const [err, setErr] = useState('')
  const [justMade, setJustMade] = useState<Sale | null>(null)
  const [copied, setCopied] = useState('')

  const load = async () => {
    if (!shop) return
    const [s, r, c] = await Promise.all([
      supabase.from('sales').select('*, reviews(id)').eq('shop_id', shop.id).order('created_at', { ascending: false }),
      supabase.from('reviews').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false }),
      supabase.from('cars').select('id, year, make, model, price, status').eq('shop_id', shop.id).order('created_at', { ascending: false }),
    ])
    setSales((s.data as Sale[]) ?? []); setReviews((r.data as Review[]) ?? []); setCars((c.data as Car[]) ?? [])
  }

  useEffect(() => {
    load()
    if (!shop) return
    const ch = supabase.channel('reviews-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `shop_id=eq.${shop.id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [shop]) // eslint-disable-line react-hooks/exhaustive-deps

  // Private scores: only the owner sees these. Not shown publicly, because they include hidden reviews.
  const stats = useMemo(() => {
    const r = reviews ?? []
    if (!r.length) return null
    const avg = (k: keyof Review) => {
      const v = r.map((x) => x[k]).filter((x): x is number => typeof x === 'number')
      return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '—'
    }
    const rec = r.filter((x) => x.recommend !== null)
    return {
      count: r.length,
      overall: avg('rating_overall'), car: avg('rating_car'), service: avg('rating_service'), value: avg('rating_value'),
      recommend: rec.length ? Math.round((rec.filter((x) => x.recommend).length / rec.length) * 100) + '%' : '—',
      answered: sales?.length ? Math.round((r.length / sales.length) * 100) + '%' : '—',
    }
  }, [reviews, sales])

  // ---------- record a sale ----------
  const saveSale = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('')
    if (!form || !shop) return
    const car = cars.find((c) => c.id === form.car_id)
    const label = car ? carTitle(car) : form.car_label.trim()
    const phone = normaliseUgPhone(form.buyer_phone)
    if (label.length < 2) return setErr('Pick the car, or type what was sold.')
    if (form.buyer_name.trim().length < 2) return setErr("Type the buyer's name.")
    if (!phone) return setErr('Type a valid Ugandan phone number, e.g. 0772 123456.')
    const price = Number(form.sold_price.replace(/\D/g, '')) || null
    const { data, error } = await supabase.from('sales').insert({
      shop_id: shop.id, car_id: car?.id ?? null, car_label: label, buyer_name: form.buyer_name.trim(), buyer_phone: phone, sold_price: price,
    }).select().single()
    if (error) return setErr('Could not save. Check your internet and try again.')
    if (car && car.status !== 'sold') { await supabase.from('cars').update({ status: 'sold' }).eq('id', car.id); invalidateCars() }
    setForm(null); setSp({}, { replace: true }); setJustMade(data as Sale); load()
  }

  const surveyMessage = (s: Sale) =>
    `Hello ${s.buyer_name.split(' ')[0]}, thank you for buying your ${s.car_label} from ${shop?.name}! ` +
    `Could you take 1 minute to tell us how we did? ${surveyUrl(s.survey_token)}`

  const markSent = async (s: Sale) => {
    await supabase.from('sales').update({ survey_sent_at: new Date().toISOString() }).eq('id', s.id)
    load()
  }

  // An old link stops working and a fresh 60-day link is made.
  const renewLink = async (s: Sale) => {
    await supabase.from('sales').update({
      survey_token: crypto.randomUUID(), survey_sent_at: null,
      survey_expires_at: new Date(Date.now() + 60 * 864e5).toISOString(),
    }).eq('id', s.id)
    load()
  }

  const copy = async (s: Sale) => {
    await navigator.clipboard.writeText(surveyUrl(s.survey_token)); setCopied(s.id); setTimeout(() => setCopied(''), 2000)
  }

  const deleteSale = async (s: Sale) => {
    if (!confirm(`Delete the sale record for ${s.buyer_name}? Their review (if any) is deleted too. This cannot be undone.`)) return
    await supabase.from('sales').delete().eq('id', s.id); load()
  }

  // ---------- moderate reviews ----------
  const setStatus = async (r: Review, status: Review['status']) => {
    setReviews((l) => l?.map((x) => (x.id === r.id ? { ...x, status } : x)) ?? null)
    await supabase.from('reviews').update({ status }).eq('id', r.id)
  }
  const deleteReview = async (r: Review) => {
    if (!confirm('Delete this review permanently? It will be removed from the site and the database. This cannot be undone.')) return
    setReviews((l) => l?.filter((x) => x.id !== r.id) ?? null)
    await supabase.from('reviews').delete().eq('id', r.id)
  }

  const pending = reviews?.filter((r) => r.status === 'pending').length ?? 0
  const unsold = cars.filter((c) => c.status !== 'sold' || c.id === form?.car_id)

  return (
    <div className="mx-auto max-w-3xl">
      <Seo title="Sales & reviews" />
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Sales & reviews</h1>
        <button className="btn-primary" onClick={() => { setForm({ car_id: '', car_label: '', buyer_name: '', buyer_phone: '', sold_price: '' }); setTab('sales'); setJustMade(null) }}><Plus size={18} /> Record sale</button>
      </div>
      <p className="mt-1 text-sm text-zinc-500">Record each sale, then send the buyer a private 1-minute survey on WhatsApp. Reviews appear on the website only if the buyer agrees <b>and</b> you approve.</p>

      {stats && (
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[['Overall', stats.overall], ['Car', stats.car], ['Service', stats.service], ['Value', stats.value], ['Recommend', stats.recommend], ['Replied', stats.answered]].map(([k, v]) => (
            <div key={k} className="card p-3 text-center"><p className="font-display text-xl font-bold">{v}</p><p className="text-xs text-zinc-500">{k}</p></div>
          ))}
          <p className="col-span-full text-xs text-zinc-500">🔒 Private scores from {stats.count} survey{stats.count > 1 ? 's' : ''}. Only you see these.</p>
        </div>
      )}

      {/* Record-sale form */}
      {form && (
        <form onSubmit={saveSale} className="card mt-5 space-y-3 p-5">
          <div className="flex items-center justify-between"><h2 className="font-display font-semibold">Record a sale</h2><button type="button" onClick={() => { setForm(null); setSp({}, { replace: true }) }} aria-label="Close"><X size={18} /></button></div>
          <div>
            <label className="label">Car sold</label>
            <select className="input" value={form.car_id} onChange={(e) => setForm({ ...form, car_id: e.target.value })}>
              <option value="">Not listed on the site…</option>
              {unsold.map((c) => <option key={c.id} value={c.id}>{carTitle(c)}{c.price ? ` — ${ugx(c.price)}` : ''}</option>)}
            </select>
            {!form.car_id && <input className="input mt-2" placeholder="Type the car, e.g. 2012 Toyota Premio" value={form.car_label} onChange={(e) => setForm({ ...form, car_label: e.target.value })} />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="Buyer's name" value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} />
            <input className="input" inputMode="tel" placeholder="Buyer's WhatsApp (0772 123456)" value={form.buyer_phone} onChange={(e) => setForm({ ...form, buyer_phone: e.target.value })} />
          </div>
          <input className="input" inputMode="numeric" placeholder="Final price (UGX, private, optional)" value={form.sold_price ? Number(form.sold_price.replace(/\D/g, '')).toLocaleString('en-UG') : ''} onChange={(e) => setForm({ ...form, sold_price: e.target.value.replace(/\D/g, '') })} />
          <p className="text-xs text-zinc-500">The car is marked <b>Sold</b> on the website automatically.</p>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button className="btn-primary w-full">Save sale</button>
        </form>
      )}

      {justMade && (
        <div className="card mt-5 border-green-500/40 bg-green-50 p-5 dark:bg-green-950/30">
          <p className="font-semibold">Sale saved ✓ Now send {justMade.buyer_name.split(' ')[0]} the survey:</p>
          <a className="btn-wa mt-3 w-full" target="_blank" rel="noopener" href={whatsappLink(justMade.buyer_phone, surveyMessage(justMade))} onClick={() => markSent(justMade)}><Send size={18} /> Send survey on WhatsApp</a>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button className={`chip ${tab === 'reviews' ? 'chip-on' : ''}`} onClick={() => setTab('reviews')}>Reviews {pending > 0 && <span className="rounded-full bg-white px-1.5 text-xs font-bold text-accent">{pending} new</span>}</button>
        <button className={`chip ${tab === 'sales' ? 'chip-on' : ''}`} onClick={() => setTab('sales')}>Sales · {sales?.length ?? 0}</button>
      </div>

      {tab === 'reviews' && (
        <div className="mt-4 space-y-3">
          {reviews === null && <div className="shimmer h-32 rounded-2xl" />}
          {reviews?.length === 0 && <p className="card p-10 text-center text-zinc-500">No reviews yet. Record a sale and send the survey — answers appear here instantly.</p>}
          {reviews?.map((r) => (
            <div key={r.id} className={`card p-4 ${r.status === 'pending' ? 'border-l-4 !border-l-accent' : ''} ${r.status === 'hidden' ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Stars value={r.rating_overall} />
                  <p className="mt-1 text-sm font-semibold">{r.display_name || 'Anonymous'} · <span className="font-normal text-zinc-500">{r.car_label}</span></p>
                </div>
                <span className="shrink-0 text-xs text-zinc-500">{timeAgo(r.created_at)}</span>
              </div>
              {r.comment && <p className="mt-2 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">“{r.comment}”</p>}
              <p className="mt-2 text-xs text-zinc-500">
                Car {r.rating_car ?? '—'}/5 · Service {r.rating_service ?? '—'}/5 · Value {r.rating_value ?? '—'}/5
                {r.recommend !== null && <> · {r.recommend ? 'Would recommend' : 'Would not recommend'}</>}
              </p>
              <p className="mt-1 text-xs font-medium">
                {!r.allow_publish ? '🔒 Private — buyer did not allow publishing'
                  : r.status === 'approved' ? '🌍 Showing on website' : r.status === 'hidden' ? 'Hidden from website' : 'Waiting for your approval'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.allow_publish && r.status !== 'approved' && <button className="btn-primary !min-h-10 text-sm" onClick={() => setStatus(r, 'approved')}><Check size={16} />Show on website</button>}
                {r.status === 'approved' && <button className="btn-ghost !min-h-10 text-sm" onClick={() => setStatus(r, 'hidden')}><EyeOff size={16} />Hide</button>}
                {r.status === 'pending' && !r.allow_publish && <button className="btn-ghost !min-h-10 text-sm" onClick={() => setStatus(r, 'hidden')}><ThumbsUp size={16} />Mark read</button>}
                <button className="btn-ghost !min-h-10 text-sm text-red-600" onClick={() => deleteReview(r)}><Trash2 size={16} />Delete forever</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'sales' && (
        <div className="mt-4 space-y-3">
          {sales?.length === 0 && !form && <p className="card p-10 text-center text-zinc-500">No sales recorded yet.</p>}
          {sales?.map((s) => {
            const answered = !!s.reviews?.length
            const expired = new Date(s.survey_expires_at) < new Date()
            return (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{s.car_label}</p>
                    <p className="text-sm text-zinc-500">{s.buyer_name} · {s.buyer_phone}{s.sold_price ? ` · ${ugx(s.sold_price)}` : ''}</p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500">{new Date(s.sold_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}</span>
                </div>
                <p className="mt-2 text-xs font-medium">
                  {answered ? '✅ Survey answered' : expired ? '⌛ Survey link expired' : s.survey_sent_at ? `📨 Survey sent ${timeAgo(s.survey_sent_at)} — waiting` : '⚠ Survey not sent yet'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!answered && !expired && <>
                    <a className="btn-wa !min-h-10 text-sm" target="_blank" rel="noopener" href={whatsappLink(s.buyer_phone, surveyMessage(s))} onClick={() => markSent(s)}><Send size={16} />{s.survey_sent_at ? 'Send again' : 'Send survey'}</a>
                    <button className="btn-ghost !min-h-10 text-sm" onClick={() => copy(s)}><Copy size={16} />{copied === s.id ? 'Copied' : 'Copy link'}</button>
                  </>}
                  {!answered && expired && <button className="btn-ghost !min-h-10 text-sm" onClick={() => renewLink(s)}>Make new link</button>}
                  <button className="btn-ghost !min-h-10 text-sm text-red-600" onClick={() => deleteSale(s)}><Trash2 size={16} />Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
