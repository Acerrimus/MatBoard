import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'

export default function ClubSetupPage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState(null) // 'create' | 'join'
  const [clubName, setClubName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = async () => {
    if (!clubName.trim()) return
    setLoading(true)
    setError(null)
    try {
      const slug = clubName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const { data, error: clubError } = await supabase
        .from('clubs')
        .insert({ name: clubName.trim(), slug, owner_id: user.id })
        .select()
        .single()

      if (clubError) throw clubError

      // Add owner as coach member
      await supabase.from('club_memberships').insert({
        club_id: data.id,
        user_id: user.id,
        role: 'coach'
      })

      await refreshProfile()
      navigate('/')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) return
    setLoading(true)
    setError(null)
    try {
      const { data: club, error: clubError } = await supabase
        .from('clubs')
        .select('id')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single()

      if (clubError || !club) throw new Error('Invalid invite code')

      await supabase.from('club_memberships').insert({
        club_id: club.id,
        user_id: user.id,
        role: 'coach'
      })

      await refreshProfile()
      navigate('/')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    // Mark profile with a flag so sidebar knows to show the prompt
    await supabase
      .from('profiles')
      .update({ club_setup_skipped: true })
      .eq('id', user.id)
    navigate('/')
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
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.3px',
          color: 'var(--text-primary)',
          marginBottom: 6,
          textAlign: 'center',
        }}>
          Mat<span style={{ color: 'var(--accent)' }}>board</span>
        </div>

        <div style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginBottom: 32,
        }}>
          Set up your club
        </div>

        {/* Mode selection */}
        {!mode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <OptionButton
              onClick={() => setMode('create')}
              title="Create a new club"
              description="Start fresh and invite your athletes"
            />
            <OptionButton
              onClick={() => setMode('join')}
              title="Join an existing club"
              description="Enter an invite code from another coach"
            />
            <button
              onClick={handleSkip}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 12,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '12px 0',
                fontFamily: 'var(--font-body)',
                textAlign: 'center',
              }}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Create club */}
        {mode === 'create' && (
          <div style={{
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: 28,
          }}>
            <BackButton onClick={() => { setMode(null); setError(null) }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>
              Create a new club
            </div>
            <label style={labelStyle}>Club name</label>
            <input
              value={clubName}
              onChange={e => setClubName(e.target.value)}
              placeholder="e.g. Wolverhampton Wrestling Club"
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            {error && <ErrorBox message={error} />}
            <button
              onClick={handleCreate}
              disabled={loading || !clubName.trim()}
              style={primaryButtonStyle(loading || !clubName.trim())}
            >
              {loading ? 'Creating...' : 'Create club'}
            </button>
          </div>
        )}

        {/* Join club */}
        {mode === 'join' && (
          <div style={{
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: 28,
          }}>
            <BackButton onClick={() => { setMode(null); setError(null) }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>
              Join with invite code
            </div>
            <label style={labelStyle}>Invite code</label>
            <input
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              placeholder="e.g. A1B2C3D4"
              style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            {error && <ErrorBox message={error} />}
            <button
              onClick={handleJoin}
              disabled={loading || !inviteCode.trim()}
              style={primaryButtonStyle(loading || !inviteCode.trim())}
            >
              {loading ? 'Joining...' : 'Join club'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function OptionButton({ onClick, title, description }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--font-body)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'border-color var(--transition)',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{description}</div>
      </div>
      <span style={{ color: 'var(--border-strong)', fontSize: 16, flexShrink: 0 }}>›</span>
    </button>
  )
}

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        fontSize: 12,
        color: 'var(--text-muted)',
        cursor: 'pointer',
        padding: '0 0 16px',
        fontFamily: 'var(--font-body)',
        display: 'block',
      }}
    >
      ← Back
    </button>
  )
}

function ErrorBox({ message }) {
  return (
    <div style={{
      background: 'var(--accent-soft)',
      border: '0.5px solid var(--border-accent)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
      fontSize: 12,
      color: 'var(--accent)',
      marginBottom: 16,
    }}>
      {message}
    </div>
  )
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 6,
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--bg-subtle)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 13,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  marginBottom: 16,
  boxSizing: 'border-box',
}

const primaryButtonStyle = (disabled) => ({
  width: '100%',
  padding: '11px 16px',
  background: disabled ? 'var(--bg-subtle)' : 'var(--accent)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontSize: 13,
  fontWeight: 600,
  color: disabled ? 'var(--text-muted)' : '#fff',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'var(--font-body)',
  transition: 'all var(--transition)',
})
