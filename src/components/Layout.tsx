import { Car, Heart, Home, LayoutDashboard, Phone, Search } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../hooks/useApp'
import { photoUrl, isConfigured } from '../lib/supabase'
import { ThemeToggle } from './ThemeToggle'
import { useFavourites } from '../lib/favourites'

export function Layout() {
  const { shop, canManage } = useApp()
  const { pathname } = useLocation()
  const favs = useFavourites()

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }) }, [pathname])

  const tabs = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/cars', label: 'Browse', icon: Search },
    { to: '/saved', label: 'Saved', icon: Heart, badge: favs.length },
    { to: '/contact', label: 'Contact', icon: Phone },
    ...(canManage ? [{ to: '/owner', label: 'Manage', icon: LayoutDashboard }] : []),
  ]

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      {!isConfigured && (
        <div className="bg-amber-400 px-4 py-2 text-center text-sm font-medium text-amber-950">
          Setup needed: add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env (see README).
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            {shop?.logo_path
              ? <img src={photoUrl(shop.logo_path)} alt="" className="size-9 rounded-xl object-cover" />
              : <span className="grid size-9 place-items-center rounded-xl bg-accent text-white"><Car size={20} /></span>}
            <span className="font-display text-lg font-bold tracking-tight">{shop?.name ?? 'Cars Uganda'}</span>
          </Link>
          <nav className="ml-8 hidden gap-1 md:flex">
            {tabs.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end}
                className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <Outlet />
        </motion.main>
      </AnimatePresence>

      <footer className="mt-16 border-t border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
        © {new Date().getFullYear()} {shop?.name ?? 'Cars Uganda'} · {shop?.address ?? 'Kampala, Uganda'}
        <div className="mt-2"><Link to="/login" className="underline-offset-4 hover:underline">Owner login</Link></div>
      </footer>

      {/* Bottom tab bar for phones */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="flex">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) => `relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${isActive ? 'text-accent' : 'text-zinc-500'}`}>
              <t.icon size={22} />
              {t.label}
              {!!t.badge && <span className="absolute right-[calc(50%-20px)] top-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] text-white">{t.badge}</span>}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
