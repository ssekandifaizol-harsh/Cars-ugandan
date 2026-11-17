import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

// Saved cars. Guests: kept on this phone. Signed in: kept in their account, so they follow them to any device.
const KEY = 'favourites'
const listeners = new Set<() => void>()
let cache: string[] = read()
let userId: string | null = null

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function save(list: string[]) {
  cache = list
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
  listeners.forEach((l) => l())
}

/** Called on login/logout. On login, cars saved as a guest are added to the account. */
export async function syncFavourites(uid: string | null) {
  userId = uid
  if (!uid) return
  const { data } = await supabase.from('favourites').select('car_id').order('created_at', { ascending: false })
  const remote = (data ?? []).map((r) => r.car_id as string)
  const missing = cache.filter((id) => !remote.includes(id))
  if (missing.length) await supabase.from('favourites').upsert(missing.map((car_id) => ({ car_id })), { onConflict: 'user_id,car_id', ignoreDuplicates: true })
  save([...new Set([...remote, ...cache])])
}

export function toggleFavourite(id: string) {
  const on = cache.includes(id)
  save(on ? cache.filter((x) => x !== id) : [id, ...cache])
  if (userId) {
    const q = on ? supabase.from('favourites').delete().eq('car_id', id) : supabase.from('favourites').insert({ car_id: id })
    q.then(() => {})
  }
}

export function useFavourites() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => cache)
}
