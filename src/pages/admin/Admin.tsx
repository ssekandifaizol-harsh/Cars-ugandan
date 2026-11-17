import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../hooks/useApp'
import { Seo } from '../../components/Seo'

interface Profile { id: string; email: string; role: string }
interface Log { id: number; action: string; changes: Record<string, unknown>; at: string; actor: string | null }

export default function Admin() {
  const { shop, refreshShop } = useApp()
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [people, setPeople] = useState<Profile[]>([])
  const [logs, setLogs] = useState<Log[]>([])

  const load = async () => {
    const [{ data: p }, { data: l }] = await Promise.all([
      supabase.from('profiles').select('id, email, role').order('created_at'),
      supabase.from('audit_log').select('*').order('at', { ascending: false }).limit(30),
    ])
    setPeople((p as Profile[]) ?? []); setLogs((l as Log[]) ?? [])
  }
  useEffect(() => { load() }, [])

  const setOwner = async (target: string, make: boolean) => {
    if (!shop) return
    const { data, error } = await supabase.rpc('set_owner', { p_email: target, p_shop: shop.id, p_make_owner: make })
    setMsg(error ? error.message : String(data))
    load(); refreshShop()
  }

  const who = (id: string | null) => people.find((p) => p.id === id)?.email ?? 'system'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Seo title="Admin" />
      <h1 className="font-display text-3xl font-bold">Admin</h1>

      <section className="card space-y-3 p-5">
        <h2 className="font-display font-semibold">Give owner access</h2>
        <p className="text-sm text-zinc-500">Step 1: the person creates an account on the site (Sign up, or Continue with Google). Step 2: type their email here.</p>
        <div className="flex gap-2">
          <input className="input" type="email" placeholder="owner@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn-primary" onClick={() => setOwner(email, true)}>Make owner</button>
        </div>
        {msg && <p className="text-sm">{msg}</p>}
      </section>

      <section className="card p-5">
        <h2 className="font-display font-semibold">Accounts</h2>
        <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
          {people.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-3 text-sm">
              <span className="truncate">{p.email} <span className="ml-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">{p.role}</span></span>
              {p.role === 'owner' && <button className="font-semibold text-red-600" onClick={() => confirm(`Remove owner access from ${p.email}?`) && setOwner(p.email, false)}>Remove</button>}
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="font-display font-semibold">Recent changes (audit log)</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {logs.map((l) => (
            <li key={l.id} className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/50">
              <b>{l.action}</b> by {who(l.actor)} · {new Date(l.at).toLocaleString()}
              <pre className="mt-1 overflow-x-auto text-xs text-zinc-500">{JSON.stringify(l.changes)}</pre>
            </li>
          ))}
          {logs.length === 0 && <li className="text-zinc-500">Nothing yet.</li>}
        </ul>
      </section>
    </div>
  )
}
