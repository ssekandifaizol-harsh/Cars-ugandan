import { Navigate, Outlet } from 'react-router-dom'
import { useApp } from '../hooks/useApp'

/** Only admin or this shop's owner gets in. The database (RLS) also blocks everyone else. */
export function RequireManager({ adminOnly = false }: { adminOnly?: boolean }) {
  const { session, role, canManage, loading } = useApp()
  if (loading) return <div className="p-10 text-center text-zinc-500">Loading…</div>
  if (!session) return <Navigate to="/login" replace />
  if (adminOnly ? role !== 'admin' : !canManage) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h1 className="font-display text-xl font-bold">No access yet</h1>
        <p className="mt-2 text-zinc-500">You are logged in, but this account has not been given owner access. Ask the admin.</p>
      </div>
    )
  }
  return <Outlet />
}
