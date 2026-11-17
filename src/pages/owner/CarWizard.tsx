import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, Check, ImagePlus, Loader2, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { photoUrl, supabase, PHOTO_BUCKET } from '../../lib/supabase'
import { useApp } from '../../hooks/useApp'
import { invalidateCars } from '../../hooks/useCars'
import {
  BODY_TYPES, COLOURS, CONDITIONS, DRIVES, ENGINE_SIZES, FEATURES, FUELS, MAKES, PHOTO_ANGLES, TRANSMISSIONS,
} from '../../lib/carData'
import { cap, compressImage, slugify, ugx } from '../../lib/format'
import type { Car, CarPrivate } from '../../lib/types'
import { Seo } from '../../components/Seo'

// ---------- form shape ----------
interface Photo { angle: string; path: string }
interface Form {
  id: string
  slug: string
  make: string; model: string; year: string; price: string; negotiable: boolean; condition: string
  mileage_km: string; fuel: string; transmission: string; body_type: string; engine_cc: string
  colour: string; drive: string; seats: string; location: string; features: string[]; description: string
  photos: Photo[]
  priv: { plate: string; vin: string; buying_price: string; seller_name: string; seller_phone: string; notes: string }
}

const blank = (): Form => ({
  id: crypto.randomUUID(), slug: '',
  make: '', model: '', year: '', price: '', negotiable: true, condition: 'foreign_used',
  mileage_km: '', fuel: '', transmission: 'automatic', body_type: '', engine_cc: '', colour: '', drive: '2wd', seats: '5',
  location: 'Kampala', features: [], description: '', photos: [],
  priv: { plate: '', vin: '', buying_price: '', seller_name: '', seller_phone: '', notes: '' },
})

const STEPS = ['Photos', 'Basics', 'Details', 'Review'] as const
const DRAFT_KEY = 'car-draft-new'
const digits = (s: string) => s.replace(/\D/g, '')
const num = (s: string) => (digits(s) ? Number(digits(s)) : null)
const withCommas = (s: string) => (digits(s) ? Number(digits(s)).toLocaleString('en-UG') : '')

