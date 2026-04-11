// OnboardingPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { setMyRole, updateMyProfile } from '../api'

export default function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const derivedName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    ''

  const [name, setName]       = useState(derivedName)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [error, setError]     = useState(null)

  const handleSelect = async (role) => {
    if (!name.trim()) {
      setError('Please enter your name before continuing.')
      return
    }
    setSelected(role)
    setLoading(true)
    setError(null)
    try {
      await updateMyProfile({ display_name: name.trim() })
      await setMyRole(role)
      await refreshProfile()
      navigate(role === 'coach' ? '/club-setup' : '/rate-your-game')
    } catch (e) {
      console.error('Failed to complete onboarding:', e)
      setError('Could not save — please try again.')
      setSelected(null)
      setLoading(false)
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
      <div style={{ width: '100%', maxWidth: 480 }}>

        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22, fontWeight: 700,
          letterSpacing: '-0.3px',
          color: 'var(--text-primary)',
          marginBottom: 6, textAlign: 'center',
        }}>
          Mat<span style={{ color: 'var(--accent)' }}>board</span>
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-muted)',
          textAlign: 'center', marginBottom: 36,
        }}>
          Welcome. Let's get you set up.
        </div>

        {/* Name field */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 20px',
          marginBottom: 16,
        }}>
          <label style={{
            fontSize: 11, fontWeight: 600,
            color: 'var(--text-secondary)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            display: 'block', marginBottom: 8,
          }}>
            Your name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(null) }}
            placeholder="How should we call you?"
            autoFocus
            style={{
              width: '100%', padding: '9px 12px',
              background: 'var(--bg-subtle)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 14, color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)', outline: 'none',
            }}
          />
        </div>

        <div style={{
          fontSize: 11, fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          textAlign: 'center', marginBottom: 12,
        }}>
          I am a
        </div>

        {error && (
          <div style={{
            background: 'var(--accent-soft)',
            border: '0.5px solid var(--border-accent)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: 12, color: 'var(--accent)',
            marginBottom: 16, textAlign: 'center',
          }}>{error}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <RoleCard
            role="coach"
            title="Coach"
            description="I teach athletes and manage a club or programme"
            icon="📋"
            selected={selected === 'coach'}
            loading={loading}
            onSelect={handleSelect}
          />
          <RoleCard
            role="athlete"
            title="Athlete"
            description="I train and want to track my technique development"
            icon="🥋"
            selected={selected === 'athlete'}
            loading={loading}
            onSelect={handleSelect}
          />
        </div>

        {loading && (
          <div style={{
            textAlign: 'center', marginTop: 20,
            fontSize: 12, color: 'var(--text-muted)',
          }}>
            Setting up your account…
          </div>
        )}
      </div>
    </div>
  )
}

function RoleCard({ role, title, description, icon, selected, loading, onSelect }) {
  return (
    <button
      onClick={() => !loading && onSelect(role)}
      style={{
        background: selected ? 'var(--accent-soft)' : 'var(--bg-surface)',
        border: `${selected ? '2px' : '0.5px'} solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '28px 20px',
        cursor: loading ? 'not-allowed' : 'pointer',
        textAlign: 'center',
        transition: 'all var(--transition)',
        opacity: loading && !selected ? 0.5 : 1,
        fontFamily: 'var(--font-body)',
      }}
      onMouseEnter={e => { if (!loading && !selected) e.currentTarget.style.borderColor = 'var(--accent)' }}
      onMouseLeave={e => { if (!loading && !selected) e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 18, fontWeight: 700,
        color: selected ? 'var(--accent)' : 'var(--text-primary)',
        marginBottom: 8, letterSpacing: '-0.3px',
      }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {description}
      </div>
    </button>
  )
}