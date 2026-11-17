import { useEffect, useState } from 'react'
import { isConfigured, supabase } from '../lib/supabase'
import type { Car } from '../lib/types'

// One shop has a few hundred cars at most, so we load them all once and filter on the phone.
// That makes filters instant, even on slow networks.
let cache: Car[] | null = null

export function useCars() {
  const [cars, setCars] = useState<Car[] | null>(cache)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!isConfigured) { setCars([]); return }
    supabase.from('cars').select('*').eq('published', true)
      .order('status', { ascending: true }).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setError('Could not load cars. Pull down to retry.'); return }
        cache = data as Car[]
        setCars(cache)
      })
  }, [])
  return { cars, error }
}

export function invalidateCars() { cache = null }
