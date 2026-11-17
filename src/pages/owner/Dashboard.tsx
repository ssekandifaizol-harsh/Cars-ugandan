import { Eye, EyeOff, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, photoUrl } from '../../lib/supabase'
import type { Car, Status } from '../../lib/types'
import { useApp } from '../../hooks/useApp'
import { invalidateCars } from '../../hooks/useCars'
import { announceCar } from '../../lib/push'
import { carTitle, priceText } from '../../lib/format'
import { Seo } from '../../components/Seo'

export default function Dashboard() {
  const { shop } = useApp()
  const [cars, setCars] = useState<Car[] | null>(null)
  const [tab, setTab] = useState<'all' | 'drafts' | Status>('all')
  const nav = useNavigate()

  const load = async () => {
    if (!shop) return
    const { data } = await supabase.from('cars').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false })
    setCars((data as Car[]) ?? [])
  }
  useEffect(() => { load() }, [shop]) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (id: string, change: Partial<Car>) => {
    setCars((cs) => cs?.map((c) => (c.id === id ? { ...c, ...change } : c)) ?? null) // instant feel
    const { error } = await supabase.from('cars').update(change).eq('id', id)
    if (error) { alert('Could not save. Check your internet.'); load() }
    invalidateCars()
    if (change.published) announceCar(id)
    if (change.status === 'sold' && confirm('Marked as sold. Record the buyer now so you can send them a satisfaction survey?')) {
      nav(`/owner/sales?car=${id}`)
    }
  }

  const remove = async (car: Car) => {
    if (!confirm(`Delete ${carTitle(car)} for good? Tip: "Mark sold" keeps it as proof of sales.`)) return
    const { data: ph } = await supabase.from('car_photos').select('path').eq('car_id', car.id)
    if (ph?.length) await supabase.storage.from('car-photos').remove(ph.map((p) => p.path))
    await supabase.from('cars').delete().eq('id', car.id)
    invalidateCars(); load()
  }

  const counts = {
    all: cars?.length ?? 0,
    drafts: cars?.filter((c) => !c.published).length ?? 0,
    available: cars?.filter((c) => c.published && c.status === 'available').length ?? 0,
    reserved: cars?.filter((c) => c.status === 'reserved').length ?? 0,
    sold: cars?.filter((c) => c.status === 'sold').length ?? 0,
  }
  const shown = (cars ?? []).filter((c) => tab === 'all' ? true : tab === 'drafts' ? !c.published : c.status === tab && c.published)

  return (
    <div>
      <Seo title="My cars" />
      {!shop?.whatsapp && (
        <Link to="/owner/settings" className="mb-4 block rounded-xl bg-amber-100 p-4 text-sm text-amber-900">
          ⚠ Add your WhatsApp number in <b>Shop settings</b> so buyers can reach you.
        </Link>
      )}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">My cars</h1>
        <Link to="/owner/cars/new" className="btn-primary"><Plus size={18} /> Add car</Link>
      </div>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
        {(Object.keys(counts) as (keyof typeof counts)[]).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`chip ${tab === k ? 'chip-on' : ''}`}>{k[0].toUpperCase() + k.slice(1)} · {counts[k]}</button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {cars === null && <div className="shimmer h-24 rounded-2xl" />}
        {cars?.length === 0 && (
          <div className="card p-10 text-center">
            <p className="text-zinc-500">No cars yet. Add your first one — it takes about 3 minutes.</p>
            <Link to="/owner/cars/new" className="btn-primary mt-4">Add your first car</Link>
          </div>
        )}
        {shown.map((c) => (
          <div key={c.id} className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-3">
              <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
                {c.cover_path && <img src={photoUrl(c.cover_path)} alt="" className="size-full object-cover" loading="lazy" />}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{carTitle(c)}</p>
                <p className="text-sm font-semibold text-accent">{priceText(c)}</p>
                <p className="text-xs text-zinc-500">{c.published ? 'Live on site' : 'Draft — hidden from buyers'}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={c.status} onChange={(e) => patch(c.id, { status: e.target.value as Status })} className="input !min-h-10 !w-auto !py-1.5 text-sm">
                <option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option>
              </select>
              <IconBtn title={c.published ? 'Hide from buyers' : 'Publish'} onClick={() => patch(c.id, { published: !c.published })}>{c.published ? <Eye size={18} /> : <EyeOff size={18} />}</IconBtn>
              <IconBtn title="Feature on home page" onClick={() => patch(c.id, { featured: !c.featured })}><Star size={18} className={c.featured ? 'fill-amber-400 text-amber-400' : ''} /></IconBtn>
              <Link to={`/owner/cars/${c.id}`} className="btn-ghost !min-h-10 !px-3" title="Edit"><Pencil size={18} /></Link>
              <IconBtn title="Delete" onClick={() => remove(c)}><Trash2 size={18} className="text-red-600" /></IconBtn>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return <button title={title} aria-label={title} onClick={onClick} className="btn-ghost !min-h-10 !px-3">{children}</button>
}
