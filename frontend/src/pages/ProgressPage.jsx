import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMyClub, getClubDashboard } from '../api'

const CONFIDENCE_COLORS = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
  5: '#16a34a',
}

function StatCard({ value, label, color }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${color || 'var(--border-strong)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '1rem 1.25rem',
      minWidth: 120,
      flex: '1 1 0',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.5rem',
        fontWeight: 700,
        color: color || 'var(--text-primary)',
        lineHeight: 1.2,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '0.7rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-muted)',
        marginTop: '0.25rem',
      }}>
        {label}
      </div>
    </div>
  )
}

function ConfidenceCell({ data }) {
  if (!data) {
    return (
      <td style={{
        padding: '0.5rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
        borderBottom: '1px solid var(--border)',
      }}>
        ·
      </td>
    )
  }
  const color = CONFIDENCE_COLORS[data.confidence]
  return (
    <td style={{
      padding: '0.5rem',
      textAlign: 'center',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 'var(--radius-sm)',
        border: `1.5px solid ${color}`,
        backgroundColor: color + '18',
        color: color,
        fontWeight: 700,
        fontSize: '0.75rem',
        fontFamily: 'var(--font-display)',
      }}>
        {data.confidence}
      </div>
    </td>
  )
}

function AvgBadge({ value }) {
  if (value == null) {
    return (
      <td style={{
        padding: '0.5rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
        borderBottom: '1px solid var(--border)',
      }}>
        —
      </td>
    )
  }
  const color = value <= 2 ? '#ef4444' : value <= 3.5 ? '#eab308' : '#22c55e'
  return (
    <td style={{
      padding: '0.5rem',
      textAlign: 'center',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '0.8rem',
        color: color,
      }}>
        {value.toFixed(1)}
      </span>
    </td>
  )
}

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

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
        Loading dashboard…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-body)', color: 'var(--text-accent)' }}>
        {error}
      </div>
    )
  }

  if (!club) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
        No club found
      </div>
    )
  }

  const { athletes, moves, matrix, athlete_aggregates, move_aggregates } = dashboard

  // Compute squad-level stats
  const athleteAggs = Object.values(athlete_aggregates)
  const ratedAthletes = athleteAggs.filter(a => a.avg_confidence != null)
  const squadAvg = ratedAthletes.length > 0
    ? (ratedAthletes.reduce((s, a) => s + a.avg_confidence, 0) / ratedAthletes.length).toFixed(1)
    : '—'
  const totalRatings = athleteAggs.reduce((s, a) => s + a.rated_count, 0)

  const moveAggs = Object.entries(move_aggregates)
  const weakestMove = moveAggs
    .filter(([, v]) => v.avg_confidence != null)
    .sort((a, b) => a[1].avg_confidence - b[1].avg_confidence)[0]
  const weakestMoveName = weakestMove
    ? moves.find(m => m.id === weakestMove[0])?.name || '—'
    : '—'

  if (athletes.length === 0) {
    return (
      <div style={{ padding: '2rem 2.5rem', maxWidth: 900 }}>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-secondary)',
          marginBottom: '0.25rem',
        }}>
          SQUAD DASHBOARD
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: '0 0 1.5rem',
        }}>
          {club.name}
        </h1>
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontFamily: 'var(--font-body)' }}>
            No athletes have joined yet. Share your invite code:
          </p>
          <code style={{
            display: 'inline-block',
            padding: '0.6rem 1.25rem',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '1.4rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.15em',
            color: 'var(--text-accent)',
          }}>
            {club.invite_code}
          </code>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 2.5rem' }}>
      {/* Header */}
      <div style={{
        fontSize: '0.7rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-secondary)',
        marginBottom: '0.25rem',
      }}>
        SQUAD DASHBOARD
      </div>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.75rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        margin: '0 0 1.25rem',
      }}>
        {club.name}
      </h1>

      {/* Stat cards */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '2rem',
        flexWrap: 'wrap',
      }}>
        <StatCard value={athletes.length} label="Athletes" />
        <StatCard value={totalRatings} label="Ratings" />
        <StatCard value={squadAvg} label="Squad Avg" color={squadAvg !== '—' && parseFloat(squadAvg) <= 2 ? '#ef4444' : undefined} />
        <StatCard value={moves.length} label="Moves Tracked" />
        <StatCard value={weakestMoveName} label="Weakest Move" color="var(--accent)" />
      </div>

      {/* Matrix section label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem',
      }}>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-secondary)',
        }}>
          PROGRESS MATRIX
        </span>
        <span style={{
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.1rem 0.5rem',
          fontWeight: 500,
        }}>
          {athletes.length} × {moves.length}
        </span>
      </div>

      {/* Matrix card */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          overflow: 'auto',
          maxHeight: 'calc(100vh - 340px)',
        }}>
          <table style={{
            borderCollapse: 'collapse',
            width: 'max-content',
            minWidth: '100%',
            fontFamily: 'var(--font-body)',
            fontSize: '0.8rem',
          }}>
            <thead>
              <tr>
                <th style={{
                  position: 'sticky',
                  top: 0,
                  left: 0,
                  zIndex: 3,
                  background: 'var(--bg-subtle)',
                  padding: '0.6rem 1rem',
                  textAlign: 'left',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border)',
                  minWidth: 160,
                }}>
                  Athlete
                </th>
                <th style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  background: 'var(--bg-subtle)',
                  padding: '0.6rem 0.75rem',
                  textAlign: 'center',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border)',
                  minWidth: 50,
                }}>
                  Avg
                </th>
                {moves.map((move) => (
                  <th key={move.id} style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: 'var(--bg-subtle)',
                    padding: '0.6rem 0.5rem',
                    textAlign: 'center',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                    fontSize: '0.65rem',
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border)',
                    minWidth: 80,
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
                return (
                  <tr key={athlete.id} style={{
                    background: i % 2 === 0 ? 'transparent' : 'var(--bg-subtle)',
                  }}>
                    <td style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                      padding: '0.6rem 1rem',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border)',
                      whiteSpace: 'nowrap',
                    }}>
                      {athlete.display_name || 'Unnamed'}
                    </td>
                    <AvgBadge value={agg?.avg_confidence} />
                    {moves.map((move) => (
                      <ConfidenceCell key={move.id} data={matrix[athlete.id]?.[move.id]} />
                    ))}
                  </tr>
                )
              })}
              {/* Aggregate row */}
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <td style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  background: 'var(--bg-subtle)',
                  padding: '0.6rem 1rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)',
                  borderTop: '2px solid var(--border-strong)',
                }}>
                  Squad Avg
                </td>
                <td style={{
                  padding: '0.5rem',
                  textAlign: 'center',
                  borderTop: '2px solid var(--border-strong)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                }}>
                  {squadAvg}
                </td>
                {moves.map((move) => {
                  const agg = move_aggregates[move.id]
                  return (
                    <td key={move.id} style={{
                      padding: '0.5rem',
                      textAlign: 'center',
                      borderTop: '2px solid var(--border-strong)',
                    }}>
                      {agg?.avg_confidence != null ? (
                        <span style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          color: agg.avg_confidence <= 2 ? '#ef4444' : agg.avg_confidence <= 3.5 ? '#eab308' : '#22c55e',
                        }}>
                          {agg.avg_confidence.toFixed(1)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}