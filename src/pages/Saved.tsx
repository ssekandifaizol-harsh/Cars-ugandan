import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCars } from '../hooks/useCars'
import { useFavourites } from '../lib/favourites'
import { CarCard } from '../components/CarCard'
import { Seo } from '../components/Seo'

export default function Saved() {
  const favs = useFavourites()
  const { cars } = useCars()
  const list = (cars ?? []).filter((c) => favs.includes(c.id))
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Seo title="Saved cars" />
      <h1 className="font-display text-3xl font-bold">Saved cars</h1>
      <p className="mt-1 text-zinc-500">Saved on this phone only. Tap the heart on any car to save it.</p>
      {list.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center p-12 text-center">
          <Heart size={40} className="text-zinc-300" />
          <p className="mt-3 text-zinc-500">No saved cars yet.</p>
          <Link to="/cars" className="btn-primary mt-5">Browse cars</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{list.map((c) => <CarCard key={c.id} car={c} />)}</div>
      )}
    </div>
  )
}
