// LoginPage.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

const ERROR_MAP = {
  'Invalid login credentials':        'Incorrect email or password.',
  'Email not confirmed':              'Please confirm your email before signing in.',
  'User already registered':          'An account with this email already exists. Sign in instead.',
  'Password should be at least 6':    'Password must be at least 6 characters.',
  'over_email_send_rate_limit':       'Too many attempts. Please wait a moment and try again.',
}

function friendlyError(msg) {
  if (!msg) return 'Something went wrong. Please try again.'
  for (const [key, val] of Object.entries(ERROR_MAP)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return val
  }
  return msg
}

export default function LoginPage() {
  const { user, signInWithGoogle, signInWithEmail, signUp, loading } = useAuth()
  const [mode, setMode]           = useState('login')
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState(null)
  const [success, setSuccess]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/explore" replace />

  const switchMode = (m) => {
    setMode(m)
    setError(null)
    setSuccess(false)
    setName('')
    setEmail('')
    setPassword('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (countdown > 0) return
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        const { error } = await signInWithEmail(email, password)
        if (error) setError(friendlyError(error.message))
      } else {
        if (!name.trim()) { setError('Please enter your name.'); setSubmitting(false); return }
        const { error } = await signUp(email, password, name.trim())
        if (error) {
          setError(friendlyError(error.message))
          if (error.message?.includes('rate')) setCountdown(60)
        } else {
          setSuccess(true)
          setCountdown(60)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26, fontWeight: 700,
          letterSpacing: '-0.5px',
          color: 'var(--text-primary)',
          marginBottom: 6, textAlign: 'center',
        }}>
          Mat<span style={{ color: 'var(--accent)' }}>board</span>
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-muted)',
          textAlign: 'center', marginBottom: 32,
        }}>
          The technique graph for wrestling
        </div>

        {/* Mode tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-subtle)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 4,
          marginBottom: 20,
          gap: 4,
        }}>
          {[
            { key: 'login',  label: 'Sign in'        },
            { key: 'signup', label: 'Create account' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => switchMode(tab.key)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'all var(--transition)',
                background: mode === tab.key ? 'var(--bg-surface)' : 'transparent',
                color: mode === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mode === tab.key ? 'var(--shadow-sm)' : 'none',
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 28px',
        }}>

          {/* Success state */}
          {success ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16, fontWeight: 700,
                color: 'var(--text-primary)', marginBottom: 8,
              }}>Check your email</div>
              <div style={{
                fontSize: 13, color: 'var(--text-muted)',
                lineHeight: 1.6, marginBottom: 20,
              }}>
                We sent a confirmation link to <strong>{email}</strong>.
                Click it to activate your account, then come back and sign in.
              </div>
              {countdown > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Resend available in {countdown}s
                </div>
              )}
              {countdown === 0 && (
                <button
                  onClick={() => { setSuccess(false); setError(null) }}
                  style={{
                    background: 'none', border: 'none',
                    fontSize: 12, color: 'var(--accent)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >Resend confirmation email</button>
              )}
            </div>
          ) : (
            <>
              {/* Google */}
              <button
                onClick={signInWithGoogle}
                style={{
                  width: '100%', padding: '11px 16px',
                  background: 'var(--bg-subtle)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13, fontWeight: 500,
                  color: 'var(--text-primary)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 10,
                  marginBottom: 20,
                  transition: 'border-color var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Divider */}
              <div style={{
                display: 'flex', alignItems: 'center',
                gap: 12, marginBottom: 20,
              }}>
                <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>or</span>
                <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                {mode === 'signup' && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                      style={inputStyle}
                    />
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={inputStyle}
                  />
                </div>

                {error && (
                  <div style={{
                    background: 'var(--accent-soft)',
                    border: '0.5px solid var(--border-accent)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    fontSize: 12, color: 'var(--accent)',
                    marginBottom: 16,
                  }}>{error}</div>
                )}

                <button
                  type="submit"
                  disabled={submitting || countdown > 0}
                  style={{
                    width: '100%', padding: '11px 16px',
                    background: 'var(--accent)', border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13, fontWeight: 600, color: '#fff',
                    cursor: submitting || countdown > 0 ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-body)',
                    opacity: submitting || countdown > 0 ? 0.7 : 1,
                    transition: 'opacity var(--transition)',
                  }}
                >
                  {submitting
                    ? '...'
                    : countdown > 0
                    ? `Wait ${countdown}s`
                    : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  fontSize: 11, fontWeight: 600,
  color: 'var(--text-secondary)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  display: 'block', marginBottom: 6,
}

const inputStyle = {
  width: '100%', padding: '9px 12px',
  background: 'var(--bg-subtle)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 13, color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)', outline: 'none',
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-page)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}