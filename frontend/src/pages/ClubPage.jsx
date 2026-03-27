import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getMyClub, getClubMembers, getClubRoster,
  updateMemberRole, createClub, joinClub, getClubCurricula,
} from '../api'
import { confidenceColor, confidenceBg } from '../components/MoveCard'

// ── Mobile hook ───────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Shared primitives ─────────────────────────────────────────────────────────
function SectionLabel({ children, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
      <div style={{
        fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>{children}</div>
      {count !== undefined && (
        <div style={{
          fontSize: '0.625rem', fontWeight: 600, color: 'var(--text-muted)',
          background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
          borderRadius: 20, padding: '1px 7px',
        }}>{count}</div>
      )}
    </div>
  )
}

// ── No club state ─────────────────────────────────────────────────────────────
function NoClub({ onCreated, onJoined }) {
  const [mode, setMode] = useState(null)
  const [clubName, setClubName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = async () => {
    if (!clubName.trim()) return
    setLoading(true); setError(null)
    try {
      const club = await createClub(clubName.trim())
      onCreated(club)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) return
    setLoading(true); setError(null)
    try {
      const club = await joinClub(inviteCode.trim())
      onJoined(club)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: '30rem', margin: '0 auto', padding: '1.75rem 1.5rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{
          fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
        }}>My Club</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700,
          letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0,
        }}>Get started</h1>
      </div>

      {!mode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
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
          borderRadius: 'var(--radius-xl)', padding: '1.75rem',
        }}>
          <button
            onClick={() => { setMode(null); setError(null) }}
            style={{
              background: 'none', border: 'none', fontSize: '0.75rem',
              color: 'var(--text-muted)', cursor: 'pointer',
              padding: '0 0 1rem', fontFamily: 'var(--font-body)',
              display: 'block', minHeight: '2.75rem',
            }}
          >← Back</button>

          <div style={{
            fontSize: '0.9375rem', fontWeight: 600,
            color: 'var(--text-primary)', marginBottom: '1.25rem',
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
            placeholder={mode === 'create'
              ? 'e.g. Wolverhampton Wrestling Club'
              : 'e.g. A1B2C3D4'
            }
            style={{
              ...inputStyle,
              ...(mode === 'join' ? { textTransform: 'uppercase', letterSpacing: '0.1em' } : {}),
            }}
            onKeyDown={e => e.key === 'Enter' && (mode === 'create' ? handleCreate() : handleJoin())}
          />

          {error && (
            <div style={{
              background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
              borderRadius: 'var(--radius-sm)', padding: '0.625rem 0.875rem',
              fontSize: '0.75rem', color: 'var(--accent)', marginBottom: '1rem',
            }}>{error}</div>
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
        borderRadius: 'var(--radius-lg)', padding: '1.125rem 1.25rem',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'border-color var(--transition)', minHeight: '2.75rem',
        width: '100%',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
          {title}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{description}</div>
      </div>
      <span style={{ color: 'var(--border-strong)', fontSize: '1rem', flexShrink: 0, marginLeft: '1rem' }}>›</span>
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
      borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem',
    }}>
      <div style={{
        fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.625rem',
      }}>Invite Code</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '1.625rem', fontWeight: 700,
          letterSpacing: '0.12em', color: 'var(--accent)', flex: 1,
        }}>{inviteCode}</div>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.5rem 0.875rem',
            background: copied ? 'var(--accent-soft)' : 'var(--bg-subtle)',
            border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem', fontWeight: 500,
            color: copied ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            transition: 'all 0.15s', minHeight: '2.75rem',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Share this code with athletes to join your club.
      </div>
    </div>
  )
}

// ── Member row ────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const isCoach = role === 'coach'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '0.1875rem 0.5rem', borderRadius: 'var(--radius-sm)',
      fontSize: '0.6875rem', fontWeight: 600,
      background: isCoach ? 'var(--accent-soft)' : 'var(--bg-subtle)',
      color: isCoach ? 'var(--accent)' : 'var(--text-muted)',
      border: `0.5px solid ${isCoach ? 'var(--accent)' : 'var(--border)'}`,
      flexShrink: 0,
    }}>
      {isCoach ? '⬡ Coach' : 'Athlete'}
    </span>
  )
}

