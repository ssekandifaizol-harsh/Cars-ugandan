import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../hooks/useApp'

/**
 * Counts new enquiries and listens live. When one arrives it shows a phone notification
 * (works while the app is open or running in the background; push when fully closed is phase 2).
 */
export function useNewEnquiryCount() {
  const { shop } = useApp()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!shop) return
    const load = () => supabase.from('enquiries').select('id', { count: 'exact', head: true })
      .eq('shop_id', shop.id).eq('status', 'new').then(({ count }) => setCount(count ?? 0))
    load()
    const ch = supabase.channel('enquiries-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries', filter: `shop_id=eq.${shop.id}` }, (p) => {
        load()
        if (p.eventType === 'INSERT') notify(p.new as { name: string; message: string | null })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [shop])

  return count
}

async function notify(e: { name: string; message: string | null }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker?.getRegistration()
  const opts = { body: `${e.name}: ${e.message?.slice(0, 80) ?? 'wants a car'}`, icon: '/icon.svg', tag: 'enquiry' }
  if (reg) reg.showNotification('New enquiry', opts)
  else new Notification('New enquiry', opts)
}
