import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import GraphPage from './pages/GraphPage'
import './styles/globals.css'

function getInitialTheme() {
  const stored = localStorage.getItem('mb-theme')
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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
      <div className="app-shell">
        <Sidebar theme={theme} onToggleTheme={toggleTheme} />
        <main className="main-content">
          <Routes>
            <Route path="/"         element={<Navigate to="/graph" replace />} />
            <Route path="/graph"    element={<GraphPage />} />
            <Route path="/progress" element={<Placeholder title="My Progress" />} />
            <Route path="/club"     element={<Placeholder title="My Club" />} />
            <Route path="/athletes" element={<Placeholder title="Athletes" />} />
            <Route path="/curricula" element={<Placeholder title="Curricula" />} />
          </Routes>
        </main>
      </div>
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
