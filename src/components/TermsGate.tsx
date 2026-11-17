import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../hooks/useApp'
import { TERMS_VERSION } from '../lib/legal'

/** One-time: after sign-in, the user must accept the Terms and Privacy Policy (again only if they change). */
export function TermsGate() {
  const { session, profile, updateProfile, signOut } = useApp()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (!session || !profile || (profile.accepted_terms_version ?? 0) >= TERMS_VERSION) return null
  if (['/privacy', '/terms'].includes(location.pathname)) return null // let them read first

  const accept = async () => {
    setBusy(true); setErr('')
    const e = await updateProfile({ accepted_terms_version: TERMS_VERSION, accepted_terms_at: new Date().toISOString() })
    setBusy(false)
    if (e) setErr('Could not save. Check your internet and try again.')
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl dark:bg-zinc-900" role="dialog" aria-modal="true">
        <ShieldCheck className="text-accent" size={36} />
        <h2 className="mt-3 font-display text-2xl font-bold">{(profile.accepted_terms_version ?? 0) > 0 ? 'Our terms have changed' : 'Welcome to Cars Uganda'}</h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Before you continue, please read and accept our <Link to="/terms" className="font-semibold text-accent underline">Terms of Use</Link> and{' '}
          <Link to="/privacy" className="font-semibold text-accent underline">Privacy Policy</Link>. They explain what we collect (your name, email, phone), why, and your rights.
        </p>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <button className="btn-primary mt-5 w-full" onClick={accept} disabled={busy}>{busy ? 'Saving…' : 'I accept'}</button>
        <button className="mt-2 w-full py-2 text-sm text-zinc-500" onClick={signOut}>Don't accept — log me out</button>
      </div>
    </div>
  )
}
