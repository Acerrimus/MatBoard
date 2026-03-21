import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  const handleSelect = async (role) => {
    setSelected(role)
    setLoading(true)
    try {
      await supabase
        .from('profiles')
        .update({ role })
        .eq('id', user.id)

      await refreshProfile()

      if (role === 'coach') {
        navigate('/club-setup')
      } else {
        navigate('/')
      }
    } finally {
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

        {/* Logo */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.3px',
          color: 'var(--text-primary)',
          marginBottom: 8,
          textAlign: 'center',
        }}>
          Mat<span style={{ color: 'var(--accent)' }}>board</span>
        </div>

        <div style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginBottom: 40,
        }}>
          Welcome. Let's get you set up.
        </div>

        <div style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginBottom: 16,
        }}>
          I am a
        </div>

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
        fontSize: 18,
        fontWeight: 700,
        color: selected ? 'var(--accent)' : 'var(--text-primary)',
        marginBottom: 8,
        letterSpacing: '-0.3px',
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 12,
        color: 'var(--text-muted)',
        lineHeight: 1.5,
      }}>
        {description}
      </div>
    </button>
  )
}
