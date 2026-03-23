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

function ConfidenceCell({ data }) {
  if (!data) {
    return (
      <td style={{
        padding: '0.5rem 0.75rem',
        border: '1px solid var(--border)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
      }}>
        —
      </td>
    )
  }
  return (
    <td style={{
      padding: '0.5rem 0.75rem',
      border: '1px solid var(--border)',
      textAlign: 'center',
      whiteSpace: 'nowrap',
      backgroundColor: CONFIDENCE_COLORS[data.confidence] + '22',
    }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: CONFIDENCE_COLORS[data.confidence],
        color: 'white',
        fontWeight: 700,
        fontSize: '0.7rem',
      }}>
        {data.confidence}
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

  if (athletes.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: '1rem' }}>
          {club.name} — Squad Dashboard
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
          No athletes have joined yet. Share your invite code:
        </p>
        <code style={{
          display: 'inline-block',
          marginTop: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '1.25rem',
          fontWeight: 600,
          letterSpacing: '0.1em',
          color: 'var(--text-primary)',
        }}>
          {club.invite_code}
        </code>
      </div>
    )
  }

  const stickyCol = {
    position: 'sticky',
    left: 0,
    zIndex: 2,
    background: 'var(--bg-surface)',
    textAlign: 'left',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  }

  const headerCell = {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    background: 'var(--bg-subtle)',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border)',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    minWidth: 80,
  }

  const cornerCell = {
    ...headerCell,
    ...stickyCol,
    zIndex: 3,
    background: 'var(--bg-subtle)',
    minWidth: 140,
  }

  const avgCell = {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border)',
    textAlign: 'center',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '100%', overflow: 'hidden' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>
          {club.name} — Squad Dashboard
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          {athletes.length} athlete{athletes.length !== 1 && 's'} · {moves.length} move{moves.length !== 1 && 's'}
        </p>
      </div>

      <div style={{
        overflow: 'auto',
        maxHeight: 'calc(100vh - 180px)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
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
              <th style={cornerCell}>Athlete</th>
              <th style={{ ...headerCell, minWidth: 50 }}>Avg</th>
              {moves.map((move) => (
                <th key={move.id} style={headerCell}>
                  <span style={{ display: 'inline-block', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {move.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {athletes.map((athlete) => {
              const agg = athlete_aggregates[athlete.id]
              return (
                <tr key={athlete.id}>
                  <td style={{ ...stickyCol, fontWeight: 500, color: 'var(--text-primary)', minWidth: 140 }}>
                    {athlete.display_name || 'Unnamed'}
                  </td>
                  <td style={avgCell}>
                    {agg?.avg_confidence != null ? agg.avg_confidence.toFixed(1) : '—'}
                  </td>
                  {moves.map((move) => (
                    <ConfidenceCell key={move.id} data={matrix[athlete.id]?.[move.id]} />
                  ))}
                </tr>
              )
            })}
            <tr style={{ background: 'var(--bg-subtle)' }}>
              <td style={{ ...stickyCol, background: 'var(--bg-subtle)', fontWeight: 700, color: 'var(--text-primary)' }}>
                Avg
              </td>
              <td style={avgCell}>—</td>
              {moves.map((move) => {
                const agg = move_aggregates[move.id]
                return (
                  <td key={move.id} style={avgCell}>
                    {agg?.avg_confidence != null ? agg.avg_confidence.toFixed(1) : '—'}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}