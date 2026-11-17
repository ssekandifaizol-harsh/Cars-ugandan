import { Loader2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { photoUrl, supabase, PHOTO_BUCKET } from '../../lib/supabase'
import { useApp } from '../../hooks/useApp'
import type { Shop } from '../../lib/types'
import { compressImage, normaliseUgPhone } from '../../lib/format'
import { Seo } from '../../components/Seo'

const ACCENTS = ['#b91c1c', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0d9488', '#2563eb', '#1d4ed8', '#7c3aed', '#18181b']

export default function Settings() {
  const { shop, refreshShop } = useApp()
  const [s, setS] = useState<Shop | null>(shop)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => setS(shop), [shop])
  if (!s) return null

  const set = <K extends keyof Shop>(k: K, v: Shop[K]) => setS({ ...s, [k]: v })
  const txt = (k: keyof Shop) => (s[k] as string | null) ?? ''

  const uploadLogo = async (file: File) => {
    setBusy(true)
    const blob = await compressImage(file, 512, 0.9)
    const path = `${s.id}/logo/logo-${Date.now().toString(36)}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type })
    setBusy(false)
    if (error) return setMsg('Logo upload failed.')
    set('logo_path', path)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('')
    let whatsapp: string | null = null
    if (s.whatsapp?.trim()) {
      whatsapp = normaliseUgPhone(s.whatsapp)
      if (!whatsapp) return setMsg('WhatsApp number looks wrong. Use a Ugandan number like 0772 123456.')
    }
    setBusy(true)
    const { id, owner_id: _o, ...rest } = s
    const clean = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v]))
    const { error } = await supabase.from('shops').update({ ...clean, whatsapp, name: s.name.trim() || 'Cars Uganda', accent: s.accent }).eq('id', id)
    setBusy(false)
    if (error) return setMsg('Could not save: ' + error.message)
    await refreshShop()
    setMsg('Saved ✓')
  }

  const Field = ({ k, label, ...p }: { k: keyof Shop; label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div><label className="label">{label}</label><input className="input" value={txt(k)} onChange={(e) => set(k, e.target.value as never)} {...p} /></div>
  )

  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-6 pb-10">
      <Seo title="Shop settings" />
      <h1 className="font-display text-3xl font-bold">Shop settings</h1>

      <section className="card space-y-4 p-5">
        <h2 className="font-display font-semibold">Your shop</h2>
        <div className="flex items-center gap-4">
          <div className="size-16 overflow-hidden rounded-2xl bg-zinc-200 dark:bg-zinc-800">{s.logo_path && <img src={photoUrl(s.logo_path)} alt="" className="size-full object-cover" />}</div>
          <label className="btn-ghost cursor-pointer">{busy ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />} Logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
          </label>
        </div>
        {Field({ k: 'name', label: 'Shop name', maxLength: 80 })}
        {Field({ k: 'tagline', label: 'Short slogan', maxLength: 140, placeholder: 'Quality cars, honest prices' })}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-display font-semibold">How buyers reach you</h2>
        {Field({ k: 'whatsapp', label: 'WhatsApp number *', inputMode: 'tel', placeholder: '0772 123456' })}
        {Field({ k: 'phone', label: 'Phone for calls', inputMode: 'tel', placeholder: '+256 772 123456' })}
        {Field({ k: 'email', label: 'Email', type: 'email' })}
        {Field({ k: 'address', label: 'Showroom address', placeholder: 'Plot 12, Jinja Road, Kampala' })}
        {Field({ k: 'map_url', label: 'Google Maps link', placeholder: 'Paste the share link from Google Maps' })}
        {Field({ k: 'hours', label: 'Opening hours', placeholder: 'Mon–Sat 8am–7pm' })}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-display font-semibold">Prices</h2>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-[var(--accent)]" checked={s.hide_prices} onChange={(e) => set('hide_prices', e.target.checked)} />Hide all prices — show “Call for price”</label>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-[var(--accent)]" checked={s.show_usd} onChange={(e) => set('show_usd', e.target.checked)} />Also show price in US dollars</label>
        {s.show_usd && <div><label className="label">UGX per 1 USD</label><input className="input" inputMode="decimal" value={s.usd_rate ?? ''} onChange={(e) => set('usd_rate', e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 3700" /></div>}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-display font-semibold">Look</h2>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((c) => <button type="button" key={c} onClick={() => set('accent', c)} aria-label={c} style={{ background: c }} className={`size-10 rounded-full ring-offset-2 ring-offset-white transition dark:ring-offset-zinc-900 ${s.accent === c ? 'ring-2 ring-zinc-900 dark:ring-white' : ''}`} />)}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-display font-semibold">Social links</h2>
        {Field({ k: 'facebook', label: 'Facebook page' })}
        {Field({ k: 'instagram', label: 'Instagram' })}
        {Field({ k: 'tiktok', label: 'TikTok' })}
      </section>

      {msg && <p className="text-sm font-medium">{msg}</p>}
      <button className="btn-primary w-full" disabled={busy}>Save settings</button>
    </form>
  )
}
