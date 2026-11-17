import { Car, Inbox, LogOut, Settings, Shield, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../../hooks/useApp'
import { useNewEnquiryCount } from './useEnquiryAlerts'

export default function OwnerShell() {
  const { role, signOut, shop } = useApp()
  const unread = useNewEnquiryCount()
  const [newReviews, setNewReviews] = useState(0)
  useEffect(() => {
    if (!shop) return
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('shop_id', shop.id).eq('status', 'pending')
      .then(({ count }) => setNewReviews(count ?? 0))
  }, [shop])
  const links = [
    { to: '/owner', label: 'My cars', icon: Car, end: true },
    { to: '/owner/enquiries', label: 'Enquiries', icon: Inbox, badge: unread },
    { to: '/owner/sales', label: 'Sales & reviews', icon: Star, badge: newReviews },
    { to: '/owner/settings', label: 'Shop settings', icon: Settings },
    ...(role === 'admin' ? [{ to: '/owner/admin', label: 'Admin', icon: Shield }] : []),
  ]
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `chip ${isActive ? 'chip-on' : ''}`}>
            <l.icon size={16} />{l.label}
            {!!l.badge && <span className="rounded-full bg-white px-1.5 text-xs font-bold text-accent">{l.badge}</span>}
          </NavLink>
        ))}
        <button onClick={signOut} className="chip ml-auto"><LogOut size={16} />Log out</button>
      </div>
      <Outlet />
    </div>
  )
}
