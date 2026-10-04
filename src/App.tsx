import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from './contexts/AuthContext.tsx'
import { useLang } from './contexts/LanguageContext.tsx'
import Header from './components/layout/Header.tsx'
import Footer from './components/layout/Footer.tsx'
import WhatsAppFloat from './components/common/WhatsAppFloat.tsx'
import MobileBottomBar from './components/layout/MobileBottomBar.tsx'
import CookieConsent from './components/common/CookieConsent.tsx'
import ScrollToHash from './components/common/ScrollToHash.tsx'
import PageViewTracker from './components/common/PageViewTracker.tsx'
import PageMetadata from './components/common/PageMetadata.tsx'
import LoadErrorBoundary, { LoadErrorNotice } from './components/common/LoadErrorBoundary.tsx'
import Home from './pages/Home.tsx'
const Contact = lazy(() => import('./pages/Contact.tsx'))
const NotFound = lazy(() => import('./pages/NotFound.tsx'))
const Login = lazy(() => import('./pages/Login.tsx'))
const Register = lazy(() => import('./pages/Register.tsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.tsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.tsx'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.tsx'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.tsx'))
const AdminUsers = lazy(() => import('./pages/admin/Users.tsx'))
const AdminLeads = lazy(() => import('./pages/admin/Leads.tsx'))
const AdminContent = lazy(() => import('./pages/admin/Content.tsx'))
const AdminContacts = lazy(() => import('./pages/admin/Contacts.tsx'))
const AdminAnalytics = lazy(() => import('./pages/admin/AnalyticsPage.tsx'))
const AdminSettings = lazy(() => import('./pages/admin/Settings.tsx'))
const AdminPasswordResets = lazy(() => import('./pages/admin/PasswordResets.tsx'))

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' } },
}

function PageWrapper({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  )
}

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const { t } = useLang()
  if (loading) return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center gap-4 min-h-screen text-secondary-soft"
    >
      <CircularProgress size={40} sx={{ color: '#d4a857' }} />
      <span className="text-base">{t('auth.loading')}</span>
    </motion.div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role !== 'admin' || profile?.is_active !== true) return (
    <motion.div
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-screen text-center px-10"
    >
      <h2 className="text-2xl mb-3 text-orange-400">{t('auth.access.denied.title')}</h2>
      <p className="mb-5">{t('auth.access.denied.desc')}</p>
      <a href="/" className="btn btn-secondary">{t('auth.access.denied.btn')}</a>
    </motion.div>
  )
  return children
}

function PageLoading() {
  const { t } = useLang()
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center min-h-screen">
      <CircularProgress aria-label={t('auth.loading')} size={36} sx={{ color: '#d4a857' }} />
    </div>
  )
}

function PublicLayout({ children }) {
  const { t } = useLang()
  return (
    <>
      <a href="#main-content" className="skip-link">{t('a11y.skip')}</a>
      <Header />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <Footer />
      <WhatsAppFloat />
      <MobileBottomBar />
      <CookieConsent />
    </>
  )
}

export default function App() {
  const location = useLocation()

  return (
    <>
    <PageMetadata />
    <ScrollToHash />
    <PageViewTracker />
    <LoadErrorBoundary resetKey={location.pathname} fallback={<LoadErrorNotice />}>
    <Suspense fallback={<PageLoading />}>
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PublicLayout><PageWrapper><Home /></PageWrapper></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><PageWrapper><Contact /></PageWrapper></PublicLayout>} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />
        <Route path="/forgot-password" element={<PageWrapper><ForgotPassword /></PageWrapper>} />
        <Route path="/reset-password" element={<PageWrapper><ResetPassword /></PageWrapper>} />
        {/* Админка грузится отдельным файлом — обычный посетитель её не скачивает */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <PageWrapper>
              <Suspense fallback={<PageLoading />}><AdminLayout /></Suspense>
            </PageWrapper>
          </ProtectedRoute>
        }>
          <Route index element={<Suspense fallback={<PageLoading />}><AdminDashboard /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<PageLoading />}><AdminUsers /></Suspense>} />
          <Route path="leads" element={<Suspense fallback={<PageLoading />}><AdminLeads /></Suspense>} />
          <Route path="content" element={<Suspense fallback={<PageLoading />}><AdminContent /></Suspense>} />
          <Route path="contacts" element={<Suspense fallback={<PageLoading />}><AdminContacts /></Suspense>} />
          <Route path="password-resets" element={<Suspense fallback={<PageLoading />}><AdminPasswordResets /></Suspense>} />
          <Route path="analytics" element={<Suspense fallback={<PageLoading />}><AdminAnalytics /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoading />}><AdminSettings /></Suspense>} />
        </Route>
        <Route path="*" element={<PublicLayout><PageWrapper><NotFound /></PageWrapper></PublicLayout>} />
      </Routes>
    </AnimatePresence>
    </Suspense>
    </LoadErrorBoundary>
    </>
  )
}
