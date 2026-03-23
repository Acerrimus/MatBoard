import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAthleteOverview, setCompReady, unsetCompReady } from '../api'
import { confidenceColor, confidenceBg } from '../components/MoveCard'

// ── Shared helpers ─────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

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

function StatPill({ label, value, accent, gold }) {
  const borderColor = gold ? '#F59E0B' : accent ? 'var(--border-accent)' : 'var(--stat-border)'
  const bg = gold ? '#F59E0B0E' : accent ? 'var(--accent-soft)' : 'var(--stat-bg)'
  const textColor = gold ? '#F59E0B' : accent ? 'var(--accent)' : 'var(--text-primary)'
  return (
    <div style={{
      background: bg,
      border: `0.5px solid ${borderColor}`,
      borderRadius: 'var(--radius-lg)',
      padding: '0.875rem 1.25rem',
      display: 'flex', flexDirection: 'column', gap: 4,
      flex: 1, minWidth: '5.5rem',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '1.625rem', fontWeight: 700,
        color: textColor, lineHeight: 1,
      }}>{value ?? '—'}</div>
      <div style={{
        fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>{label}</div>
    </div>
  )
}

// ── Comp-ready toggle cell ─────────────────────────────────────────────────────
function MoveRow({ row, athleteId, isCompReady, onToggleCompReady, toggling }) {
  const { move, confidence, is_favourite } = row
  const conf = confidence
  const color = conf ? confidenceColor(conf) : 'var(--border)'
  const bg = conf ? confidenceBg(conf) : 'var(--bg-subtle)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.625rem 1rem',
      borderBottom: '0.5px solid var(--border)',
      background: isCompReady ? '#F59E0B06' : 'transparent',
    }}>
      {/* Confidence badge */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {isCompReady && (
          <div style={{
            position: 'absolute', inset: -3,
            borderRadius: 'calc(var(--radius-sm) + 2px)',
            border: '1.5px solid #F59E0B',
            boxShadow: '0 0 6px #F59E0B44',
            pointerEvents: 'none', zIndex: 1,
          }} />
        )}
        <div style={{
          width: '1.875rem', height: '1.875rem',
          borderRadius: 'var(--radius-sm)',
          border: conf ? `1.5px solid ${color}` : '0.5px solid var(--border)',
          background: bg, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 700,
          fontFamily: 'var(--font-display)',
        }}>
          {conf ?? '·'}
        </div>
      </div>

      {/* Move name + position */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.875rem', fontWeight: 500,
          color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          flexWrap: 'wrap',
        }}>
          <span style={{ color: 'var(--text-move)', fontWeight: 600 }}>{move.name}</span>
          {is_favourite && <span style={{ color: '#FDE047', fontSize: '0.75rem' }}>★</span>}
          {isCompReady && (
            <span style={{
              fontSize: '0.5625rem', fontWeight: 600, color: '#F59E0B',
              background: '#F59E0B18', border: '0.5px solid #F59E0B44',
              borderRadius: 20, padding: '1px 6px', letterSpacing: '0.06em',
            }}>⬡ comp ready</span>
          )}
        </div>
        {(move.from_position || move.to_position) && (
          <div style={{
            fontSize: '0.625rem', color: 'var(--text-muted)',
            marginTop: '0.125rem', display: 'flex', alignItems: 'center', gap: '0.2rem',
          }}>
            {move.from_position?.name}
            {move.from_position && move.to_position && (
              <span style={{ opacity: 0.5 }}>→</span>
            )}
            {move.to_position?.name}
          </div>
        )}
      </div>

      {/* Comp-ready toggle */}
      <button
        onClick={() => onToggleCompReady(move.id, isCompReady)}
        disabled={toggling === move.id}
        title={isCompReady ? 'Remove comp ready' : 'Mark comp ready'}
        style={{
          flexShrink: 0,
          width: '2.75rem', height: '2.75rem',
          borderRadius: 'var(--radius-sm)',
          border: isCompReady ? '1.5px solid #F59E0B' : '0.5px solid var(--border)',
          background: isCompReady ? '#F59E0B18' : 'var(--bg-subtle)',
          color: isCompReady ? '#F59E0B' : 'var(--text-muted)',
          cursor: toggling === move.id ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem',
          opacity: toggling === move.id ? 0.5 : 1,
          transition: 'all var(--transition)',
        }}
      >
        ⬡
      </button>
    </div>
  )
}

