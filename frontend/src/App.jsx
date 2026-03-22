// frontend/src/App.jsx

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navigation from './components/Navigation'
import GraphPage from './pages/GraphPage'
import ExplorePage from './pages/ExplorePage'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import ClubSetupPage from './pages/ClubSetupPage'
import ProgressPage from './pages/ProgressPage'
import ClubPage from './pages/ClubPage'
import './styles/globals.css'

function getInitialTheme() {
  const stored = localStorage.getItem('mb-theme')
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// ── Route guard ───────────────────────────────────────────────────────────────
function Protected({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile === undefined) return <LoadingScreen />
  if (!profile || profile.role === null) return <Navigate to="/onboarding" replace />

  return children
}

// ── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20, fontWeight: 700,
          letterSpacing: '-0.3px',
          color: 'var(--text-primary)',
        }}>
          Mat<span style={{ color: 'var(--accent)' }}>board</span>
        </div>
        <div style={{
          width: 24, height: 24,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── App shell ─────────────────────────────────────────────────────────────────
function AppShell({ theme, onToggleTheme }) {
  const { signOut, user, profile } = useAuth()

  return (
    <Navigation
      theme={theme}
      onToggleTheme={onToggleTheme}
      user={user}
      profile={profile}
      onSignOut={signOut}
    >
      <Routes>
        <Route path="/"          element={<Navigate to="/explore" replace />} />
        <Route path="/explore"   element={<ExplorePage />} />
        <Route path="/graph"     element={<GraphPage />} />
        <Route path="/progress"  element={<ProgressPage />} />
        <Route path="/home"      element={<Placeholder title="Home Feed" />} />
        <Route path="/club"      element={<ClubPage />} />
        <Route path="/athletes"  element={<Placeholder title="Athletes" />} />
        <Route path="/curricula" element={<Placeholder title="Curricula" />} />
      </Routes>
    </Navigation>
  )
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mb-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login"      element={<LoginPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/club-setup" element={<ClubSetupPage />} />
          <Route path="/*" element={
            <Protected>
              <AppShell theme={theme} onToggleTheme={toggleTheme} />
            </Protected>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function Placeholder({ title }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 32px' }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
      }}>
        Coming soon
      </div>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 28, fontWeight: 700,
        letterSpacing: '-0.5px',
        color: 'var(--text-primary)',
      }}>
        {title}
      </h1>
    </div>
  )
}