import { ArrowRight, BadgeCheck, MessageCircle, Search, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useCars } from '../hooks/useCars'
import { useApp } from '../hooks/useApp'
import { CarCard, CarCardSkeleton } from '../components/CarCard'
import { Reveal } from '../components/Reveal'
import { Seo } from '../components/Seo'
import { photoUrl } from '../lib/supabase'
import { BODY_TYPES } from '../lib/carData'
import { cap } from '../lib/format'

export default function Home() {
  const { shop } = useApp()
  const { cars, error } = useCars()
  const nav = useNavigate()
  const [q, setQ] = useState('')

  const available = (cars ?? []).filter((c) => c.status !== 'sold')
  const featured = available.filter((c) => c.featured).slice(0, 6)
  const latest = available.slice(0, 8)
  const hero = featured[0] ?? available[0]
  const makes = [...new Set(available.map((c) => c.make))].slice(0, 10)

  return (
    <>
      <Seo title={`${shop?.name ?? 'Cars Uganda'} — Quality cars for sale in Uganda`} />
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-zinc-950 text-white">
        {hero?.cover_path && (
          <motion.img
            src={photoUrl(hero.cover_path)} alt=""
            initial={{ scale: 1.12, opacity: 0 }} animate={{ scale: 1, opacity: 0.45 }} transition={{ duration: 1.4, ease: 'easeOut' }}
            className="absolute inset-0 -z-10 size-full object-cover"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-16 md:pb-24 md:pt-28">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="max-w-2xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Find your next car in <span className="text-accent">Uganda</span>.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 max-w-lg text-lg text-zinc-300">
            {shop?.tagline ?? 'Quality cars, honest prices'}. Real photos, clear prices, chat with us on WhatsApp.
          </motion.p>
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={(e) => { e.preventDefault(); nav(`/cars?q=${encodeURIComponent(q)}`) }}
            className="mt-8 flex max-w-xl gap-2 rounded-2xl bg-white p-2 shadow-2xl">
            <Search className="ml-3 self-center text-zinc-400" size={20} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “Harrier” or “Premio 2010”"
              className="min-w-0 flex-1 bg-transparent px-2 text-base text-zinc-900 outline-none" />
            <button className="btn-primary">Search</button>
          </motion.form>
          {makes.length > 0 && (
            <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
              {makes.map((m) => <Link key={m} to={`/cars?make=${encodeURIComponent(m)}`} className="chip !border-white/15 !bg-white/10 !text-white backdrop-blur hover:!bg-white/20">{m}</Link>)}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {/* Body types */}
        <section className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4">
          {BODY_TYPES.slice(0, 7).map((b) => <Link key={b} to={`/cars?body=${b}`} className="chip">{b === 'suv' ? 'SUV' : cap(b)}</Link>)}
        </section>

        {error && <p className="mt-8 text-center text-red-600">{error}</p>}

        {featured.length > 0 && (
          <section className="mt-12">
            <Reveal><h2 className="font-display text-2xl font-bold">Featured</h2></Reveal>
            <div className="no-scrollbar -mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
              {featured.map((c, i) => <Reveal key={c.id} delay={i * 0.05} className="w-72 shrink-0 snap-start"><CarCard car={c} /></Reveal>)}
            </div>
          </section>
        )}

        <section className="mt-12">
          <Reveal className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold">Just added</h2>
            <Link to="/cars" className="flex items-center gap-1 text-sm font-semibold text-accent">See all <ArrowRight size={16} /></Link>
          </Reveal>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cars === null
              ? Array.from({ length: 4 }, (_, i) => <CarCardSkeleton key={i} />)
              : latest.map((c, i) => <Reveal key={c.id} delay={(i % 4) * 0.05}><CarCard car={c} /></Reveal>)}
          </div>
          {cars?.length === 0 && <p className="card p-10 text-center text-zinc-500">No cars listed yet. Check back soon!</p>}
        </section>

        {/* Trust */}
        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            { icon: BadgeCheck, t: 'Real photos', d: 'Every car shown from every angle, odometer included.' },
            { icon: ShieldCheck, t: 'Honest details', d: 'Mileage, condition and any marks shown up front.' },
            { icon: MessageCircle, t: 'Talk on WhatsApp', d: 'Ask questions and book a viewing in one tap.' },
          ].map((x, i) => (
            <Reveal key={x.t} delay={i * 0.08} className="card p-6">
              <x.icon className="text-accent" />
              <h3 className="mt-3 font-display font-semibold">{x.t}</h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{x.d}</p>
            </Reveal>
          ))}
        </section>
      </div>
    </>
  )
}
