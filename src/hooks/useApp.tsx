import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from '../lib/supabase'
import type { Role, Shop } from '../lib/types'

interface AppState {
  session: Session | null
  role: Role
  shop: Shop | null
  loading: boolean
  canManage: boolean
  refreshShop: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AppState>(null!)

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<Role>('none')
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)

  // Single-shop app: load the first shop. Later this can be picked by domain.
  const refreshShop = useCallback(async () => {
    if (!isConfigured) return
    const { data } = await supabase.from('shops').select('*').order('created_at').limit(1).maybeSingle()
    setShop(data as Shop | null)
  }, [])

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    refreshShop().finally(() => setLoading(false))
    return () => sub.subscription.unsubscribe()
  }, [refreshShop])

  useEffect(() => {
    if (!session) { setRole('none'); return }
    supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setRole((data?.role as Role) ?? 'none'))
  }, [session])

  // Apply the owner's chosen accent colour to the whole app
  useEffect(() => {
    if (shop?.accent) document.documentElement.style.setProperty('--accent', shop.accent)
  }, [shop?.accent])

  const canManage = role === 'admin' || (role === 'owner' && shop?.owner_id === session?.user.id)

  const signOut = async () => { await supabase.auth.signOut(); setRole('none') }

  return (
    <Ctx.Provider value={{ session, role, shop, loading, canManage, refreshShop, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
