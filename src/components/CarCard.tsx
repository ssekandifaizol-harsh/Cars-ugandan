import { Heart, Gauge, Fuel, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { photoUrl } from '../lib/supabase'
import type { Car } from '../lib/types'
import { cap, carTitle, km, priceText } from '../lib/format'
import { toggleFavourite, useFavourites } from '../lib/favourites'
import { useApp } from '../hooks/useApp'

export function StatusBadge({ status }: { status: Car['status'] }) {
  if (status === 'available') return null
  const cls = status === 'sold' ? 'bg-zinc-900/85 text-white' : 'bg-amber-400 text-amber-950'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${cls}`}>{status}</span>
}

export function HeartButton({ id, className = '' }: { id: string; className?: string }) {
  const favs = useFavourites()
  const on = favs.includes(id)
  return (
    <motion.button
      whileTap={{ scale: 1.35 }}
      onClick={(e) => { e.preventDefault(); toggleFavourite(id) }}
      aria-label={on ? 'Remove from saved' : 'Save car'}
      className={`grid size-10 place-items-center rounded-full bg-white/90 shadow backdrop-blur dark:bg-zinc-900/80 ${className}`}
    >
      <Heart size={18} className={on ? 'fill-accent text-accent' : ''} />
    </motion.button>
  )
}

export function CarCard({ car }: { car: Car }) {
  const { shop } = useApp()
  const [loaded, setLoaded] = useState(false)
  return (
    <Link to={`/cars/${car.slug}`} className="group card block overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-200 dark:bg-zinc-800">
        {!loaded && <div className="shimmer absolute inset-0" />}
        {car.cover_path && (
          <img
            src={photoUrl(car.cover_path)} alt={carTitle(car)} loading="lazy" decoding="async"
            onLoad={() => setLoaded(true)}
            className={`size-full object-cover transition duration-500 group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'} ${car.status === 'sold' ? 'grayscale' : ''}`}
          />
        )}
        <div className="absolute left-3 top-3"><StatusBadge status={car.status} /></div>
        <HeartButton id={car.id} className="absolute right-3 top-3" />
      </div>
      <div className="p-4">
        <h3 className="truncate font-display font-semibold">{carTitle(car)}</h3>
        <p className="mt-1 font-display text-lg font-bold text-accent">{priceText(car, shop)}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1"><Gauge size={14} />{km(car.mileage_km)}</span>
          <span className="flex items-center gap-1"><Fuel size={14} />{cap(car.fuel)}</span>
          <span className="flex items-center gap-1"><Settings2 size={14} />{cap(car.transmission)}</span>
        </div>
      </div>
    </Link>
  )
}

export function CarCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="shimmer aspect-[4/3]" />
      <div className="space-y-2 p-4"><div className="shimmer h-4 w-3/4 rounded" /><div className="shimmer h-5 w-1/2 rounded" /></div>
    </div>
  )
}
