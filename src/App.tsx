import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AppProvider } from './hooks/useApp'
import { Layout } from './components/Layout'
import { RequireManager } from './components/RequireManager'
import Home from './pages/Home'
import Browse from './pages/Browse'
import CarDetail from './pages/CarDetail'
import Saved from './pages/Saved'
import Contact from './pages/Contact'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Review from './pages/Review'
import Signup from './pages/Signup'
import Account from './pages/Account'
import { UpdatePrompt } from './components/UpdatePrompt'
import { InstallSheet } from './components/InstallSheet'
import { TermsGate } from './components/TermsGate'
import { NewCarAlerts } from './components/NewCarAlerts'

// Owner screens load only when needed, so buyers download less.
const OwnerShell = lazy(() => import('./pages/owner/OwnerShell'))
const Dashboard = lazy(() => import('./pages/owner/Dashboard'))
const CarWizard = lazy(() => import('./pages/owner/CarWizard'))
const Enquiries = lazy(() => import('./pages/owner/Enquiries'))
const Sales = lazy(() => import('./pages/owner/Sales'))
const Settings = lazy(() => import('./pages/owner/Settings'))
const Admin = lazy(() => import('./pages/admin/Admin'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Licenses = lazy(() => import('./pages/Licenses'))

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="p-10 text-center text-zinc-500">Loading…</div>}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="cars" element={<Browse />} />
              <Route path="cars/:slug" element={<CarDetail />} />
              <Route path="saved" element={<Saved />} />
              <Route path="contact" element={<Contact />} />
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route path="account" element={<Account />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="terms" element={<Terms />} />
              <Route path="licenses" element={<Licenses />} />
              <Route path="reset-password" element={<ResetPassword />} />
              <Route path="review/:token" element={<Review />} />
              <Route path="owner" element={<RequireManager />}>
                <Route element={<OwnerShell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="cars/new" element={<CarWizard />} />
                  <Route path="cars/:id" element={<CarWizard />} />
                  <Route path="enquiries" element={<Enquiries />} />
                  <Route path="sales" element={<Sales />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="admin" element={<RequireManager adminOnly />}>
                    <Route index element={<Admin />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<div className="p-16 text-center"><h1 className="font-display text-2xl font-bold">Page not found</h1><Link to="/" className="btn-primary mt-6">Go home</Link></div>} />
            </Route>
          </Routes>
        </Suspense>
        <TermsGate />
        <InstallSheet />
        <NewCarAlerts />
        <UpdatePrompt />
      </BrowserRouter>
    </AppProvider>
  )
}
