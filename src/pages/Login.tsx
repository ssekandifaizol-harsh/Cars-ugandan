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

  // Google: works only for emails the admin already invited (public sign-up is off in Supabase).
  const google = async () => {
    setMsg(''); setBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/owner`, queryParams: { prompt: 'select_account' } },
    })
    if (error) { setBusy(false); setMsg('Google sign-in is not available right now. Use email and password.') }
  }

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
      {mode === 'login' && (
        <>
          <button type="button" onClick={google} disabled={busy} className="btn-ghost mt-6 w-full border border-zinc-200 dark:border-zinc-700">
            <GoogleIcon /> Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-zinc-500"><span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />or with email<span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" /></div>
        </>
      )}
      <form onSubmit={submit} className={`${mode === 'login' ? '' : 'mt-6 '}space-y-3`}>
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  )
}
