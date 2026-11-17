import { ArrowLeft, Check, MapPin, Phone, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Car, CarPhoto } from '../lib/types'
import { useApp } from '../hooks/useApp'
import { useCars } from '../hooks/useCars'
import { Gallery } from '../components/Gallery'
import { CarCard, HeartButton, StatusBadge } from '../components/CarCard'
import { EnquiryForm } from '../components/EnquiryForm'
import { Reveal } from '../components/Reveal'
import { Seo } from '../components/Seo'
import { CONDITIONS } from '../lib/carData'
import { cap, carTitle, km, priceText, ugx, usdText, whatsappLink } from '../lib/format'

export default function CarDetail() {
  const { slug } = useParams()
  const { shop } = useApp()
  const { cars } = useCars()
  const nav = useNavigate()
  const [car, setCar] = useState<Car | null | undefined>(undefined)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCar(undefined)
    supabase.from('cars').select('*, car_photos(*)').eq('slug', slug!).maybeSingle()
      .then(({ data }) => setCar(data as Car | null))
  }, [slug])

  const photos = useMemo(() => [...(car?.car_photos ?? [])].sort((a: CarPhoto, b: CarPhoto) => a.position - b.position), [car])
  const similar = useMemo(() => (cars ?? []).filter((c) => car && c.id !== car.id && c.status !== 'sold' &&
    (c.make === car.make || c.body_type === car.body_type)).slice(0, 4), [cars, car])

  if (car === undefined) return <div className="mx-auto max-w-6xl p-4"><div className="shimmer aspect-[4/3] max-w-3xl rounded-2xl" /></div>
  if (car === null) return (
    <div className="p-16 text-center">
      <h1 className="font-display text-2xl font-bold">Car not found</h1>
      <p className="mt-2 text-zinc-500">It may have been sold or removed.</p>
      <Link to="/cars" className="btn-primary mt-6">Browse cars</Link>
    </div>
  )

  const title = carTitle(car)
  const url = window.location.href
  const waText = `Hello ${shop?.name ?? ''}, I'm interested in the ${title} (${priceText(car, shop)}). Is it still available?\n${url}`

  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title, text: `${title} — ${priceText(car, shop)}`, url }) } catch {} return }
    await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const specs: [string, string][] = [
    ['Year', String(car.year)],
    ['Mileage', km(car.mileage_km)],
    ['Fuel', cap(car.fuel)],
    ['Gearbox', cap(car.transmission)],
    ['Engine', car.engine_cc ? `${car.engine_cc.toLocaleString()} cc` : '—'],
    ['Body', car.body_type === 'suv' ? 'SUV' : cap(car.body_type)],
    ['Drive', car.drive?.toUpperCase() ?? '—'],
    ['Colour', car.colour ?? '—'],
    ['Seats', car.seats ? String(car.seats) : '—'],
    ['Condition', car.condition ? CONDITIONS[car.condition] : '—'],
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <Seo title={`${title} for sale — ${priceText(car, shop)}`} description={`${title}, ${km(car.mileage_km)}, ${cap(car.fuel)}, ${cap(car.transmission)}. ${car.description?.slice(0, 120) ?? ''}`} />
      <button onClick={() => (history.length > 1 ? nav(-1) : nav('/cars'))} className="mb-3 flex items-center gap-1 text-sm font-medium text-zinc-500"><ArrowLeft size={16} /> Back</button>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <Gallery photos={photos} title={title} />

          <Reveal className="mt-8">
            <h2 className="font-display text-xl font-bold">Key details</h2>
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-800">
              {specs.map(([k, v]) => (
                <div key={k} className="bg-white p-4 dark:bg-zinc-900">
                  <dt className="text-xs text-zinc-500">{k}</dt>
                  <dd className="mt-0.5 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          {car.features.length > 0 && (
            <Reveal className="mt-8">
              <h2 className="font-display text-xl font-bold">Features</h2>
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {car.features.map((f) => <li key={f} className="flex items-center gap-2"><Check size={18} className="text-accent" />{f}</li>)}
              </ul>
            </Reveal>
          )}

          {car.description && (
            <Reveal className="mt-8">
              <h2 className="font-display text-xl font-bold">About this car</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-zinc-700 dark:text-zinc-300">{car.description}</p>
            </Reveal>
          )}

          {!shop?.hide_prices && car.price && car.status !== 'sold' && <Reveal className="mt-8"><FinanceCalc price={car.price} /></Reveal>}
        </div>

        {/* Price + actions: sticky on desktop */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-2"><StatusBadge status={car.status} /></div>
                <h1 className="font-display text-2xl font-bold leading-tight">{title}</h1>
                {car.location && <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500"><MapPin size={14} />{car.location}</p>}
              </div>
              <HeartButton id={car.id} className="!bg-zinc-100 dark:!bg-zinc-800" />
            </div>
            <p className="mt-4 font-display text-3xl font-extrabold text-accent">{priceText(car, shop)}</p>
            <p className="text-sm text-zinc-500">{usdText(car, shop)} {car.negotiable && !shop?.hide_prices && car.price ? '· Negotiable' : ''}</p>

            <div className="mt-5 space-y-2">
              {car.status === 'sold'
                ? <p className="rounded-xl bg-zinc-100 p-3 text-center text-sm dark:bg-zinc-800">This car is sold. See <Link className="font-semibold text-accent" to="/cars">similar cars</Link>.</p>
                : shop?.whatsapp && <a href={whatsappLink(shop.whatsapp, waText)} target="_blank" rel="noopener" className="btn-wa w-full"><WhatsAppIcon /> Enquire on WhatsApp</a>}
              <div className="grid grid-cols-2 gap-2">
                {shop?.phone && <a href={`tel:${shop.phone.replace(/\s/g, '')}`} className="btn-ghost"><Phone size={18} /> Call</a>}
                <button onClick={share} className={`btn-ghost ${shop?.phone ? '' : 'col-span-2'}`}><Share2 size={18} /> {copied ? 'Link copied' : 'Share'}</button>
              </div>
            </div>
          </div>
          {car.status !== 'sold' && <EnquiryForm car={car} />}
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold">You may also like</h2>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{similar.map((c) => <CarCard key={c.id} car={c} />)}</div>
        </section>
      )}

      {/* Phone: WhatsApp bar always within thumb reach */}
      {car.status !== 'sold' && shop?.whatsapp && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1"><p className="truncate text-xs text-zinc-500">{title}</p><p className="font-display font-bold text-accent">{priceText(car, shop)}</p></div>
            <a href={whatsappLink(shop.whatsapp, waText)} target="_blank" rel="noopener" className="btn-wa"><WhatsAppIcon /> WhatsApp</a>
          </div>
        </div>
      )}
    </div>
  )
}

