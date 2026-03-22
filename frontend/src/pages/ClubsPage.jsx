// frontend/src/pages/ClubPage.jsx

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMyClub, getClubMembers, getClubRoster, updateMemberRole } from '../api'
import { Users, Copy, Check, ShieldCheck, User } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function getInitials(name, email) {
  if (name) return name.trim()[0].toUpperCase()
  if (email) return email[0].toUpperCase()
  return '?'
}

// ── Sub-components ────────────────────────────────────────────────────────────
function PageHeader({ club }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
      }}>
        My Club
      </div>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 28, fontWeight: 700,
        letterSpacing: '-0.5px',
        color: 'var(--text-primary)',
        margin: 0,
      }}>
        {club.name}
      </h1>
    </div>
  )
}

function InviteCodeCard({ inviteCode }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available (e.g. non-HTTPS dev)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      marginBottom: 24,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10,
      }}>
        Invite Code
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26, fontWeight: 700,
          letterSpacing: '0.12em',
          color: 'var(--accent)',
          flex: 1,
        }}>
          {inviteCode}
        </div>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px',
            background: copied ? 'var(--accent-soft)' : 'var(--bg-subtle)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12, fontWeight: 500,
            color: copied ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          {copied
            ? <><Check size={13} strokeWidth={2} /> Copied</>
            : <><Copy size={13} strokeWidth={1.8} /> Copy</>
          }
        </button>
      </div>
      <div style={{
        marginTop: 8,
        fontSize: 12, color: 'var(--text-muted)',
      }}>
        Share this code with athletes to join your club.
      </div>
    </div>
  )
}

function RoleBadge({ role }) {
  const isCoach = role === 'coach'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px',
      borderRadius: 'var(--radius-sm)',
      fontSize: 11, fontWeight: 600,
      background: isCoach ? 'var(--accent-soft)' : 'var(--bg-subtle)',
      color: isCoach ? 'var(--accent)' : 'var(--text-muted)',
      border: `0.5px solid ${isCoach ? 'var(--accent)' : 'var(--border)'}`,
      flexShrink: 0,
    }}>
      {isCoach
        ? <ShieldCheck size={11} strokeWidth={2} />
        : <User size={11} strokeWidth={1.8} />
      }
      {isCoach ? 'Coach' : 'Athlete'}
    </span>
  )
}

function MemberAvatar({ name, avatarUrl }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: 34, height: 34, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
        }}
      />
    )
  }
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: 'var(--accent-soft)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 600,
      color: 'var(--accent)',
      flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  )
}

function MemberRow({ member, isOwner, clubId, onRoleChange, roleUpdating }) {
  const updating = roleUpdating === member.user_id

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: '0.5px solid var(--border)',
    }}>
      <MemberAvatar name={member.display_name} avatarUrl={member.avatar_url} />

      {/* Name + join date */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {member.display_name ?? 'Unknown'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          Joined {formatDate(member.joined_at)}
        </div>
      </div>

      <RoleBadge role={member.role} />

      {/* Role toggle — coach view only, can't change yourself */}
      {isOwner && !member.is_self && (
        <button
          disabled={updating}
          onClick={() => onRoleChange(
            member.user_id,
            member.role === 'athlete' ? 'coach' : 'athlete'
          )}
          style={{
            padding: '5px 10px',
            background: 'var(--bg-subtle)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 11, fontWeight: 500,
            color: updating ? 'var(--text-muted)' : 'var(--text-secondary)',
            cursor: updating ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          {updating
            ? '...'
            : member.role === 'athlete' ? 'Make coach' : 'Make athlete'
          }
        </button>
      )}
    </div>
  )
}

function MembersSection({ members, isOwner, currentUserId, clubId, onRoleChange, roleUpdating }) {
  const coaches  = members.filter(m => m.role === 'coach')
  const athletes = members.filter(m => m.role === 'athlete')

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '14px 16px',
        borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg-subtle)',
      }}>
        <Users size={14} strokeWidth={1.8} color="var(--text-muted)" />
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: 'var(--text-secondary)',
        }}>
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

      {/* Coaches first */}
      {coaches.map(m => (
        <MemberRow
          key={m.user_id}
          member={{ ...m, is_self: m.user_id === currentUserId }}
          isOwner={isOwner}
          clubId={clubId}
          onRoleChange={onRoleChange}
          roleUpdating={roleUpdating}
        />
      ))}

      {/* Athletes */}
      {athletes.map(m => (
        <MemberRow
          key={m.user_id}
          member={{ ...m, is_self: m.user_id === currentUserId }}
          isOwner={isOwner}
          clubId={clubId}
          onRoleChange={onRoleChange}
          roleUpdating={roleUpdating}
        />
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClubPage() {
  const { user, profile } = useAuth()
  const isCoach = profile?.role === 'coach' || profile?.role === 'admin'

  const [club,         setClub]         = useState(null)
  const [members,      setMembers]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [roleUpdating, setRoleUpdating] = useState(null) // user_id currently being updated

  useEffect(() => {
    async function load() {
      try {
        const clubData = await getMyClub()
        setClub(clubData)

        const memberData = isCoach
          ? await getClubMembers(clubData.id)
          : await getClubRoster(clubData.id)
        setMembers(memberData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isCoach])

  async function handleRoleChange(userId, newRole) {
    setRoleUpdating(userId)
    try {
      await updateMemberRole(club.id, userId, newRole)
      setMembers(prev =>
        prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m)
      )
    } catch (err) {
      // TODO: surface error toast when toast system exists
      console.error('Failed to update role:', err)
    } finally {
      setRoleUpdating(null)
    }
  }

  // ── States ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        maxWidth: 680, margin: '0 auto', padding: '28px 24px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {[120, 200, 80, 80, 80].map((w, i) => (
          <div key={i} style={{
            height: 20, width: w,
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-sm)',
            animation: 'pulse 1.4s ease-in-out infinite',
            opacity: 0.6,
          }} />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{
          padding: '16px 20px',
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          fontSize: 13, color: 'var(--text-muted)',
        }}>
          {error === 'API error: 404'
            ? "You're not a member of any club yet."
            : `Something went wrong: ${error}`
          }
        </div>
      </div>
    )
  }

  if (!club) return null

  const isOwner = club.owner_id === user?.id

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 24px' }}>
      <PageHeader club={club} />

      {/* Invite code — coach/owner only */}
      {isOwner && club.invite_code && (
        <InviteCodeCard inviteCode={club.invite_code} />
      )}

      {/* Member list */}
      <MembersSection
        members={members}
        isOwner={isOwner}
        currentUserId={user?.id}
        clubId={club.id}
        onRoleChange={handleRoleChange}
        roleUpdating={roleUpdating}
      />
    </div>
  )
}