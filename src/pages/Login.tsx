import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../hooks/useApp'
import { Seo } from '../components/Seo'

// No sign-up button on purpose: owners are invited by the admin only.
export default function Login() {
  const { session, canManage } = useApp()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  if (session && canManage) return <Navigate to="/owner" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(''); setBusy(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      setBusy(false)
      if (error) return setMsg('Wrong email or password.')
      nav('/owner')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/reset-password` })
      setBusy(false)
      setMsg(error ? 'Could not send. Try again in a minute.' : 'Check your email for a reset link.')
    }
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-sm flex-col justify-center px-4">
      <Seo title="Owner login" />
      <h1 className="font-display text-3xl font-bold">{mode === 'login' ? 'Owner login' : 'Reset password'}</h1>
      <p className="mt-1 text-zinc-500">For the showroom team only.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input className="input" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {mode === 'login' && <input className="input" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
        {msg && <p className="text-sm text-zinc-600 dark:text-zinc-300">{msg}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Send reset link'}</button>
      </form>
      <button className="mt-4 text-sm font-medium text-accent" onClick={() => { setMode(mode === 'login' ? 'forgot' : 'login'); setMsg('') }}>
        {mode === 'login' ? 'Forgot password?' : 'Back to login'}
      </button>
      {session && !canManage && <p className="mt-6 rounded-xl bg-amber-100 p-3 text-sm text-amber-900">You are logged in but have no owner access yet. Ask the admin.</p>}
    </div>
  )
}
