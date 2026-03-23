import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMyClub, getClubDashboard } from '../api'
import { confidenceColor, confidenceBg } from '../components/MoveCard'

// ── Stat pill (same as ProgressPage) ──────────────────────────────────────────
function StatPill({ label, value, accent }) {
  return (
    <div style={{
      background: accent ? 'var(--accent-soft)' : 'var(--stat-bg)',
      border: `0.5px solid ${accent ? 'var(--border-accent)' : 'var(--stat-border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '14px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      flex: 1,
      minWidth: 100,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 26,
        fontWeight: 700,
        color: accent ? 'var(--accent)' : 'var(--text-primary)',
        lineHeight: 1,
      }}>
        {value ?? '—'}
      </div>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
      }}>
        {label}
      </div>
    </div>
  )
}

// ── Section label (same as ProgressPage) ──────────────────────────────────────
function SectionLabel({ children, count }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
      }}>
        {children}
      </div>
      {count !== undefined && (
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-muted)',
          background: 'var(--bg-subtle)',
          border: '0.5px solid var(--border)',
          borderRadius: 20,
          padding: '1px 7px',
        }}>
          {count}
        </div>
      )}
    </div>
  )
}

// ── Confidence cell ───────────────────────────────────────────────────────────
function ConfidenceCell({ data }) {
  if (!data) {
    return (
      <td style={{
        padding: '8px 6px',
        textAlign: 'center',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <div style={{
          width: 26,
          height: 26,
          borderRadius: 'var(--radius-sm)',
          border: '0.5px solid var(--border)',
          background: 'var(--bg-subtle)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-display)',
        }}>
          ·
        </div>
      </td>
    )
  }
  const conf = data.confidence
  return (
    <td style={{
      padding: '8px 6px',
      textAlign: 'center',
      borderBottom: '0.5px solid var(--border)',
    }}>
      <div style={{
        width: 26,
        height: 26,
        borderRadius: 'var(--radius-sm)',
        border: `1.5px solid ${confidenceColor(conf)}`,
        background: confidenceBg(conf),
        color: confidenceColor(conf),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        fontFamily: 'var(--font-display)',
      }}>
        {conf}
      </div>
    </td>
  )
}

// ── Avg cell ──────────────────────────────────────────────────────────────────
function AvgCell({ value }) {
  if (value == null) {
    return (
      <td style={{
        padding: '8px 6px',
        textAlign: 'center',
        borderBottom: '0.5px solid var(--border)',
        fontSize: 11,
        color: 'var(--text-muted)',
      }}>
        —
      </td>
    )
  }
  const color = value <= 2 ? confidenceColor(1) : value <= 3.5 ? confidenceColor(3) : confidenceColor(5)
  return (
    <td style={{
      padding: '8px 6px',
      textAlign: 'center',
      borderBottom: '0.5px solid var(--border)',
    }}>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 13,
        color,
      }}>
        {value.toFixed(1)}
      </span>
    </td>
  )
}

// ── Athlete row label ─────────────────────────────────────────────────────────
function AthleteLabel({ name, even }) {
  return (
    <td style={{
      position: 'sticky',
      left: 0,
      zIndex: 1,
      background: even ? 'var(--bg-surface)' : 'var(--bg-subtle)',
      padding: '8px 14px',
      fontWeight: 500,
      fontSize: 13,
      color: 'var(--text-primary)',
      borderBottom: '0.5px solid var(--border)',
      whiteSpace: 'nowrap',
      minWidth: 160,
    }}>
      {name || 'Unnamed'}
    </td>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptySquad({ clubName, inviteCode }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🤼</div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 6,
      }}>
        No athletes yet
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
        Share your invite code so athletes can join {clubName}.
      </div>
      <code style={{
        display: 'inline-block',
        padding: '8px 18px',
        background: 'var(--bg-subtle)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        fontSize: 18,
        fontWeight: 700,
        fontFamily: 'var(--font-display)',
        letterSpacing: '0.15em',
        color: 'var(--accent)',
      }}>
        {inviteCode}
      </code>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile } = useAuth()
  const [club, setClub] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const clubData = await getMyClub()
        setClub(clubData)
        const dash = await getClubDashboard(clubData.id)
        setDashboard(dash)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Loading skeleton (same pattern as ProgressPage) ─────────────────────────
  if (loading) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 52,
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              animation: 'pulse 1.4s ease infinite',
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.4; }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px' }}>
        <div style={{
          background: 'var(--accent-soft)',
          border: '0.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          fontSize: 13,
          color: 'var(--accent)',
        }}>
          {error}
        </div>
      </div>
    )
  }

  if (!club) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px' }}>
        <div style={{
          background: 'var(--accent-soft)',
          border: '0.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          fontSize: 13,
          color: 'var(--accent)',
        }}>
          No club found. Create or join a club first.
        </div>
      </div>
    )
  }

  const { athletes, moves, matrix, athlete_aggregates, move_aggregates } = dashboard

  // ── Derived stats ───────────────────────────────────────────────────────────
  const athleteAggs = Object.values(athlete_aggregates)
  const ratedAthletes = athleteAggs.filter(a => a.avg_confidence != null)
  const totalRatings = athleteAggs.reduce((s, a) => s + a.rated_count, 0)
  const squadAvg = ratedAthletes.length > 0
    ? (ratedAthletes.reduce((s, a) => s + a.avg_confidence, 0) / ratedAthletes.length).toFixed(1)
    : null

  const moveAggs = Object.entries(move_aggregates)
  const weakMoves = moveAggs
    .filter(([, v]) => v.avg_confidence != null && v.avg_confidence <= 2)
  const weakCount = weakMoves.length

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 4,
        }}>
          Squad Dashboard
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '-0.5px',
          color: 'var(--text-primary)',
          margin: 0,
        }}>
          {club.name}
        </h1>
      </div>

      {athletes.length === 0 ? (
        <EmptySquad clubName={club.name} inviteCode={club.invite_code} />
      ) : (
        <>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
            <StatPill label="Athletes" value={athletes.length} />
            <StatPill label="Ratings" value={totalRatings} />
            <StatPill label="Squad Avg" value={squadAvg} />
            <StatPill label="Moves" value={moves.length} />
            {weakCount > 0 && (
              <StatPill label="Weak Moves" value={weakCount} accent />
            )}
          </div>

          {/* Matrix */}
          <SectionLabel count={`${athletes.length} × ${moves.length}`}>
            Progress Matrix
          </SectionLabel>

          <div style={{
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            <div style={{
              overflow: 'auto',
              maxHeight: 'calc(100vh - 360px)',
            }}>
              <table style={{
                borderCollapse: 'collapse',
                width: 'max-content',
                minWidth: '100%',
                fontFamily: 'var(--font-body)',
              }}>
                <thead>
                  <tr>
                    <th style={{
                      position: 'sticky',
                      top: 0,
                      left: 0,
                      zIndex: 3,
                      background: 'var(--bg-subtle)',
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      borderBottom: '0.5px solid var(--border)',
                      minWidth: 160,
                    }}>
                      Athlete
                    </th>
                    <th style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      background: 'var(--bg-subtle)',
                      padding: '10px 8px',
                      textAlign: 'center',
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      borderBottom: '0.5px solid var(--border)',
                      minWidth: 50,
                    }}>
                      Avg
                    </th>
                    {moves.map(move => (
                      <th key={move.id} style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        background: 'var(--bg-subtle)',
                        padding: '10px 6px',
                        textAlign: 'center',
                        fontSize: 11,
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        borderBottom: '0.5px solid var(--border)',
                        minWidth: 70,
                        maxWidth: 90,
                      }}>
                        <div style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {move.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((athlete, i) => {
                    const agg = athlete_aggregates[athlete.id]
                    const even = i % 2 === 0
                    return (
                      <tr key={athlete.id} style={{
                        background: even ? 'transparent' : 'var(--bg-subtle)',
                      }}>
                        <AthleteLabel name={athlete.display_name} even={even} />
                        <AvgCell value={agg?.avg_confidence} />
                        {moves.map(move => (
                          <ConfidenceCell key={move.id} data={matrix[athlete.id]?.[move.id]} />
                        ))}
                      </tr>
                    )
                  })}

                  {/* Squad avg row */}
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    <td style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      background: 'var(--bg-subtle)',
                      padding: '10px 14px',
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      borderTop: '1.5px solid var(--border-strong)',
                    }}>
                      Squad Avg
                    </td>
                    <td style={{
                      padding: '8px 6px',
                      textAlign: 'center',
                      borderTop: '1.5px solid var(--border-strong)',
                    }}>
                      {squadAvg ? (
                        <span style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          fontSize: 13,
                          color: 'var(--text-primary)',
                        }}>
                          {squadAvg}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    {moves.map(move => {
                      const agg = move_aggregates[move.id]
                      return (
                        <td key={move.id} style={{
                          padding: '8px 6px',
                          textAlign: 'center',
                          borderTop: '1.5px solid var(--border-strong)',
                        }}>
                          {agg?.avg_confidence != null ? (
                            <span style={{
                              fontFamily: 'var(--font-display)',
                              fontWeight: 700,
                              fontSize: 12,
                              color: agg.avg_confidence <= 2
                                ? confidenceColor(1)
                                : agg.avg_confidence <= 3.5
                                  ? confidenceColor(3)
                                  : confidenceColor(5),
                            }}>
                              {agg.avg_confidence.toFixed(1)}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}