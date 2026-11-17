import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Pops up by itself when a new version of the app is live.
 * Checks every 20 minutes and whenever the user comes back to the app.
 */
export function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return
      setInterval(() => reg.update().catch(() => {}), 20 * 60 * 1000)
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}) })
    },
  })

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md md:bottom-6"
          role="alert"
        >
          <div className="card flex items-center gap-3 p-4 shadow-2xl">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent"><RefreshCw size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">New version available</p>
              <p className="text-sm text-zinc-500">Update to get the latest cars and fixes.</p>
            </div>
            <button className="btn-primary !min-h-10 !px-4" onClick={() => updateServiceWorker(true)}>Update</button>
            <button className="grid size-8 place-items-center text-zinc-400" onClick={() => setNeedRefresh(false)} aria-label="Later"><X size={18} /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