function MemberRow({ member, isOwner, clubId, onRoleChange, roleUpdating, currentUserId }) {
  const updating = roleUpdating === member.user_id
  const isSelf = member.user_id === currentUserId

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--border)',
    }}>
      <div style={{
        width: '2.125rem', height: '2.125rem', borderRadius: '50%',
        background: 'var(--accent-soft)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent)',
      }}>
        {getInitials(member.display_name)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {member.display_name ?? 'Unknown'}{isSelf ? ' (you)' : ''}
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>
          Joined {formatDate(member.joined_at)}
        </div>
      </div>

      <RoleBadge role={member.role} />

      {isOwner && !isSelf && (
        <button
          disabled={updating}
          onClick={() => onRoleChange(member.user_id, member.role === 'athlete' ? 'coach' : 'athlete')}
          style={{
            padding: '0.3125rem 0.625rem',
            background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)', fontSize: '0.6875rem', fontWeight: 500,
            color: updating ? 'var(--text-muted)' : 'var(--text-secondary)',
            cursor: updating ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)', flexShrink: 0,
            transition: 'all 0.15s', minHeight: '2.75rem',
          }}
        >
          {updating ? '...' : member.role === 'athlete' ? 'Make coach' : 'Make athlete'}
        </button>
      )}
    </div>
  )
}

