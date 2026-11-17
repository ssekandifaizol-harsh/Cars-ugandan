import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { photoUrl } from '../lib/supabase'
import type { CarPhoto } from '../lib/types'
import { angleLabel } from '../lib/carData'

/** Swipeable photo gallery. Tap a photo for full screen (pinch-zoom works there). */
export function Gallery({ photos, title }: { photos: CarPhoto[]; title: string }) {
  const [i, setI] = useState(0)
  const [full, setFull] = useState(false)
  const strip = useRef<HTMLDivElement>(null)

  const go = (n: number) => {
    const next = (n + photos.length) % photos.length
    setI(next)
    strip.current?.children[next]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  useEffect(() => {
    if (!full) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFull(false)
      if (e.key === 'ArrowRight') go(i + 1)
      if (e.key === 'ArrowLeft') go(i - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!photos.length) return <div className="aspect-[4/3] rounded-2xl bg-zinc-200 dark:bg-zinc-800" />

  return (
    <div>
      <div
        ref={strip}
        onScroll={(e) => {
          const el = e.currentTarget
          setI(Math.round(el.scrollLeft / el.clientWidth))
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl bg-zinc-200 dark:bg-zinc-800"
      >
        {photos.map((p, n) => (
          <button key={p.id} onClick={() => { setI(n); setFull(true) }} className="relative aspect-[4/3] w-full shrink-0 snap-center">
            <img src={photoUrl(p.path)} alt={`${title} — ${angleLabel(p.angle)}`} loading={n < 2 ? 'eager' : 'lazy'} className="size-full object-cover" />
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-zinc-500">{i + 1} / {photos.length} · {angleLabel(photos[i]?.angle)}</span>
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost !min-h-9 !px-3" onClick={() => go(i - 1)} aria-label="Previous photo"><ChevronLeft size={18} /></button>
          <button className="btn-ghost !min-h-9 !px-3" onClick={() => go(i + 1)} aria-label="Next photo"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
        {photos.map((p, n) => (
          <button key={p.id} onClick={() => go(n)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition ${n === i ? 'ring-accent' : 'ring-transparent opacity-70'}`}>
            <img src={photoUrl(p.path)} alt="" loading="lazy" className="size-full object-cover" />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {full && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          >
            <button onClick={() => setFull(false)} className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white" aria-label="Close"><X /></button>
            <button onClick={() => go(i - 1)} className="absolute left-2 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white" aria-label="Previous"><ChevronLeft /></button>
            <button onClick={() => go(i + 1)} className="absolute right-2 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white" aria-label="Next"><ChevronRight /></button>
            <motion.img
              key={i} src={photoUrl(photos[i].path)} alt={angleLabel(photos[i].angle)}
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
              drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.4}
              onDragEnd={(_, info) => { if (info.offset.x < -60) go(i + 1); else if (info.offset.x > 60) go(i - 1) }}
              className="max-h-full max-w-full touch-pinch-zoom object-contain"
            />
            <p className="absolute bottom-6 text-sm text-white/70">{i + 1} / {photos.length} · {angleLabel(photos[i].angle)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
