import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import GraphPage from './pages/GraphPage'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import ClubSetupPage from './pages/ClubSetupPage'
import ProgressPage from './pages/ProgressPage'
import ExplorePage from './pages/ExplorePage'
import './styles/globals.css'

function getInitialTheme() {
  const stored = localStorage.getItem('mb-theme')
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// ── Route guard — handles auth + onboarding state ─────────────────────────────
function Protected({ children }) {
  const { user, profile, loading } = useAuth()

  // if (import.meta.env.DEV) return children
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  if (!profile || profile.role === null) return <Navigate to="/onboarding" replace />

  return children
}

function AppShell({ theme, onToggleTheme }) {
  const { signOut, user, profile } = useAuth()

  return (
    <div className="app-shell">
      <Sidebar
        theme={theme}
        onToggleTheme={onToggleTheme}
        user={user}
        profile={profile}
        onSignOut={signOut}
      />
      <main className="main-content">
        <Routes>
          <Route path="/"           element={<Navigate to="/graph" replace />} />
          <Route path="/graph"      element={<GraphPage />} />
          <Route path="/progress"   element={<ProgressPage />} />
          <Route path="/explore"    element={<ExplorePage />} />
          <Route path="/club"       element={<Placeholder title="My Club" />} />
          <Route path="/athletes"   element={<Placeholder title="Athletes" />} />
          <Route path="/curricula"  element={<Placeholder title="Curricula" />} />
        </Routes>
      </main>
    </div>
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
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
        Coming soon
      </div>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: '-0.5px',
        color: 'var(--text-primary)',
      }}>
        {title}
      </h1>
    </div>
  )
}
