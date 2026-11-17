import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../hooks/useApp'
import { Seo } from '../components/Seo'
import { GoogleButton } from './Login'
import { TERMS_VERSION } from '../lib/legal'
import { normaliseUgPhone } from '../lib/format'

export default function Signup() {
  const { session } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [pw, setPw] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)

  if (session) return <Navigate to="/account" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('')
    if (name.trim().length < 2) return setMsg('Please type your name.')
    if (phone.trim() && !normaliseUgPhone(phone)) return setMsg('Phone number looks wrong. Example: 0772 123456 (or leave it empty).')
    if (pw.length < 10) return setMsg('Password needs at least 10 characters.')
    if (!agree) return setMsg('Please accept the Terms and Privacy Policy to continue.')
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password: pw,
      options: {
        emailRedirectTo: `${location.origin}/account`,
        data: { full_name: name.trim(), phone: phone.trim() ? normaliseUgPhone(phone) : '', accepted_terms_version: String(TERMS_VERSION) },
      },
    })
    setBusy(false)
    if (error) return setMsg(error.message.includes('already') ? 'An account with this email already exists. Log in instead.' : error.message)
    if (!data.session) setSent(true) // must confirm email first
  }

  if (sent) return (
    <div className="mx-auto flex min-h-[70dvh] max-w-sm flex-col items-center justify-center px-4 text-center">
      <CheckCircle2 size={48} className="text-green-600" />
      <h1 className="mt-4 font-display text-2xl font-bold">Check your email</h1>
      <p className="mt-2 text-zinc-500">We sent a link to <b>{email}</b>. Tap it to activate your account. Check Spam if you don't see it.</p>
    </div>
  )

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-sm flex-col justify-center px-4 py-8">
      <Seo title="Create account" />
      <h1 className="font-display text-3xl font-bold">Create your account</h1>
      <p className="mt-1 text-zinc-500">Save cars on all your devices and get notified when new cars arrive.</p>
      <GoogleButton label="Sign up with Google" className="mt-6" />
      <div className="my-5 flex items-center gap-3 text-xs text-zinc-500"><span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />or with email<span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" /></div>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" placeholder="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <input className="input" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" inputMode="tel" placeholder="Phone (optional)" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="input" type="password" placeholder="Password (10+ characters)" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>I am 18 or older and accept the <Link to="/terms" className="font-semibold text-accent underline">Terms</Link> and <Link to="/privacy" className="font-semibold text-accent underline">Privacy Policy</Link>.</span>
        </label>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="mt-5 text-center text-sm text-zinc-500">Already have an account? <Link to="/login" className="font-semibold text-accent">Log in</Link></p>
    </div>
  )
}
