// frontend/src/pages/ClubPage.jsx

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMyClub, getClubMembers, getClubRoster, updateMemberRole, createClub, joinClub } from '../api'
import { Users, Copy, Check, ShieldCheck, User } from 'lucide-react'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function getInitials(name) {
  if (name) return name.trim()[0].toUpperCase()
  return '?'
}

// ── No club state ─────────────────────────────────────────────────────────────
function NoClub({ onCreated, onJoined }) {
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
      const club = await createClub(clubName.trim())
      onCreated(club)
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
      const club = await joinClub(inviteCode.trim())
      onJoined(club)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
        }}>
          My Club
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
          letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0,
        }}>
          Get started
        </h1>
      </div>

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
            description="Enter an invite code from your coach"
          />
        </div>
      )}

      {mode && (
        <div style={{
          background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-xl)', padding: 28,
        }}>
          <button
            onClick={() => { setMode(null); setError(null) }}
            style={{
              background: 'none', border: 'none', fontSize: 12,
              color: 'var(--text-muted)', cursor: 'pointer',
              padding: '0 0 16px', fontFamily: 'var(--font-body)', display: 'block',
            }}
          >
            ← Back
          </button>

          <div style={{
            fontSize: 15, fontWeight: 600,
            color: 'var(--text-primary)', marginBottom: 20,
          }}>
            {mode === 'create' ? 'Create a new club' : 'Join with invite code'}
          </div>

          <label style={labelStyle}>
            {mode === 'create' ? 'Club name' : 'Invite code'}
          </label>
          <input
            autoFocus
            value={mode === 'create' ? clubName : inviteCode}
            onChange={e => mode === 'create'
              ? setClubName(e.target.value)
              : setInviteCode(e.target.value)
            }
            placeholder={mode === 'create' ? 'e.g. Wolverhampton Wrestling Club' : 'e.g. A1B2C3D4'}
            style={{
              ...inputStyle,
              ...(mode === 'join' ? { textTransform: 'uppercase', letterSpacing: '0.1em' } : {}),
            }}
            onKeyDown={e => e.key === 'Enter' && (mode === 'create' ? handleCreate() : handleJoin())}
          />

          {error && (
            <div style={{
              background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
              borderRadius: 'var(--radius-sm)', padding: '10px 14px',
              fontSize: 12, color: 'var(--accent)', marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={mode === 'create' ? handleCreate : handleJoin}
            disabled={loading || !(mode === 'create' ? clubName.trim() : inviteCode.trim())}
            style={primaryButtonStyle(loading || !(mode === 'create' ? clubName.trim() : inviteCode.trim()))}
          >
            {loading ? '...' : mode === 'create' ? 'Create club' : 'Join club'}
          </button>
        </div>
      )}
    </div>
  )
}

function OptionButton({ onClick, title, description }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '18px 20px',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'border-color var(--transition)',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{description}</div>
      </div>
      <span style={{ color: 'var(--border-strong)', fontSize: 16, flexShrink: 0 }}>›</span>
    </button>
  )
}

// ── Invite code card ──────────────────────────────────────────────────────────
function InviteCodeCard({ inviteCode }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 24,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10,
      }}>
        Invite Code
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
          letterSpacing: '0.12em', color: 'var(--accent)', flex: 1,
        }}>
          {inviteCode}
        </div>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px',
            background: copied ? 'var(--accent-soft)' : 'var(--bg-subtle)',
            border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
            fontSize: 12, fontWeight: 500,
            color: copied ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
          }}
        >
          {copied ? <><Check size={13} strokeWidth={2} /> Copied</> : <><Copy size={13} strokeWidth={1.8} /> Copy</>}
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
        Share this code with athletes to join your club.
      </div>
    </div>
  )
}

// ── Member components ─────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const isCoach = role === 'coach'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 'var(--radius-sm)',
      fontSize: 11, fontWeight: 600,
      background: isCoach ? 'var(--accent-soft)' : 'var(--bg-subtle)',
      color: isCoach ? 'var(--accent)' : 'var(--text-muted)',
      border: `0.5px solid ${isCoach ? 'var(--accent)' : 'var(--border)'}`,
      flexShrink: 0,
    }}>
      {isCoach ? <ShieldCheck size={11} strokeWidth={2} /> : <User size={11} strokeWidth={1.8} />}
      {isCoach ? 'Coach' : 'Athlete'}
    </span>
  )
}

