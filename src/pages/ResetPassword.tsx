import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// The email link (reset or invite) logs the person in, then they choose a password here.
export default function ResetPassword() {
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const nav = useNavigate()
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.length < 10) return setMsg('Use at least 10 characters.')
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) return setMsg('Link expired. Ask for a new one from the login page.')
    nav('/owner')
  }
  return (
    <form onSubmit={submit} className="mx-auto flex min-h-[70dvh] max-w-sm flex-col justify-center gap-3 px-4">
      <h1 className="font-display text-3xl font-bold">Choose a password</h1>
      <input className="input" type="password" autoComplete="new-password" placeholder="New password (10+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} />
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <button className="btn-primary">Save password</button>
    </form>
  )
}
