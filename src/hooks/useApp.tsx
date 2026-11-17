import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from '../lib/supabase'
import type { Profile, Role, Shop } from '../lib/types'
import { syncFavourites } from '../lib/favourites'
import { disablePush } from '../lib/push'

interface AppState {
  session: Session | null
  profile: Profile | null
  role: Role | null
  shop: Shop | null
  loading: boolean
  canManage: boolean
  refreshShop: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (change: Partial<Profile>) => Promise<string | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<AppState>(null!)

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [authReady, setAuthReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)

  // Single-shop app: load the first shop.
  const refreshShop = useCallback(async () => {
    if (!isConfigured) return
    const { data } = await supabase.from('shops').select('*').order('created_at').limit(1).maybeSingle()
    setShop(data as Shop | null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
    setProfile(data as Profile | null)
  }, [])

  useEffect(() => {
    if (!isConfigured) { setLoading(false); setAuthReady(true); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    refreshShop().finally(() => setLoading(false))
    return () => sub.subscription.unsubscribe()
  }, [refreshShop])

  useEffect(() => {
    if (!authReady) return
    setProfileReady(false)
    refreshProfile().finally(() => setProfileReady(true))
    syncFavourites(session?.user.id ?? null)
  }, [session?.user.id, authReady, refreshProfile])

  useEffect(() => {
    if (shop?.accent) document.documentElement.style.setProperty('--accent', shop.accent)
  }, [shop?.accent])

  const role = profile?.role ?? null
  const canManage = role === 'admin' || (role === 'owner' && shop?.owner_id === session?.user.id)

  const updateProfile = async (change: Partial<Profile>) => {
    if (!profile) return 'Not signed in'
    setProfile({ ...profile, ...change }) // instant feel
    const { error } = await supabase.from('profiles').update(change).eq('id', profile.id)
    if (error) { refreshProfile(); return error.message }
    return null
  }

  const signOut = async () => {
    await disablePush().catch(() => {}) // this phone stops getting this person's notifications
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <Ctx.Provider value={{ session, profile, role, shop, loading: loading || !authReady || !profileReady, canManage, refreshShop, refreshProfile, updateProfile, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
