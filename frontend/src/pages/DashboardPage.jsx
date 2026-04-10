import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyClub, getClubDashboard, getCurricula } from '../api'
import { confidenceColor, confidenceBg } from '../components/MoveCard'

// ── Helpers ────────────────────────────────────────────────────────────────────
function truncateName(name, max = 20) {
  if (!name || name.length <= max) return name
  const half = Math.floor((max - 3) / 2)
  return `${name.slice(0, half + 2)}…${name.slice(-half)}`
}

function SectionLabel({ children, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{
        fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>{children}</div>
      {count !== undefined && (
        <div style={{
          fontSize: '0.5625rem', fontWeight: 600, color: 'var(--text-muted)',
          background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
          borderRadius: 20, padding: '1px 7px',
        }}>{count}</div>
      )}
    </div>
  )
}

// ── Attention Cards ────────────────────────────────────────────────────────────
function AthleteDot({ confidence, label }) {
  const color = confidence ? confidenceColor(confidence) : 'var(--border)'
  const bg    = confidence ? confidenceBg(confidence)    : 'var(--bg-subtle)'
  return (
    <div
      title={`${label}: ${confidence ?? '—'}`}
      style={{
        width: 28, height: 28, borderRadius: '50%',
        background: bg, border: `1.5px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.6875rem', fontWeight: 700,
        fontFamily: 'var(--font-display)', color, flexShrink: 0,
      }}
    >
      {confidence ?? '·'}
    </div>
  )
}

function WeakestCard({ insight, moveName, athletes, matrix }) {
  if (!insight || !moveName) return null
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
      borderTop: '2px solid var(--accent)', borderRadius: 'var(--radius-lg)',
      padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      <div style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)' }}>
        Weakest Link
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: 6 }}>
          {moveName}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
          {insight.avg_confidence?.toFixed(1)}
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>squad avg confidence</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {athletes.map(a => (
          <AthleteDot key={a.id} confidence={matrix[a.id]?.[insight.move_id]?.confidence} label={a.display_name} />
        ))}
      </div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Where your squad breaks down
      </div>
    </div>
  )
}

function InconsistentCard({ insight, moveName, athletes, matrix }) {
  if (!insight || !moveName) return null
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
      borderTop: '2px solid var(--comp-ready)', borderRadius: 'var(--radius-lg)',
      padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      <div style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--comp-ready)' }}>
        Most Inconsistent
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: 6 }}>
          {moveName}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--comp-ready)', lineHeight: 1 }}>
          ±{insight.spread}
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>confidence spread</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {athletes.map(a => (
          <AthleteDot key={a.id} confidence={matrix[a.id]?.[insight.move_id]?.confidence} label={a.display_name} />
        ))}
      </div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Your athletes don't agree on this one
      </div>
    </div>
  )
}

function CompReadyCard({ compReady, athletes }) {
  const withCompReady = athletes
    .map(a => ({ athlete: a, count: (compReady[a.id] || []).length }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)

  if (withCompReady.length === 0) return null
  const top = withCompReady[0]

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
      borderTop: '2px solid var(--success)', borderRadius: 'var(--radius-lg)',
      padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      <div style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--success)' }}>
        Competition Ready
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--success)', lineHeight: 1 }}>
            {withCompReady.length}
          </span>
          <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>of {athletes.length}</span>
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>athletes with comp-ready moves</div>
      </div>
      <div style={{
        background: 'var(--success-soft)', border: '0.5px solid var(--success-border)',
        borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem',
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)' }}>{top.athlete.display_name}</div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          {top.count} move{top.count !== 1 ? 's' : ''} comp ready
        </div>
      </div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Ready to compete
      </div>
    </div>
  )
}

// ── Squad Matrix ───────────────────────────────────────────────────────────────
const CELL = 36

function SquadMatrix({ athletes, moves, matrix, athleteAggregates, moveAggregates, squadAvg, compReady, onAthleteClick }) {
  const [hoveredRow, setHoveredRow] = useState(null)
  const [hoveredCol, setHoveredCol] = useState(null)
  const [sortBy, setSortBy]         = useState(null)   // null = by avg | move_id
  const [sortDir, setSortDir]       = useState('asc')

  const handleColClick = (moveId) => {
    if (sortBy === moveId) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(moveId); setSortDir('asc') }
  }
  const handleAthleteColClick = () => {
    if (sortBy === null) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(null); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    return [...athletes].sort((a, b) => {
      const av = sortBy === null
        ? (athleteAggregates[a.id]?.avg_confidence ?? -1)
        : (matrix[a.id]?.[sortBy]?.confidence ?? -1)
      const bv = sortBy === null
        ? (athleteAggregates[b.id]?.avg_confidence ?? -1)
        : (matrix[b.id]?.[sortBy]?.confidence ?? -1)
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [athletes, sortBy, sortDir, athleteAggregates, matrix])

  const thBase = {
    position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg-subtle)',
    padding: '0.625rem 0.375rem', textAlign: 'center',
    borderBottom: '0.5px solid var(--border)',
    fontSize: '0.5625rem', fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    userSelect: 'none', cursor: 'pointer',
  }

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 420px)' }}>
        <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%', fontFamily: 'var(--font-body)' }}>
          <thead>
            <tr>
              {/* Athlete col header */}
              <th
                onClick={handleAthleteColClick}
                style={{
                  ...thBase, position: 'sticky', top: 0, left: 0, zIndex: 3,
                  textAlign: 'left', padding: '0.625rem 0.875rem',
                  minWidth: '10rem', color: sortBy === null ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                Athlete {sortBy === null ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              {/* Avg col header */}
              <th style={{ ...thBase, color: 'var(--text-muted)', minWidth: '3.5rem', cursor: 'default' }}>
                Avg
              </th>
              {/* Move col headers */}
              {moves.map(move => (
                <th
                  key={move.id}
                  title={move.name}
                  onClick={() => handleColClick(move.id)}
                  onMouseEnter={() => setHoveredCol(move.id)}
                  onMouseLeave={() => setHoveredCol(null)}
                  style={{
                    ...thBase,
                    background: hoveredCol === move.id ? 'var(--bg-page)' : 'var(--bg-subtle)',
                    color: sortBy === move.id ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: sortBy === move.id ? 700 : 500,
                    borderBottom: sortBy === move.id
                      ? '1.5px solid var(--accent)'
                      : '0.5px solid var(--border)',
                    minWidth: `${CELL + 16}px`, transition: 'background 0.12s',
                  }}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '5rem' }}>
                    {truncateName(move.name, 12)}
                  </div>
                  {sortBy === move.id && (
                    <div style={{ fontSize: 8, marginTop: 1 }}>{sortDir === 'asc' ? '↑' : '↓'}</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((athlete) => {
              const agg              = athleteAggregates[athlete.id]
              const athleteCompReady = compReady[athlete.id] || []
              const isRow            = hoveredRow === athlete.id

              return (
                <tr
                  key={athlete.id}
                  onMouseEnter={() => setHoveredRow(athlete.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{ background: isRow ? 'color-mix(in srgb, var(--bg-subtle) 60%, transparent)' : 'transparent', transition: 'background 0.1s' }}
                >
                  {/* Name */}
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 1,
                    background: isRow ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                    padding: '0 0.875rem', borderBottom: '0.5px solid var(--border)',
                    whiteSpace: 'nowrap', height: `${CELL}px`, transition: 'background 0.1s',
                  }}>
                    <button
                      onClick={() => onAthleteClick(athlete.id)}
                      style={{
                        fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)',
                        background: 'none', border: 'none', padding: 0,
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                        textDecoration: 'underline', textDecorationColor: 'var(--border)',
                        textUnderlineOffset: 3,
                      }}
                    >{athlete.display_name || 'Unnamed'}</button>
                  </td>
                  {/* Avg */}
                  <td style={{
                    padding: 0, textAlign: 'center',
                    borderBottom: '0.5px solid var(--border)', height: `${CELL}px`,
                    background: isRow ? 'var(--bg-subtle)' : 'transparent', transition: 'background 0.1s',
                  }}>
                    {agg?.avg_confidence != null ? (
                      <span style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8125rem',
                        color: confidenceColor(agg.avg_confidence <= 2 ? 1 : agg.avg_confidence <= 3.5 ? 3 : 5),
                      }}>{agg.avg_confidence.toFixed(1)}</span>
                    ) : <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  {/* Move cells */}
                  {moves.map(move => {
                    const data        = matrix[athlete.id]?.[move.id]
                    const isCompReady = athleteCompReady.includes(move.id)
                    const isCol       = hoveredCol === move.id
                    const highlight   = isRow || isCol

                    if (!data) return (
                      <td key={move.id} style={{
                        padding: 0, height: `${CELL}px`, textAlign: 'center',
                        borderBottom: '0.5px solid var(--border)',
                        background: highlight ? 'var(--bg-subtle)' : 'var(--bg-page)',
                        transition: 'background 0.1s',
                      }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--border)' }}>·</span>
                      </td>
                    )

                    const conf = data.confidence
                    return (
                      <td key={move.id} style={{
                        padding: 0, height: `${CELL}px`, textAlign: 'center',
                        borderBottom: '0.5px solid var(--border)',
                        background: confidenceBg(conf),
                        boxShadow: isCompReady ? 'inset 0 0 0 2px var(--comp-ready)' : 'none',
                        filter: highlight ? 'brightness(1.18)' : 'none',
                        transition: 'filter 0.1s',
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-display)', fontWeight: 700,
                          fontSize: '0.75rem', color: confidenceColor(conf),
                        }}>{conf}</span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {/* Squad avg row */}
            <tr>
              <td style={{
                position: 'sticky', left: 0, zIndex: 1, background: 'var(--bg-subtle)',
                padding: '0 0.875rem', height: `${CELL}px`, whiteSpace: 'nowrap',
                borderTop: '2px solid var(--border-strong)',
                fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--text-muted)',
              }}>Squad Avg</td>
              <td style={{
                padding: 0, textAlign: 'center', height: `${CELL}px`,
                borderTop: '2px solid var(--border-strong)',
                background: 'var(--bg-subtle)',
              }}>
                {squadAvg
                  ? <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{squadAvg}</span>
                  : <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>—</span>}
              </td>
              {moves.map(move => {
                const agg = moveAggregates[move.id]
                return (
                  <td key={move.id} style={{
                    padding: 0, textAlign: 'center', height: `${CELL}px`,
                    borderTop: '2px solid var(--border-strong)',
                    background: agg?.avg_confidence != null ? confidenceBg(Math.round(agg.avg_confidence)) : 'var(--bg-subtle)',
                  }}>
                    {agg?.avg_confidence != null
                      ? <span style={{
                          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem',
                          color: confidenceColor(Math.round(agg.avg_confidence)),
                        }}>{agg.avg_confidence.toFixed(1)}</span>
                      : <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>—</span>}
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

// ── Athletes At Risk ────────────────────────────────────────────────────────────
function AthletesAtRisk({ athletes, athleteAggregates, squadAvgNum, positions, positionComfort, onAthleteClick }) {
  const atRisk = useMemo(() => {
    return athletes
      .map(a => ({ athlete: a, agg: athleteAggregates[a.id] }))
      .filter(({ agg }) => agg?.avg_confidence != null && agg.avg_confidence < squadAvgNum)
      .sort((a, b) => a.agg.avg_confidence - b.agg.avg_confidence)
      .slice(0, 5)
  }, [athletes, athleteAggregates, squadAvgNum])

  if (atRisk.length === 0) return null

  function weakestArea(athleteId) {
    if (!positionComfort || !positions?.length) return null
    const comfort = positionComfort[athleteId]
    if (!comfort) return null
    let weakPos = null, weakVal = Infinity
    positions.forEach(p => {
      const v = comfort[p.id]
      if (v != null && v < weakVal) { weakVal = v; weakPos = p }
    })
    return weakPos ? `${weakPos.name} needs work` : null
  }

  return (
    <div style={{ marginTop: '1.75rem' }}>
      <SectionLabel count={atRisk.length}>Athletes At Risk</SectionLabel>
      <div style={{
        background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      }}>
        {atRisk.map(({ athlete, agg }, i) => {
          const conf  = agg.avg_confidence
          const color = confidenceColor(conf <= 2 ? 1 : conf <= 3.5 ? 3 : 5)
          const area  = weakestArea(athlete.id)

          return (
            <div key={athlete.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderBottom: i < atRisk.length - 1 ? '0.5px solid var(--border)' : 'none',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700,
                color: 'var(--text-muted)', width: 16, textAlign: 'right', flexShrink: 0,
              }}>{i + 1}</div>
              <button
                onClick={() => onAthleteClick(athlete.id)}
                style={{
                  flex: 1, minWidth: 0, textAlign: 'left', fontSize: '0.875rem', fontWeight: 500,
                  color: 'var(--text-primary)', background: 'none', border: 'none',
                  padding: 0, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  textDecoration: 'underline', textDecorationColor: 'var(--border)',
                  textUnderlineOffset: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{athlete.display_name || 'Unnamed'}</button>
              {area && (
                <div style={{
                  fontSize: '0.625rem', color: 'var(--text-muted)',
                  background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '2px 6px',
                  flexShrink: 0, whiteSpace: 'nowrap',
                }}>{area}</div>
              )}
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {agg.rated_count} of {agg.total_count} rated
              </div>
              <div style={{
                padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)',
                border: `1px solid ${color}30`, background: `${color}15`,
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem',
                color, flexShrink: 0,
              }}>{conf.toFixed(1)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Empty Squad ────────────────────────────────────────────────────────────────
function EmptySquad({ clubName, inviteCode }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '2.5rem 1.5rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🤼</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
        No athletes yet
      </div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
        Share your invite code so athletes can join {clubName}.
      </div>
      <code style={{
        display: 'inline-block', padding: '0.5rem 1.125rem',
        background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)', fontSize: '1.125rem', fontWeight: 700,
        fontFamily: 'var(--font-display)', letterSpacing: '0.15em', color: 'var(--accent)',
      }}>{inviteCode}</code>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()

  const [club, setClub]                   = useState(null)
  const [dashboard, setDashboard]         = useState(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [curricula, setCurricula]         = useState([])
  const [selectedCurriculum, setSelected] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const clubData = await getMyClub()
        setClub(clubData)
        const [dash, currList] = await Promise.all([
          getClubDashboard(clubData.id),
          getCurricula(),
        ])
        setDashboard(dash)
        setCurricula(currList)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const reloadDashboard = async (curriculumId = null) => {
    if (!club) return
    try {
      const dash = await getClubDashboard(club.id, curriculumId)
      setDashboard(dash)
    } catch (err) { setError(err.message) }
  }

  const handleCurriculumChange = (currId) => {
    const val = currId || null
    setSelected(val)
    reloadDashboard(val)
  }

  const handleAthleteClick = (athleteId) => navigate(`/athletes/${athleteId}`)

  // ── Derived ──────────────────────────────────────────────────────────────────
  // When a curriculum is selected, scope matrix to only moves in those chains
  const displayMoves = useMemo(() => {
    if (!dashboard) return []
    if (!selectedCurriculum || !dashboard.chains?.length) return dashboard.moves
    const ids = new Set(dashboard.chains.flatMap(c => (c.moves || []).map(m => m.id)))
    return dashboard.moves.filter(m => ids.has(m.id))
  }, [dashboard, selectedCurriculum])

  const { squadAvg, squadAvgNum, totalRatings } = useMemo(() => {
    if (!dashboard) return { squadAvg: null, squadAvgNum: null, totalRatings: 0 }
    const aggs   = Object.values(dashboard.athlete_aggregates)
    const rated  = aggs.filter(a => a.avg_confidence != null)
    const avg    = rated.length > 0
      ? rated.reduce((s, a) => s + a.avg_confidence, 0) / rated.length
      : null
    const total  = aggs.reduce((s, a) => s + a.rated_count, 0)
    return { squadAvg: avg?.toFixed(1) ?? null, squadAvgNum: avg, totalRatings: total }
  }, [dashboard])

  const moveNameById = useMemo(() => {
    const map = {}
    dashboard?.moves?.forEach(m => { map[m.id] = m.name })
    return map
  }, [dashboard?.moves])

  // ── States ───────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '1.75rem 2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            height: '3.25rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
            animation: 'pulse 1.4s ease infinite', animationDelay: `${i * 0.1}s`,
          }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '1.75rem 2rem' }}>
      <div style={{
        background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
        borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
        fontSize: '0.8125rem', color: 'var(--accent)',
      }}>{error}</div>
    </div>
  )

  if (!club) return (
    <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '1.75rem 2rem' }}>
      <div style={{
        background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
        borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
        fontSize: '0.8125rem', color: 'var(--accent)',
      }}>No club found. Create or join a club first.</div>
    </div>
  )

  const {
    athletes, moves, chains, matrix,
    athlete_aggregates, move_aggregates,
    positions, position_comfort, squad_position_comfort,
    comp_ready = {},
    insights,
  } = dashboard

  const hasInsights = insights && (insights.weakest || insights.most_inconsistent)

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '1.75rem 2rem' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{
          fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
        }}>Squad Dashboard</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700,
          letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: '0 0 0.25rem',
        }}>{club.name}</h1>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: curricula.length ? '1rem' : 0 }}>
          {athletes.length} athlete{athletes.length !== 1 ? 's' : ''} · {totalRatings} ratings{squadAvg ? ` · Squad avg ${squadAvg}` : ''}
        </div>

        {/* Curriculum filter pills inline in header */}
        {curricula.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleCurriculumChange(null)}
              style={{
                padding: '0.3rem 0.75rem', fontSize: '0.6875rem', fontWeight: 600,
                borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)',
                border: `0.5px solid ${!selectedCurriculum ? 'var(--accent)' : 'var(--border)'}`,
                background: !selectedCurriculum ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                color: !selectedCurriculum ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}>All moves</button>
            {curricula.map(c => (
              <button key={c.id} onClick={() => handleCurriculumChange(c.id)}
                style={{
                  padding: '0.3rem 0.75rem', fontSize: '0.6875rem', fontWeight: 600,
                  borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)',
                  border: `0.5px solid ${selectedCurriculum === c.id ? 'var(--move-color)' : 'var(--border)'}`,
                  background: selectedCurriculum === c.id ? 'var(--move-soft)' : 'var(--bg-subtle)',
                  color: selectedCurriculum === c.id ? 'var(--move-color)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}>{c.name}</button>
            ))}
          </div>
        )}
      </div>

      {athletes.length === 0 ? <EmptySquad clubName={club.name} inviteCode={club.invite_code} /> : (
        <>
          {/* ── Attention Cards ── */}
          {hasInsights && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
              gap: '0.875rem', marginBottom: '1.75rem',
            }}>
              <WeakestCard
                insight={insights.weakest}
                moveName={moveNameById[insights.weakest?.move_id]}
                athletes={athletes}
                matrix={matrix}
              />
              <InconsistentCard
                insight={insights.most_inconsistent}
                moveName={moveNameById[insights.most_inconsistent?.move_id]}
                athletes={athletes}
                matrix={matrix}
              />
              <CompReadyCard compReady={comp_ready} athletes={athletes} />
            </div>
          )}

          {/* ── Progress Matrix ── */}
          <SectionLabel count={`${athletes.length} × ${displayMoves.length}`}>
            Progress Matrix
          </SectionLabel>
          <SquadMatrix
            athletes={athletes}
            moves={displayMoves}
            matrix={matrix}
            athleteAggregates={athlete_aggregates}
            moveAggregates={move_aggregates}
            squadAvg={squadAvg}
            compReady={comp_ready}
            onAthleteClick={handleAthleteClick}
          />

          {/* ── Athletes At Risk ── */}
          {squadAvgNum != null && (
            <AthletesAtRisk
              athletes={athletes}
              athleteAggregates={athlete_aggregates}
              squadAvgNum={squadAvgNum}
              positions={positions}
              positionComfort={position_comfort}
              onAthleteClick={handleAthleteClick}
            />
          )}
        </>
      )}

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
    </div>
  )
}