function MemberRow({ member, isOwner, clubId, onRoleChange, roleUpdating, currentUserId }) {
  const updating = roleUpdating === member.user_id
  const isSelf = member.user_id === currentUserId

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderBottom: '0.5px solid var(--border)',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'var(--accent-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 600, color: 'var(--accent)', flexShrink: 0,
      }}>
        {getInitials(member.display_name)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {member.display_name ?? 'Unknown'}{isSelf ? ' (you)' : ''}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          Joined {formatDate(member.joined_at)}
        </div>
      </div>

      <RoleBadge role={member.role} />

      {isOwner && !isSelf && (
        <button
          disabled={updating}
          onClick={() => onRoleChange(member.user_id, member.role === 'athlete' ? 'coach' : 'athlete')}
          style={{
            padding: '5px 10px', background: 'var(--bg-subtle)',
            border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
            fontSize: 11, fontWeight: 500,
            color: updating ? 'var(--text-muted)' : 'var(--text-secondary)',
            cursor: updating ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)', flexShrink: 0, transition: 'all 0.15s',
          }}
        >
          {updating ? '...' : member.role === 'athlete' ? 'Make coach' : 'Make athlete'}
        </button>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClubPage() {
  const { user, profile } = useAuth()
  const isCoach = profile?.role === 'coach' || profile?.role === 'admin'

  const [club, setClub] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [roleUpdating, setRoleUpdating] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const clubData = await getMyClub()
      setClub(clubData)
      const memberData = isCoach
        ? await getClubMembers(clubData.id)
        : await getClubRoster(clubData.id)
      setMembers(memberData)
    } catch (err) {
      if (err.message.includes('404')) {
        setClub(null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(userId, newRole) {
    setRoleUpdating(userId)
    try {
      await updateMemberRole(club.id, userId, newRole)
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m))
    } catch (err) {
      console.error('Failed to update role:', err)
    } finally {
      setRoleUpdating(null)
    }
  }

  if (loading) return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 24px' }}>
      {[120, 200, 80, 80, 80].map((w, i) => (
        <div key={i} style={{
          height: 20, width: w, background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-sm)', marginBottom: 12,
          animation: 'pulse 1.4s ease-in-out infinite',
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }`}</style>
    </div>
  )

  // No club yet — show create/join UI
  if (!club) {
    return (
      <NoClub
        onCreated={() => load()}
        onJoined={() => load()}
      />
    )
  }

  const isOwner = club.owner_id === user?.id
  const coaches = members.filter(m => m.role === 'coach')
  const athletes = members.filter(m => m.role === 'athlete')

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
        }}>
          My Club
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
          letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0,
        }}>
          {club.name}
        </h1>
      </div>

      {isOwner && club.invite_code && <InviteCodeCard inviteCode={club.invite_code} />}

      <div style={{
        background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '14px 16px', borderBottom: '0.5px solid var(--border)',
          background: 'var(--bg-subtle)',
        }}>
          <Users size={14} strokeWidth={1.8} color="var(--text-muted)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        {members.length === 0 && (
          <div style={{
            padding: '32px 16px', textAlign: 'center',
            fontSize: 13, color: 'var(--text-muted)',
          }}>
            No members yet. Share your invite code to get started.
          </div>
        )}

        {[...coaches, ...athletes].map(m => (
          <MemberRow
            key={m.user_id}
            member={m}
            isOwner={isOwner}
            clubId={club.id}
            onRoleChange={handleRoleChange}
            roleUpdating={roleUpdating}
            currentUserId={user?.id}
          />
        ))}
      </div>
    </div>
  )
}

const labelStyle = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
  letterSpacing: '0.08em', textTransform: 'uppercase',
  display: 'block', marginBottom: 6,
}

const inputStyle = {
  width: '100%', padding: '9px 12px',
  background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)', fontSize: 13,
  color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
  outline: 'none', marginBottom: 16, boxSizing: 'border-box',
}

const primaryButtonStyle = (disabled) => ({
  width: '100%', padding: '11px 16px',
  background: disabled ? 'var(--bg-subtle)' : 'var(--accent)',
  border: 'none', borderRadius: 'var(--radius-md)',
  fontSize: 13, fontWeight: 600,
  color: disabled ? 'var(--text-muted)' : '#fff',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'var(--font-body)', transition: 'all var(--transition)',
})