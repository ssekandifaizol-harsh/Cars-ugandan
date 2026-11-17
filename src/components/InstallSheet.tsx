import { AnimatePresence, motion } from 'framer-motion'
import { Download, PlusSquare, Share, X } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useApp } from '../hooks/useApp'
import { canOneTapInstall, isInstalled, isIOS, oneTapInstall, onInstallChange } from '../lib/device'

export function useCanOneTapInstall() {
  return useSyncExternalStore(onInstallChange, canOneTapInstall)
}

/** Install instructions or one-tap button. Used by the auto pop-up and the Account page. */
export function InstallContent({ onDone }: { onDone?: () => void }) {
  const oneTap = useCanOneTapInstall()
  if (isInstalled()) return <p className="text-sm text-zinc-500">✅ The app is installed on this device.</p>
  if (oneTap) return (
    <button className="btn-primary w-full" onClick={async () => { await oneTapInstall(); onDone?.() }}><Download size={18} /> Install app</button>
  )
  if (isIOS()) return (
    <ol className="space-y-3 text-sm">
      <li className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-100 dark:bg-zinc-800"><Share size={16} /></span>Tap the <b>Share</b> button at the bottom of Safari.</li>
      <li className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-100 dark:bg-zinc-800"><PlusSquare size={16} /></span>Scroll and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
      <li className="text-zinc-500">On iPhone, notifications work only after this step.</li>
    </ol>
  )
  return <p className="text-sm text-zinc-500">Open your browser menu (⋮) and tap <b>Install app</b> or <b>Add to Home screen</b>.</p>
}

/** Shows once after a person's first sign-in on a device where the app isn't installed. */
export function InstallSheet() {
  const { session, profile } = useApp()
  const [open, setOpen] = useState(false)
  const key = session ? `install-offered-${session.user.id}` : ''

  useEffect(() => {
    if (!session || !profile?.accepted_terms_version || isInstalled()) return
    try { if (localStorage.getItem(key)) return } catch { return }
    const t = setTimeout(() => setOpen(true), 1500) // give the page a moment first
    return () => clearTimeout(t)
  }, [session, profile?.accepted_terms_version, key])

  const close = () => { setOpen(false); try { localStorage.setItem(key, '1') } catch {} }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[70] bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] dark:bg-zinc-900"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <button onClick={close} className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-zinc-100 dark:bg-zinc-800" aria-label="Not now"><X size={18} /></button>
            <img src="/icon.svg" alt="" className="size-14 rounded-2xl" />
            <h2 className="mt-4 font-display text-2xl font-bold">Install Cars Uganda</h2>
            <p className="mt-1 text-zinc-500">Open it from your home screen like a normal app, and get notified the moment a new car arrives.</p>
            <div className="mt-5"><InstallContent onDone={close} /></div>
            <button className="mt-3 w-full py-2 text-sm text-zinc-500" onClick={close}>Not now</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