// ── Curriculum view for athletes ──────────────────────────────────────────────
function CurriculumCard({ curriculum }) {
  const [expanded, setExpanded] = useState(false)
  const totalMoves = curriculum.chains.reduce((s, c) => s + c.moves.length, 0)
  const ratedMoves = curriculum.chains.reduce((s, c) =>
    s + c.moves.filter(m => m.confidence != null).length, 0
  )
  const allConfs = curriculum.chains.flatMap(c =>
    c.moves.map(m => m.confidence).filter(Boolean)
  )
  const avg = allConfs.length > 0
    ? (allConfs.reduce((a, b) => a + b, 0) / allConfs.length).toFixed(1)
    : null
  const avgColor = avg
    ? (parseFloat(avg) <= 2 ? confidenceColor(1)
      : parseFloat(avg) <= 3.5 ? confidenceColor(3)
      : confidenceColor(5))
    : 'var(--text-muted)'

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderLeft: '3px solid var(--move-color)',
      borderRadius: 'var(--radius-md)',
      marginBottom: '0.75rem',
      overflow: 'hidden',
    }}>
      {/* Header — always visible, tappable */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '0.875rem 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', fontFamily: 'var(--font-body)',
          minHeight: '2.75rem', gap: '0.75rem',
        }}
      >
        <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.9375rem', fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            marginBottom: '0.25rem',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{curriculum.name}</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              {curriculum.chains.length} chain{curriculum.chains.length !== 1 ? 's' : ''}
              {' · '}{totalMoves} move{totalMoves !== 1 ? 's' : ''}
            </span>
            {ratedMoves > 0 && (
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                · {ratedMoves}/{totalMoves} rated
              </span>
            )}
            {avg && (
              <span style={{
                fontSize: '0.6875rem', fontWeight: 700,
                fontFamily: 'var(--font-display)', color: avgColor,
              }}>avg {avg}</span>
            )}
          </div>
        </div>
        <span style={{
          color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0,
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform var(--transition)',
        }}>›</span>
      </button>

      {/* Expanded chain detail */}
      {expanded && (
        <div style={{ borderTop: '0.5px solid var(--border)' }}>
          {curriculum.chains.length === 0 ? (
            <div style={{
              padding: '1rem', fontSize: '0.8125rem',
              color: 'var(--text-muted)', textAlign: 'center',
            }}>No chains in this curriculum yet</div>
          ) : (
            curriculum.chains.map((chain, ci) => (
              <div key={chain.id} style={{
                borderBottom: ci < curriculum.chains.length - 1
                  ? '0.5px solid var(--border)' : 'none',
                padding: '0.875rem 1rem',
              }}>
                {/* Chain name */}
                <div style={{
                  fontSize: '0.75rem', fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.625rem',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>{chain.name}</div>

                {/* Move pills */}
                {chain.moves.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    No moves
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    flexWrap: 'wrap', gap: 0,
                  }}>
                    {chain.moves.map((move, i) => {
                      const conf = move.confidence
                      const color = conf ? confidenceColor(conf) : 'var(--border)'
                      const bg = conf ? confidenceBg(conf) : 'var(--bg-subtle)'
                      return (
                        <div key={`${move.id}-${i}`} style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{
                            background: bg, border: `1.5px solid ${color}`,
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.6875rem', fontWeight: 500,
                            color: conf ? color : 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                          }}>
                            <span style={{ color: 'var(--text-move)', fontWeight: 600 }}>
                              {move.name}
                            </span>
                            {conf ? (
                              <span style={{
                                fontWeight: 700, fontSize: '0.625rem',
                                fontFamily: 'var(--font-display)', opacity: 0.9,
                              }}>{conf}</span>
                            ) : (
                              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>—</span>
                            )}
                            {move.is_favourite && (
                              <span style={{ fontSize: '0.5rem', color: '#FDE047' }}>★</span>
                            )}
                          </div>
                          {i < chain.moves.length - 1 && (
                            <div style={{
                              fontSize: '0.6875rem', color: 'var(--text-muted)',
                              padding: '0 0.2rem', flexShrink: 0,
                            }}>→</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Chain completion bar */}
                {chain.moves.length > 0 && (() => {
                  const rated = chain.moves.filter(m => m.confidence != null).length
                  const pct = (rated / chain.moves.length) * 100
                  const barColor = rated === 0 ? 'var(--border)'
                    : rated === chain.moves.length ? confidenceColor(5)
                    : confidenceColor(3)
                  return (
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      gap: '0.5rem', marginTop: '0.625rem',
                    }}>
                      <div style={{
                        flex: 1, height: '0.1875rem', borderRadius: '0.125rem',
                        background: 'var(--bg-subtle)',
                      }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          borderRadius: '0.125rem', background: barColor,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <span style={{
                        fontSize: '0.6rem', color: 'var(--text-muted)',
                        fontWeight: 500, whiteSpace: 'nowrap',
                      }}>{rated}/{chain.moves.length} rated</span>
                    </div>
                  )
                })()}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClubPage() {
  const { user, profile } = useAuth()
  const isMobile = useIsMobile()
  const isCoach = profile?.role === 'coach' || profile?.role === 'admin'

  const [club, setClub] = useState(null)
  const [members, setMembers] = useState([])
  const [curricula, setCurricula] = useState([])
  const [loading, setLoading] = useState(true)
  const [roleUpdating, setRoleUpdating] = useState(null)

  const load = useCallback(async () => {
    // Guard: do not fire until auth has fully hydrated.
    // profile === undefined means AuthContext is still initialising.
    // profile === null means confirmed logged out. Only undefined is unsafe.
    if (profile === undefined) return
    setLoading(true)
    try {
      const clubData = await getMyClub()
      setClub(clubData)

      const [memberData, currData] = await Promise.all([
        isCoach
          ? getClubMembers(clubData.id)
          : getClubRoster(clubData.id),
        getClubCurricula(clubData.id),
      ])
      setMembers(memberData)
      setCurricula(currData)
    } catch (err) {
      if (err.message.includes('404')) setClub(null)
    } finally {
      setLoading(false)
    }
  }, [isCoach, profile])

  useEffect(() => { load() }, [load])

  const handleRoleChange = useCallback(async (userId, newRole) => {
    setRoleUpdating(userId)
    try {
      await updateMemberRole(club.id, userId, newRole)
      setMembers(prev => prev.map(m =>
        m.user_id === userId ? { ...m, role: newRole } : m
      ))
    } catch (err) {
      console.error('Failed to update role:', err)
    } finally {
      setRoleUpdating(null)
    }
  }, [club])

  if (loading) return (
    <div style={{ maxWidth: '42.5rem', margin: '0 auto', padding: '1.75rem 1.5rem' }}>
      {[120, 200, 80, 80, 80].map((w, i) => (
        <div key={i} style={{
          height: '1.25rem', width: w, background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem',
          animation: 'pulse 1.4s ease-in-out infinite',
          animationDelay: `${i * 0.08}s`,
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }`}</style>
    </div>
  )

  if (!club) {
    return <NoClub onCreated={load} onJoined={load} />
  }

  const isOwner = club.owner_id === user?.id
  const coaches = members.filter(m => m.role === 'coach')
  const athletes = members.filter(m => m.role === 'athlete')

  return (
    <div style={{
      maxWidth: '42.5rem', margin: '0 auto',
      padding: isMobile ? '1.25rem 1rem' : '1.75rem 1.5rem',
    }}>

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{
          fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
        }}>My Club</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700,
          letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0,
        }}>{club.name}</h1>
      </div>

      {/* Invite code — owner only */}
      {isOwner && club.invite_code && (
        <InviteCodeCard inviteCode={club.invite_code} />
      )}

      {/* Members section */}
      <div style={{ marginBottom: '2rem' }}>
        <SectionLabel count={members.length}>Members</SectionLabel>
        <div style={{
          background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)', overflow: 'hidden',
        }}>
          {members.length === 0 ? (
            <div style={{
              padding: '2rem 1rem', textAlign: 'center',
              fontSize: '0.8125rem', color: 'var(--text-muted)',
            }}>
              No members yet. Share your invite code to get started.
            </div>
          ) : (
            [...coaches, ...athletes].map(m => (
              <MemberRow
                key={m.user_id}
                member={m}
                isOwner={isOwner}
                clubId={club.id}
                onRoleChange={handleRoleChange}
                roleUpdating={roleUpdating}
                currentUserId={user?.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Curricula section */}
      <div>
        <SectionLabel count={curricula.length}>
          {isCoach ? 'Curricula' : 'My Curricula'}
        </SectionLabel>

        {curricula.length === 0 ? (
          <div style={{
            background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '2rem 1rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📋</div>
            <div style={{
              fontSize: '0.875rem', fontWeight: 600,
              color: 'var(--text-primary)', marginBottom: '0.25rem',
            }}>No curricula yet</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {isCoach
                ? 'Create curricula on the Curricula page to assign structured training to your squad.'
                : 'Your coach hasn\'t created any curricula yet.'}
            </div>
          </div>
        ) : (
          curricula.map(c => (
            <CurriculumCard key={c.id} curriculum={c} />
          ))
        )}
      </div>
    </div>
  )
}

// ── Style constants ───────────────────────────────────────────────────────────
const labelStyle = {
  fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)',
  letterSpacing: '0.08em', textTransform: 'uppercase',
  display: 'block', marginBottom: '0.375rem',
}

const inputStyle = {
  width: '100%', padding: '0.5625rem 0.75rem',
  background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)', fontSize: '0.8125rem',
  color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
  outline: 'none', marginBottom: '1rem', boxSizing: 'border-box',
}

const primaryButtonStyle = (disabled) => ({
  width: '100%', padding: '0.6875rem 1rem',
  background: disabled ? 'var(--bg-subtle)' : 'var(--accent)',
  border: 'none', borderRadius: 'var(--radius-md)',
  fontSize: '0.8125rem', fontWeight: 600,
  color: disabled ? 'var(--text-muted)' : '#fff',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'var(--font-body)', transition: 'all var(--transition)',
  minHeight: '2.75rem',
})