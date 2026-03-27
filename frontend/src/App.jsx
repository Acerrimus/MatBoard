import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navigation from './components/Navigation'
import GraphPage from './pages/GraphPage'
import ExplorePage from './pages/ExplorePage'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import ProgressPage from './pages/ProgressPage'
import ClubPage from './pages/ClubPage'
import DashboardPage from './pages/DashboardPage'
import CurriculaPage from './pages/CurriculaPage'
import AthleteOverviewPage from './pages/AthleteOverviewPage'
import './styles/globals.css'
import HomePage from './pages/HomePage'

function getInitialTheme() {
  const stored = localStorage.getItem('mb-theme')
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function Protected({ children }) {
  const { user, profile, loading, profileError, signOut } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile === undefined) return <LoadingScreen />
  if (profileError) return <ProfileErrorScreen onSignOut={signOut} />
  if (profile === null || !profile.role) return <Navigate to="/onboarding" replace />
  return children
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
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

function ProfileErrorScreen({ onSignOut }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 320, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20, fontWeight: 700,
          letterSpacing: '-0.3px',
          color: 'var(--text-primary)',
        }}>
          Mat<span style={{ color: 'var(--accent)' }}>board</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
          We couldn't load your profile. This is usually a temporary issue.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
          <button
            onClick={onSignOut}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

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
        <Route path="/"                     element={<Navigate to="/explore" replace />} />
        <Route path="/explore"              element={<ExplorePage />} />
        <Route path="/graph"                element={<GraphPage />} />
        <Route path="/progress"             element={<ProgressPage />} />
        <Route path="/home"                 element={<HomePage />} />
        <Route path="/club"                 element={<ClubPage />} />
        <Route path="/dashboard"            element={<DashboardPage />} />
        <Route path="/curricula"            element={<CurriculaPage />} />
        <Route path="/athletes/:athleteId"  element={<AthleteOverviewPage />} />
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
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.75rem 2rem' }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
      }}>Coming soon</div>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 28, fontWeight: 700,
        letterSpacing: '-0.5px',
        color: 'var(--text-primary)',
      }}>{title}</h1>
    </div>
  )
}