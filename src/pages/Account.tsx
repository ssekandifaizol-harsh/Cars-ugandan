import { Bell, BellOff, ChevronRight, LayoutDashboard, LogOut, Smartphone, Trash2, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../hooks/useApp'
import type { Enquiry } from '../lib/types'
import { Seo } from '../components/Seo'
import { ThemeToggle } from '../components/ThemeToggle'
import { InstallContent } from '../components/InstallSheet'
import { MAKES } from '../lib/carData'
import { carTitle, normaliseUgPhone, timeAgo } from '../lib/format'
import { disablePush, enablePush, pushState, type PushState } from '../lib/push'
import { playChime } from '../lib/sound'
import { isInstalled, isIOS } from '../lib/device'

export default function Account() {
  const { session, profile, role, canManage, loading, updateProfile, signOut } = useApp()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [place, setPlace] = useState('')
  const [saved, setSaved] = useState('')
  const [push, setPush] = useState<PushState | null>(null)
  const [pushBusy, setPushBusy] = useState(false)
  const [enquiries, setEnquiries] = useState<Enquiry[] | null>(null)

  useEffect(() => {
    if (!profile) return
    setName(profile.full_name ?? ''); setPhone(profile.phone ?? ''); setPlace(profile.location ?? '')
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { pushState().then(setPush) }, [])

  useEffect(() => {
    if (!session) return
    supabase.from('enquiries').select('*, cars(make, model, year, slug)').eq('user_id', session.user.id)
      .order('created_at', { ascending: false }).limit(20).then(({ data }) => setEnquiries((data as Enquiry[]) ?? []))
  }, [session])

  if (loading) return <div className="mx-auto max-w-2xl p-4"><div className="shimmer h-64 rounded-2xl" /></div>
  if (!session || !profile) return <Navigate to="/login" replace />

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaved('')
    const p = phone.trim() ? normaliseUgPhone(phone) : null
    if (phone.trim() && !p) return setSaved('Phone number looks wrong. Example: 0772 123456')
    const err = await updateProfile({ full_name: name.trim() || null, phone: p, location: place.trim() || null })
    setSaved(err ? 'Could not save.' : 'Saved ✓')
  }

  const togglePush = async () => {
    setPushBusy(true)
    try { setPush(push === 'on' ? await disablePush() : await enablePush()) }
    catch { setPush(await pushState()) }
    setPushBusy(false)
  }

  const deleteAccount = async () => {
    if (!confirm('Delete your account and all your data (saved cars, enquiries, settings)? This cannot be undone.')) return
    const { error } = await supabase.rpc('delete_my_account')
    if (error) return alert(error.message)
    await signOut(); nav('/')
  }

  const iosNotInstalled = isIOS() && !isInstalled()
  const makes = Object.keys(MAKES)

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <Seo title="My account" />
      <div className="flex items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-accent font-display text-xl font-bold text-white">
          {(profile.full_name || profile.email).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold">{profile.full_name || 'My account'}</h1>
          <p className="truncate text-sm text-zinc-500">{profile.email}{role !== 'customer' && <span className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 text-xs font-semibold capitalize text-accent">{role}</span>}</p>
        </div>
      </div>

      {canManage && (
        <Link to="/owner" className="card flex items-center gap-3 p-4 hover:border-accent">
          <LayoutDashboard className="text-accent" /><span className="flex-1 font-semibold">Open shop manager</span><ChevronRight size={18} />
        </Link>
      )}

      {/* Notifications */}
      <section className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold">Notifications</h2>
        <div className="flex items-start gap-3">
          {push === 'on' ? <Bell className="mt-0.5 shrink-0 text-accent" /> : <BellOff className="mt-0.5 shrink-0 text-zinc-400" />}
          <div className="flex-1">
            <p className="font-medium">New car alerts on this device</p>
            <p className="text-sm text-zinc-500">
              {push === 'on' && 'On. Your phone will tell you when a new car arrives, even when the app is closed.'}
              {push === 'off' && 'Off on this device.'}
              {push === 'blocked' && 'Blocked in your browser settings. Open site settings for this page, allow Notifications, then come back.'}
              {push === 'unsupported' && (iosNotInstalled ? 'On iPhone, first install the app (below), then open it from your Home Screen and turn this on.' : "This browser can't receive notifications.")}
            </p>
          </div>
          {(push === 'on' || push === 'off') && (
            <button onClick={togglePush} disabled={pushBusy} role="switch" aria-checked={push === 'on'}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${push === 'on' ? 'bg-accent' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
              <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${push === 'on' ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          )}
        </div>

        <Toggle on={profile.notify_new_cars} onChange={(v) => updateProfile({ notify_new_cars: v })}
          label="Tell me about new cars" hint="Turn off to stop all new-car alerts on every device." />

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="flex items-center gap-2 font-medium">{profile.notify_sound ? <Volume2 size={18} /> : <VolumeX size={18} />}Sound in the app</p>
            <p className="text-sm text-zinc-500">A chime when a new car pops up while the app is open. When the app is closed, your phone's own notification sound is used.</p>
            {profile.notify_sound && <button className="mt-1 text-sm font-semibold text-accent" onClick={playChime}>▶ Play test sound</button>}
          </div>
          <Switch on={profile.notify_sound} onChange={(v) => { updateProfile({ notify_sound: v }); if (v) playChime() }} />
        </div>

        {profile.notify_new_cars && (
          <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="text-sm font-medium">Only tell me about… <span className="font-normal text-zinc-500">(leave empty for all cars)</span></p>
            <div className="flex flex-wrap gap-2">
              {makes.map((m) => {
                const on = profile.notify_makes.includes(m)
                return <button key={m} onClick={() => updateProfile({ notify_makes: on ? profile.notify_makes.filter((x) => x !== m) : [...profile.notify_makes, m] })} className={`chip !py-1.5 text-xs ${on ? 'chip-on' : ''}`}>{m}</button>
              })}
            </div>
            <div>
              <label className="label">Up to this price</label>
              <select className="input" value={profile.notify_max_price ?? ''} onChange={(e) => updateProfile({ notify_max_price: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Any price</option>
                {[10, 20, 30, 50, 80, 120, 200].map((m) => <option key={m} value={m * 1e6}>UGX {m}M</option>)}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Profile */}
      <form onSubmit={saveProfile} className="card space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Profile</h2>
        <div><label className="label">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" /></div>
        <div><label className="label">Phone (filled in for you when you ask about a car)</label><input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0772 123456" autoComplete="tel" /></div>
        <div><label className="label">Town</label><input className="input" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={80} placeholder="e.g. Kampala" /></div>
        {saved && <p className="text-sm">{saved}</p>}
        <button className="btn-primary w-full">Save profile</button>
      </form>

      {/* App */}
      <section className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Smartphone size={20} />App</h2>
        <InstallContent />
        <div className="flex items-center justify-between"><span className="font-medium">Dark mode</span><ThemeToggle /></div>
      </section>

      {/* My enquiries */}
      <section className="card p-5">
        <h2 className="font-display text-lg font-semibold">My enquiries</h2>
        {enquiries?.length === 0 && <p className="mt-2 text-sm text-zinc-500">None yet. Ask about any car and it shows up here.</p>}
        <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
          {enquiries?.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              {e.cars ? <Link to={`/cars/${e.cars.slug}`} className="font-medium text-accent">{carTitle(e.cars)}</Link> : <span className="font-medium">General question</span>}
              <span className="shrink-0 text-xs text-zinc-500">{e.status === 'new' ? 'Sent' : e.status === 'contacted' ? 'Replied' : 'Closed'} · {timeAgo(e.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Legal + exit */}
      <section className="card divide-y divide-zinc-200 dark:divide-zinc-800">
        {[['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Use'], ['/licenses', 'Licenses']].map(([to, t]) => (
          <Link key={to} to={to} className="flex items-center justify-between p-4">{t}<ChevronRight size={18} className="text-zinc-400" /></Link>
        ))}
        <button onClick={async () => { await signOut(); nav('/') }} className="flex w-full items-center gap-2 p-4 font-medium"><LogOut size={18} />Log out</button>
        {role === 'customer' && <button onClick={deleteAccount} className="flex w-full items-center gap-2 p-4 font-medium text-red-600"><Trash2 size={18} />Delete my account</button>}
      </section>
    </div>
  )
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} role="switch" aria-checked={on}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-accent' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
      <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1"><p className="font-medium">{label}</p><p className="text-sm text-zinc-500">{hint}</p></div>
      <Switch on={on} onChange={onChange} />
    </div>
  )
}
