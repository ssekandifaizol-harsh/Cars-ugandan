import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const isConfigured = Boolean(url && key)

// A dummy URL keeps the app from crashing before .env is filled in; pages show a setup notice instead.
export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder', {
  auth: { persistSession: true, autoRefreshToken: true },
})

export const PHOTO_BUCKET = 'car-photos'

export function photoUrl(path?: string | null) {
  if (!path) return ''
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}