function FinanceCalc({ price }: { price: number }) {
  const [deposit, setDeposit] = useState(30)
  const [months, setMonths] = useState(12)
  const [rate, setRate] = useState(18)
  const loan = price * (1 - deposit / 100)
  const r = rate / 100 / 12
  const monthly = r ? (loan * r) / (1 - Math.pow(1 + r, -months)) : loan / months
  return (
    <div className="card p-5">
      <h2 className="font-display text-xl font-bold">Can I afford it?</h2>
      <p className="text-sm text-zinc-500">A rough guide only. Your bank or lender sets the real terms.</p>
      <div className="mt-4 space-y-4">
        <Slider label="Deposit" value={deposit} set={setDeposit} min={10} max={90} step={5} show={`${deposit}% · ${ugx(price * deposit / 100)}`} />
        <Slider label="Months" value={months} set={setMonths} min={6} max={60} step={6} show={`${months} months`} />
        <Slider label="Interest per year" value={rate} set={setRate} min={0} max={30} step={1} show={`${rate}%`} />
      </div>
      <p className="mt-5 rounded-xl bg-zinc-100 p-4 text-center dark:bg-zinc-800">About <span className="font-display text-xl font-bold text-accent">{ugx(monthly)}</span> per month</p>
    </div>
  )
}

function Slider({ label, value, set, min, max, step, show }: { label: string; value: number; set: (n: number) => void; min: number; max: number; step: number; show: string }) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm"><span className="text-zinc-500">{label}</span><span className="font-semibold">{show}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(+e.target.value)} className="mt-2 w-full accent-[var(--accent)]" />
    </label>
  )
}

export function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.2-.8 1-1 1.2-.4.2-.7.1a8.2 8.2 0 0 1-4-3.5c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.8.4 3.5 3.5 0 0 0-1.1 2.6 6 6 0 0 0 1.3 3.2 13.8 13.8 0 0 0 5.3 4.7c2 .8 2.7.9 3.7.8.6-.1 1.8-.8 2.1-1.5s.3-1.3.2-1.5-.3-.2-.6-.3zM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zM12 0a12 12 0 0 0-10.3 18L0 24l6.2-1.6A12 12 0 1 0 12 0z" /></svg>
}
