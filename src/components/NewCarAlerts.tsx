import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isConfigured, photoUrl } from '../lib/supabase'
import type { Car } from '../lib/types'
import { useApp } from '../hooks/useApp'
import { invalidateCars } from '../hooks/useCars'
import { playChime } from '../lib/sound'
import { carTitle, priceText } from '../lib/format'

interface Alert { id: string; title: string; body: string; url: string; image?: string }

/**
 * While the app is open: a "New car just dropped" pop-up + chime.
 * Comes from two places (whichever arrives first): the live database feed, or a push message
 * the service worker forwards when the app is on screen.
 */
export function NewCarAlerts() {
  const { shop, profile, session } = useApp()
  const [alert, setAlert] = useState<Alert | null>(null)
  const seen = useRef(new Set<string>())
  const timer = useRef<number>(0)

  const soundOn = () => (session ? profile?.notify_sound !== false : localStorage.getItem('sound') !== 'off')
  const wants = (make: string, price: number | null) => {
    if (!session || !profile) return true
    if (!profile.notify_new_cars) return false
    if (profile.notify_makes.length && !profile.notify_makes.includes(make)) return false
    if (profile.notify_max_price && price && price > profile.notify_max_price) return false
    return true
  }

  const show = (a: Alert) => {
    if (seen.current.has(a.id)) return
    seen.current.add(a.id)
    invalidateCars()
    setAlert(a)
    if (soundOn()) playChime()
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setAlert(null), 9000)
  }

  // 1. Live database feed: fires when the owner's announcement stamps the car.
  useEffect(() => {
    if (!isConfigured) return
    const ch = supabase.channel('new-cars')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cars' }, (p) => {
        const c = p.new as Car
        if (!c.published || !c.notified_at) return
        if (Date.now() - new Date(c.notified_at).getTime() > 2 * 60 * 1000) return // only fresh announcements
        if (!wants(c.make, c.price)) return
        show({ id: `car-${c.id}`, title: `New: ${carTitle(c)}`, body: priceText(c, shop), url: `/cars/${c.slug}`, image: photoUrl(c.cover_path) })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [shop, profile, session]) // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Push forwarded by the service worker while the app is on screen.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== 'NEW_CAR') return
      show({ id: e.data.tag ?? e.data.url, title: e.data.title, body: e.data.body, url: e.data.url, image: e.data.image })
    }
    navigator.serviceWorker.addEventListener('message', onMsg)
    return () => navigator.serviceWorker.removeEventListener('message', onMsg)
  }, [profile, session]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="fixed inset-x-3 top-[calc(12px+env(safe-area-inset-top))] z-[65] mx-auto max-w-md"
          role="status"
        >
          <Link to={alert.url} onClick={() => setAlert(null)} className="card flex items-center gap-3 overflow-hidden p-3 pr-10 shadow-2xl">
            {alert.image
              ? <img src={alert.image} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
              : <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Sparkles /></span>}
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-accent">New car just dropped</p>
              <p className="truncate font-semibold">{alert.title.replace(/^New( car)?: /, '')}</p>
              <p className="truncate text-sm text-zinc-500">{alert.body}</p>
            </div>
          </Link>
          <button onClick={() => setAlert(null)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-zinc-400" aria-label="Close"><X size={16} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
