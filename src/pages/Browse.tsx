import { SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useCars } from '../hooks/useCars'
import { CarCard, CarCardSkeleton } from '../components/CarCard'
import { Seo } from '../components/Seo'
import { BODY_TYPES, FUELS, TRANSMISSIONS } from '../lib/carData'
import { cap } from '../lib/format'

const SORTS = {
  newest: 'Newest first',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  year_desc: 'Year: newest car',
  km_asc: 'Mileage: lowest',
} as const

// All filters live in the web address, so a filtered list can be shared on WhatsApp.
export default function Browse() {
  const { cars, error } = useCars()
  const [sp, setSp] = useSearchParams()
  const [open, setOpen] = useState(false)
  const get = (k: string) => sp.get(k) ?? ''
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }) }

  const makes = useMemo(() => [...new Set((cars ?? []).map((c) => c.make))].sort(), [cars])

  const list = useMemo(() => {
    const q = get('q').toLowerCase().trim()
    const n = (k: string) => (get(k) ? Number(get(k)) : null)
    let r = (cars ?? []).filter((c) => {
      if (q && !`${c.year} ${c.make} ${c.model} ${c.colour ?? ''} ${c.body_type ?? ''}`.toLowerCase().includes(q)) return false
      if (get('make') && c.make !== get('make')) return false
      if (get('body') && c.body_type !== get('body')) return false
      if (get('fuel') && c.fuel !== get('fuel')) return false
      if (get('trans') && c.transmission !== get('trans')) return false
      if (n('pmin') != null && (c.price ?? 0) < n('pmin')!) return false
      if (n('pmax') != null && (c.price ?? Infinity) > n('pmax')!) return false
      if (n('ymin') != null && c.year < n('ymin')!) return false
      if (n('kmax') != null && (c.mileage_km ?? Infinity) > n('kmax')!) return false
      if (!get('sold') && c.status === 'sold') return false
      return true
    })
    const s = get('sort') || 'newest'
    const by: Record<string, (a: typeof r[0], b: typeof r[0]) => number> = {
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
      price_asc: (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
      price_desc: (a, b) => (b.price ?? 0) - (a.price ?? 0),
      year_desc: (a, b) => b.year - a.year,
      km_asc: (a, b) => (a.mileage_km ?? Infinity) - (b.mileage_km ?? Infinity),
    }
    r = [...r].sort(by[s] ?? by.newest)
    return r
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cars, sp])

  const active = [...sp.keys()].filter((k) => k !== 'sort' && k !== 'q').length

  const Select = ({ k, label, options }: { k: string; label: string; options: [string, string][] }) => (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={get(k)} onChange={(e) => set(k, e.target.value)}>
        <option value="">Any</option>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </div>
  )

  const filters = (
    <div className="space-y-4">
      <Select k="make" label="Brand" options={makes.map((m) => [m, m])} />
      <Select k="body" label="Body type" options={BODY_TYPES.map((b) => [b, b === 'suv' ? 'SUV' : cap(b)])} />
      <div className="grid grid-cols-2 gap-3">
        <Select k="fuel" label="Fuel" options={FUELS.map((f) => [f, cap(f)])} />
        <Select k="trans" label="Gearbox" options={TRANSMISSIONS.map((t) => [t, cap(t)])} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select k="pmin" label="Min price" options={[5, 10, 20, 30, 50, 80, 120].map((m) => [String(m * 1e6), `${m}M`])} />
        <Select k="pmax" label="Max price" options={[10, 20, 30, 50, 80, 120, 200, 400].map((m) => [String(m * 1e6), `${m}M`])} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select k="ymin" label="Year from" options={Array.from({ length: 22 }, (_, i) => String(new Date().getFullYear() - i)).map((y) => [y, y])} />
        <Select k="kmax" label="Max mileage" options={[30, 60, 100, 150, 200].map((k) => [String(k * 1000), `${k},000 km`])} />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={!!get('sold')} onChange={(e) => set('sold', e.target.checked ? '1' : '')} />
        Show sold cars too
      </label>
      {active > 0 && <button className="btn-ghost w-full" onClick={() => setSp(get('q') ? { q: get('q') } : {})}>Clear filters</button>}
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Seo title="Browse cars for sale" />
      <div className="sticky top-16 z-30 -mx-4 bg-zinc-50/90 px-4 py-3 backdrop-blur dark:bg-zinc-950/90">
        <div className="flex gap-2">
          <input className="input" placeholder="Search brand, model, year…" value={get('q')} onChange={(e) => set('q', e.target.value)} />
          <button className="btn-ghost relative shrink-0 lg:hidden" onClick={() => setOpen(true)} aria-label="Filters">
            <SlidersHorizontal size={18} />{active > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent text-xs text-white">{active}</span>}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-zinc-500">{cars ? `${list.length} car${list.length === 1 ? '' : 's'}` : 'Loading…'}</span>
          <select className="rounded-lg bg-transparent font-medium outline-none" value={get('sort') || 'newest'} onChange={(e) => set('sort', e.target.value)}>
            {Object.entries(SORTS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-2 flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block"><div className="card sticky top-40 p-5">{filters}</div></aside>
        <div className="flex-1">
          {error && <p className="text-red-600">{error}</p>}
          <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cars === null
              ? Array.from({ length: 6 }, (_, i) => <CarCardSkeleton key={i} />)
              : <AnimatePresence>{list.map((c) => (
                  <motion.div key={c.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}>
                    <CarCard car={c} />
                  </motion.div>))}</AnimatePresence>}
          </motion.div>
          {cars && list.length === 0 && <p className="card mt-4 p-10 text-center text-zinc-500">{cars.length === 0 ? 'No cars listed yet. Check back soon!' : 'No cars match. Try removing a filter.'}</p>}
        </div>
      </div>

      {/* Phone filter sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.div className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] dark:bg-zinc-900"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Filters</h2>
                <button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full bg-zinc-100 dark:bg-zinc-800" aria-label="Close"><X size={18} /></button>
              </div>
              {filters}
              <button className="btn-primary mt-5 w-full" onClick={() => setOpen(false)}>Show {list.length} cars</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