// ── Personal chain card ────────────────────────────────────────────────────────
function AthleteChainCard({ chain, progress }) {
  const progressByMoveId = Object.fromEntries(
    progress.map(r => [r.move_id, r])
  )

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderLeft: '3px solid var(--move-color)',
      borderRadius: 'var(--radius-md)',
      padding: '0.75rem 1rem',
      marginBottom: '0.5rem',
    }}>
      <div style={{
        fontSize: '0.875rem', fontWeight: 600,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-display)',
        marginBottom: '0.5rem',
      }}>{chain.name}</div>

      {chain.moves.length === 0 ? (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No moves in this chain</div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0,
        }}>
          {chain.moves.map((move, i) => {
            const prog = progressByMoveId[move.id]
            const conf = prog?.confidence
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
                  {move.name}
                  {conf ? (
                    <span style={{
                      fontWeight: 700, fontSize: '0.625rem',
                      fontFamily: 'var(--font-display)', opacity: 0.9,
                    }}>{conf}</span>
                  ) : (
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>—</span>
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
    </div>
  )
}

// ── Group progress rows by from_position ──────────────────────────────────────
function groupByPosition(progress) {
  const groups = {}
  const order = []
  for (const row of progress) {
    const pos = row.move?.from_position?.name ?? 'Other'
    if (!groups[pos]) {
      groups[pos] = []
      order.push(pos)
    }
    groups[pos].push(row)
  }
  return order.map(pos => ({ pos, rows: groups[pos] }))
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AthleteOverviewPage() {
  const { athleteId } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [compReadyIds, setCompReadyIds] = useState([])
  const [toggling, setToggling] = useState(null) // move_id currently being toggled

  useEffect(() => {
    async function load() {
      try {
        const result = await getAthleteOverview(athleteId)
        setData(result)
        setCompReadyIds(result.comp_ready_move_ids || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [athleteId])

  const handleToggleCompReady = useCallback(async (moveId, isCurrentlyReady) => {
    setToggling(moveId)
    try {
      if (isCurrentlyReady) {
        await unsetCompReady(athleteId, moveId)
        setCompReadyIds(prev => prev.filter(id => id !== moveId))
      } else {
        await setCompReady(athleteId, moveId)
        setCompReadyIds(prev => [...prev, moveId])
      }
    } catch (err) {
      console.error('Comp ready toggle failed:', err)
    } finally {
      setToggling(null)
    }
  }, [athleteId])

  if (loading) {
    return (
      <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1.75rem 2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              height: '3.25rem', background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              animation: 'pulse 1.4s ease infinite',
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1.75rem 2rem' }}>
        <div style={{
          background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
          fontSize: '0.8125rem', color: 'var(--accent)',
        }}>{error}</div>
      </div>
    )
  }

  if (!data) return null

  const { profile, progress, chains } = data
  const compReadyCount = compReadyIds.length
  const ratedCount = progress.length
  const avgConf = ratedCount > 0
    ? (progress.reduce((s, r) => s + r.confidence, 0) / ratedCount).toFixed(1)
    : null
  const favouriteCount = progress.filter(r => r.is_favourite).length
  const grouped = groupByPosition(progress)

  return (
    <div style={{
      maxWidth: '48rem',
      margin: '0 auto',
      padding: isMobile ? '1.25rem 1rem' : '1.75rem 2rem',
    }}>

      {/* ── Back button ─────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
          background: 'none', border: 'none', padding: 0,
          cursor: 'pointer', marginBottom: '1.25rem',
          fontFamily: 'var(--font-body)',
          minHeight: '2.75rem',
        }}
      >
        ← Dashboard
      </button>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
        }}>Athlete Overview</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700,
          letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0,
        }}>{profile?.display_name || 'Unnamed Athlete'}</h1>
      </div>

      {/* ── Stat pills ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '0.625rem',
        marginBottom: '1.75rem', flexWrap: 'wrap',
      }}>
        <StatPill label="Rated Moves" value={ratedCount} />
        <StatPill label="Avg Confidence" value={avgConf} />
        <StatPill label="Favourites" value={favouriteCount} />
        <StatPill label="Comp Ready" value={compReadyCount} gold />
      </div>

      {/* ── Personal chains ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <SectionLabel count={chains.length}>Personal Chains</SectionLabel>
        {chains.length === 0 ? (
          <div style={{
            background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '1.5rem',
            textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)',
          }}>
            No personal chains yet
          </div>
        ) : (
          chains.map(chain => (
            <AthleteChainCard
              key={chain.id}
              chain={chain}
              progress={progress}
            />
          ))
        )}
      </div>

      {/* ── Progress by position ─────────────────────────────────────────── */}
      <div>
        <SectionLabel count={ratedCount}>Rated Moves</SectionLabel>

        {progress.length === 0 ? (
          <div style={{
            background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '1.5rem',
            textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)',
          }}>
            This athlete hasn't rated any moves yet
          </div>
        ) : (
          grouped.map(({ pos, rows }) => (
            <div key={pos} style={{ marginBottom: '1.25rem' }}>
              {/* Position group header */}
              <div style={{
                fontSize: '0.6875rem', fontWeight: 600,
                color: 'var(--text-secondary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '0.375rem 1rem',
                background: 'var(--bg-subtle)',
                border: '0.5px solid var(--border)',
                borderBottom: 'none',
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              }}>{pos}</div>

              <div style={{
                background: 'var(--bg-surface)',
                border: '0.5px solid var(--border)',
                borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                overflow: 'hidden',
              }}>
                {rows.map((row, i) => (
                  <MoveRow
                    key={row.move_id}
                    row={row}
                    athleteId={athleteId}
                    isCompReady={compReadyIds.includes(row.move_id)}
                    onToggleCompReady={handleToggleCompReady}
                    toggling={toggling}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}