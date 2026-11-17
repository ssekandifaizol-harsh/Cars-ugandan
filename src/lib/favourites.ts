import { useSyncExternalStore } from 'react'

const KEY = 'favourites'
const listeners = new Set<() => void>()
let cache: string[] = read()

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function toggleFavourite(id: string) {
  cache = cache.includes(id) ? cache.filter((x) => x !== id) : [id, ...cache]
  try { localStorage.setItem(KEY, JSON.stringify(cache)) } catch {}
  listeners.forEach((l) => l())
}

export function useFavourites() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => cache)
}