export default function CarWizard() {
  const { id } = useParams() // undefined = new car
  const { shop } = useApp()
  const nav = useNavigate()
  const [f, setF] = useState<Form | null>(null)
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [removed, setRemoved] = useState<string[]>([])
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Load: an existing car from the database, or the unfinished draft saved on this phone.
  useEffect(() => {
    if (!id) {
      try { const d = localStorage.getItem(DRAFT_KEY); setF(d ? { ...blank(), ...JSON.parse(d) } : blank()) } catch { setF(blank()) }
      return
    }
    ;(async () => {
      const [{ data: car }, { data: priv }] = await Promise.all([
        supabase.from('cars').select('*, car_photos(*)').eq('id', id).maybeSingle(),
        supabase.from('car_private').select('*').eq('car_id', id).maybeSingle(),
      ])
      if (!car) { setErr('Car not found.'); return }
      const c = car as Car
      const p = (priv ?? {}) as Partial<CarPrivate>
      const s = (v: unknown) => (v == null ? '' : String(v))
      setF({
        id: c.id, slug: c.slug, make: c.make, model: c.model, year: s(c.year), price: s(c.price), negotiable: c.negotiable,
        condition: s(c.condition), mileage_km: s(c.mileage_km), fuel: s(c.fuel), transmission: s(c.transmission),
        body_type: s(c.body_type), engine_cc: s(c.engine_cc), colour: s(c.colour), drive: s(c.drive), seats: s(c.seats),
        location: s(c.location), features: c.features ?? [], description: s(c.description),
        photos: [...(c.car_photos ?? [])].sort((a, b) => a.position - b.position).map((x) => ({ angle: x.angle, path: x.path })),
        priv: { plate: s(p.plate), vin: s(p.vin), buying_price: s(p.buying_price), seller_name: s(p.seller_name), seller_phone: s(p.seller_phone), notes: s(p.notes) },
      })
    })()
  }, [id])

  // Auto-save new-car drafts on the phone so a lost signal never loses work.
  useEffect(() => {
    if (!id && f) try { localStorage.setItem(DRAFT_KEY, JSON.stringify(f)) } catch {}
  }, [f, id])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => (x ? { ...x, [k]: v } : x))
  const setPriv = (k: keyof Form['priv'], v: string) => setF((x) => (x ? { ...x, priv: { ...x.priv, [k]: v } } : x))

  const missingAngles = useMemo(() => PHOTO_ANGLES.filter((a) => a.required && !f?.photos.some((p) => p.angle === a.key)), [f])
  const stepOk = [
    true, // photos can be finished later (draft)
    !!(f?.make && f.model && f.year),
    true,
    true,
  ]

  if (err) return <p className="card p-8 text-center">{err}</p>
  if (!f || !shop) return <div className="shimmer h-96 rounded-2xl" />

  // ---------- photos ----------
  const upload = async (angle: string, file: File) => {
    setUploading((u) => ({ ...u, [angle]: true }))
    try {
      const blob = await compressImage(file)
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
      const path = `${shop.id}/${f.id}/${angle}-${Date.now().toString(36)}.${ext}`
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000' })
      if (error) throw error
      setF((x) => {
        if (!x) return x
        const old = angle.startsWith('extra') ? undefined : x.photos.find((p) => p.angle === angle)
        if (old) setRemoved((r) => [...r, old.path])
        return { ...x, photos: [...x.photos.filter((p) => p !== old), { angle, path }] }
      })
    } catch {
      alert('Photo upload failed. Check your internet and try again.')
    } finally {
      setUploading((u) => ({ ...u, [angle]: false }))
    }
  }

  // Pick many photos at once: they fill the empty angle slots in order.
  const uploadMany = async (files: FileList) => {
    const empty = PHOTO_ANGLES.filter((a) => !f.photos.some((p) => p.angle === a.key)).map((a) => a.key)
    for (const [i, file] of [...files].entries()) {
      await upload(empty[i] ?? `extra_${Date.now()}_${i}`, file)
    }
  }

  const removePhoto = (path: string) => {
    setRemoved((r) => [...r, path])
    set('photos', f.photos.filter((p) => p.path !== path))
  }

  // ---------- save ----------
  const save = async (publish: boolean) => {
    setErr('')
    if (!stepOk[1]) { setStep(1); setErr('Pick brand, model and year first.'); return }
    if (publish && missingAngles.length) { setStep(0); setErr(`Add the required photos before publishing: ${missingAngles.map((a) => a.label).join(', ')}.`); return }
    if (publish && !num(f.price) && !shop.hide_prices) { setStep(1); setErr('Add a price before publishing.'); return }
    setSaving(true)
    const order = (a: string) => { const i = PHOTO_ANGLES.findIndex((x) => x.key === a); return i < 0 ? 100 : i }
    const photos = [...f.photos].sort((a, b) => order(a.angle) - order(b.angle))
    const carRow = {
      id: f.id, shop_id: shop.id, slug: f.slug || slugify({ year: Number(f.year), make: f.make, model: f.model }),
      make: f.make.trim(), model: f.model.trim(), year: Number(f.year), price: num(f.price), negotiable: f.negotiable,
      condition: f.condition || null, mileage_km: num(f.mileage_km), fuel: f.fuel || null, transmission: f.transmission || null,
      body_type: f.body_type || null, engine_cc: num(f.engine_cc), colour: f.colour || null, drive: f.drive || null,
      seats: num(f.seats), location: f.location.trim() || null, features: f.features, description: f.description.trim() || null,
      cover_path: photos[0]?.path ?? null, published: publish,
    }
    try {
      const r1 = await supabase.from('cars').upsert(carRow)
      if (r1.error) throw r1.error
      const pv = f.priv
      const r2 = await supabase.from('car_private').upsert({
        car_id: f.id, plate: pv.plate.trim().toUpperCase() || null, vin: pv.vin.trim().toUpperCase() || null,
        buying_price: num(pv.buying_price), seller_name: pv.seller_name.trim() || null,
        seller_phone: pv.seller_phone.trim() || null, notes: pv.notes.trim() || null,
      })
      if (r2.error) throw r2.error
      const r3 = await supabase.from('car_photos').delete().eq('car_id', f.id)
      if (r3.error) throw r3.error
      if (photos.length) {
        const r4 = await supabase.from('car_photos').insert(photos.map((p, i) => ({ car_id: f.id, angle: p.angle, path: p.path, position: i })))
        if (r4.error) throw r4.error
      }
      if (removed.length) await supabase.storage.from(PHOTO_BUCKET).remove(removed)
      if (!id) localStorage.removeItem(DRAFT_KEY)
      invalidateCars()
      nav('/owner')
    } catch (e) {
      console.error(e)
      setErr('Could not save. Check your internet and press save again — nothing is lost.')
    } finally {
      setSaving(false)
    }
  }

  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const models = MAKES[f.make] ?? []

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <Seo title={id ? 'Edit car' : 'Add a car'} />
      {/* Progress */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => go(i)} className="flex-1 text-left">
            <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
            <span className={`mt-1.5 block text-xs font-medium ${i === step ? 'text-accent' : 'text-zinc-500'}`}>{i + 1}. {s}</span>
          </button>
        ))}
      </div>

      {err && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{err}</p>}

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div key={step} custom={dir}
          initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }} transition={{ duration: 0.22 }}>

          {step === 0 && (
            <section>
              <h1 className="font-display text-2xl font-bold">Photos</h1>
              <p className="mt-1 text-sm text-zinc-500">Tap a box to take or pick that photo. Photos are shrunk on your phone first to save data. {missingAngles.length > 0 && <b>{missingAngles.length} required left.</b>}</p>
              <label className="btn-ghost mt-4 w-full cursor-pointer">
                <ImagePlus size={18} /> Pick many photos at once
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && uploadMany(e.target.files)} />
              </label>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[...PHOTO_ANGLES, ...f.photos.filter((p) => p.angle.startsWith('extra')).map((p) => ({ key: p.angle, label: 'Extra photo', tip: '', required: false }))].map((a) => {
                  const ph = f.photos.find((p) => p.angle === a.key)
                  return (
                    <div key={a.key} className="relative">
                      <label className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed text-center transition ${ph ? 'border-transparent' : a.required ? 'border-accent/40 bg-accent/5' : 'border-zinc-300 dark:border-zinc-700'}`}>
                        {ph ? <img src={photoUrl(ph.path)} alt={a.label} className="size-full object-cover" />
                          : uploading[a.key] ? <Loader2 className="animate-spin text-accent" />
                          : <><Camera className="text-zinc-400" /><span className="mt-1 px-2 text-xs font-medium">{a.label}{a.required && <span className="text-accent"> *</span>}</span></>}
                        {uploading[a.key] && ph && <div className="absolute inset-0 grid place-items-center bg-black/40"><Loader2 className="animate-spin text-white" /></div>}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(a.key, e.target.files[0])} />
                      </label>
                      {ph && <>
                        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{a.label}</span>
                        <button onClick={() => removePhoto(ph.path)} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-black/60 text-white" aria-label="Remove photo"><X size={14} /></button>
                      </>}
                      {!ph && a.tip && <p className="mt-1 text-[11px] leading-tight text-zinc-500">{a.tip}</p>}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-5">
              <h1 className="font-display text-2xl font-bold">Basics</h1>
              <div>
                <label className="label">Brand *</label>
                <select className="input" value={MAKES[f.make] || !f.make ? f.make : '__other'} onChange={(e) => { set('make', e.target.value === '__other' ? ' ' : e.target.value); set('model', '') }}>
                  <option value="">Choose brand</option>
                  {Object.keys(MAKES).map((m) => <option key={m}>{m}</option>)}
                  <option value="__other">Other…</option>
                </select>
                {f.make && !MAKES[f.make] && <input className="input mt-2" placeholder="Type brand" value={f.make.trim()} onChange={(e) => set('make', e.target.value)} />}
              </div>
              {f.make && (
                <div>
                  <label className="label">Model *</label>
                  {models.length > 0 && (
                    <div className="no-scrollbar -mx-1 mb-2 flex flex-wrap gap-2">
                      {models.map((m) => <button type="button" key={m} onClick={() => set('model', m)} className={`chip ${f.model === m ? 'chip-on' : ''}`}>{m}</button>)}
                    </div>
                  )}
                  <input className="input" placeholder={models.length ? 'Or type the model' : 'Type the model'} value={f.model} onChange={(e) => set('model', e.target.value)} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Year *</label>
                  <select className="input" value={f.year} onChange={(e) => set('year', e.target.value)}>
                    <option value="">Year</option>
                    {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() + 1 - i).map((y) => <option key={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Mileage (km)</label>
                  <input className="input" inputMode="numeric" placeholder="e.g. 85,000" value={withCommas(f.mileage_km)} onChange={(e) => set('mileage_km', digits(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="label">Price (UGX) {!shop.hide_prices && '*'}</label>
                <input className="input font-display text-lg font-bold" inputMode="numeric" placeholder="e.g. 45,000,000" value={withCommas(f.price)} onChange={(e) => set('price', digits(e.target.value))} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[-1e6, -1e5, 1e5, 1e6].map((d) => (
                    <button type="button" key={d} className="chip" onClick={() => set('price', String(Math.max(0, (num(f.price) ?? 0) + d)))}>{d > 0 ? '+' : '−'}{Math.abs(d) >= 1e6 ? `${Math.abs(d) / 1e6}M` : `${Math.abs(d) / 1e3}K`}</button>
                  ))}
                </div>
                {num(f.price) && <p className="mt-1 text-sm text-zinc-500">{ugx(num(f.price)!)}</p>}
                <label className="mt-3 flex items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-[var(--accent)]" checked={f.negotiable} onChange={(e) => set('negotiable', e.target.checked)} />Price is negotiable</label>
              </div>
              <ChipGroup label="Condition" value={f.condition} options={Object.entries(CONDITIONS)} onPick={(v) => set('condition', v)} />
            </section>
          )}

          {step === 2 && (
            <section className="space-y-5">
              <h1 className="font-display text-2xl font-bold">Details</h1>
              <p className="-mt-3 text-sm text-zinc-500">Just tap. Everything here is optional but helps the car sell faster.</p>
              <ChipGroup label="Body type" value={f.body_type} options={BODY_TYPES.map((b) => [b, b === 'suv' ? 'SUV' : cap(b)])} onPick={(v) => set('body_type', v)} />
              <ChipGroup label="Fuel" value={f.fuel} options={FUELS.map((x) => [x, cap(x)])} onPick={(v) => set('fuel', v)} />
              <ChipGroup label="Gearbox" value={f.transmission} options={TRANSMISSIONS.map((x) => [x, cap(x)])} onPick={(v) => set('transmission', v)} />
              <ChipGroup label="Drive" value={f.drive} options={DRIVES.map((x) => [x, x.toUpperCase()])} onPick={(v) => set('drive', v)} />
              <ChipGroup label="Colour" value={f.colour} options={COLOURS.map((x) => [x, x])} onPick={(v) => set('colour', v)} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Engine (cc)</label>
                  <select className="input" value={f.engine_cc} onChange={(e) => set('engine_cc', e.target.value)}>
                    <option value="">—</option>{ENGINE_SIZES.map((c) => <option key={c} value={c}>{c.toLocaleString()} cc</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Seats</label>
                  <select className="input" value={f.seats} onChange={(e) => set('seats', e.target.value)}>
                    {[2, 4, 5, 7, 8, 10, 14].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Where is the car?</label>
                <input className="input" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Kampala, Ntinda" />
              </div>
              <div>
                <label className="label">Features ({f.features.length})</label>
                <div className="flex flex-wrap gap-2">
                  {FEATURES.map((x) => {
                    const on = f.features.includes(x)
                    return <button type="button" key={x} onClick={() => set('features', on ? f.features.filter((y) => y !== x) : [...f.features, x])} className={`chip ${on ? 'chip-on' : ''}`}>{on && <Check size={14} />}{x}</button>
                  })}
                </div>
              </div>
              <div>
                <div className="flex items-end justify-between">
                  <label className="label">Description</label>
                  <button type="button" className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-accent" onClick={() => set('description', autoDescribe(f))}><Sparkles size={14} />Write it for me</button>
                </div>
                <textarea className="input min-h-36" maxLength={4000} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Service history, why selling, anything a buyer should know…" />
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-5">
              <h1 className="font-display text-2xl font-bold">Review</h1>
              <div className="card overflow-hidden">
                {f.photos[0] && <img src={photoUrl([...f.photos].sort((a, b) => PHOTO_ANGLES.findIndex((x) => x.key === a.angle) - PHOTO_ANGLES.findIndex((x) => x.key === b.angle))[0].path)} alt="" className="aspect-[16/9] w-full object-cover" />}
                <div className="p-4">
                  <p className="font-display text-xl font-bold">{f.year} {f.make} {f.model}</p>
                  <p className="font-display text-lg font-bold text-accent">{num(f.price) ? ugx(num(f.price)!) : 'No price yet'}</p>
                  <p className="mt-1 text-sm text-zinc-500">{[f.mileage_km && `${withCommas(f.mileage_km)} km`, cap(f.fuel), cap(f.transmission), f.colour].filter(Boolean).join(' · ')}</p>
                  <p className="mt-2 text-sm">{f.photos.length} photos · {f.features.length} features</p>
                  {missingAngles.length > 0 && <p className="mt-2 text-sm text-amber-700">Missing photos: {missingAngles.map((a) => a.label).join(', ')}</p>}
                </div>
              </div>

              <div className="card space-y-3 p-4">
                <div>
                  <h2 className="font-display font-semibold">Private details 🔒</h2>
                  <p className="text-sm text-zinc-500">Only you and the admin can see these. Buyers never do.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="input" placeholder="Number plate" value={f.priv.plate} onChange={(e) => setPriv('plate', e.target.value)} />
                  <input className="input" placeholder="Chassis / VIN" value={f.priv.vin} onChange={(e) => setPriv('vin', e.target.value)} />
                </div>
                <input className="input" inputMode="numeric" placeholder="Buying price (UGX)" value={withCommas(f.priv.buying_price)} onChange={(e) => setPriv('buying_price', digits(e.target.value))} />
                {num(f.priv.buying_price) && num(f.price) && (
                  <p className="text-sm">Margin if sold at asking price: <b className={num(f.price)! - num(f.priv.buying_price)! >= 0 ? 'text-green-600' : 'text-red-600'}>{ugx(num(f.price)! - num(f.priv.buying_price)!)}</b></p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <input className="input" placeholder="Seller name (if consignment)" value={f.priv.seller_name} onChange={(e) => setPriv('seller_name', e.target.value)} />
                  <input className="input" inputMode="tel" placeholder="Seller phone" value={f.priv.seller_phone} onChange={(e) => setPriv('seller_phone', e.target.value)} />
                </div>
                <textarea className="input min-h-20" placeholder="Private notes" value={f.priv.notes} onChange={(e) => setPriv('notes', e.target.value)} />
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom action bar — always under the thumb */}
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur md:bottom-0 dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-2xl gap-2">
          {step > 0 ? <button className="btn-ghost" onClick={() => go(step - 1)}><ArrowLeft size={18} /></button>
            : <button className="btn-ghost" onClick={() => nav('/owner')}>Cancel</button>}
          {step < 3 ? (
            <button className="btn-primary flex-1" disabled={!stepOk[step]} onClick={() => go(step + 1)}>Next <ArrowRight size={18} /></button>
          ) : (
            <>
              <button className="btn-ghost flex-1" disabled={saving} onClick={() => save(false)}>Save draft</button>
              <button className="btn-primary flex-1" disabled={saving} onClick={() => save(true)}>{saving ? <Loader2 className="animate-spin" size={18} /> : 'Publish'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ChipGroup({ label, value, options, onPick }: { label: string; value: string; options: [string, string][]; onPick: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, t]) => <button type="button" key={v} onClick={() => onPick(value === v ? '' : v)} className={`chip ${value === v ? 'chip-on' : ''}`}>{t}</button>)}
      </div>
    </div>
  )
}

/** Simple template description from the fields — the owner can edit it after. */
function autoDescribe(f: Form) {
  const bits = [
    `Clean ${f.year} ${f.make} ${f.model}${f.colour ? ` in ${f.colour.toLowerCase()}` : ''}.`,
    [f.engine_cc && `${Number(f.engine_cc).toLocaleString()}cc`, f.fuel, f.transmission, f.drive && f.drive.toUpperCase()].filter(Boolean).join(', ') + '.',
    f.mileage_km && `Only ${withCommas(f.mileage_km)} km on the clock.`,
    f.condition && `${CONDITIONS[f.condition]}.`,
    f.features.length && `Comes with ${f.features.slice(0, 6).join(', ').toLowerCase()}${f.features.length > 6 ? ' and more' : ''}.`,
    f.location && `Available for viewing in ${f.location}.`,
    f.negotiable ? 'Price slightly negotiable. Call or WhatsApp to book a viewing.' : 'Call or WhatsApp to book a viewing.',
  ]
  return bits.filter(Boolean).join(' ').replace(/\s+\./g, '.')
}

