import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyClub, getClubDashboard, getCurricula } from '../api'
import { confidenceColor, confidenceBg } from '../components/MoveCard'

// ── Helpers ───────────────────────────────────────────────────────────────────
function truncateName(name, max = 22) {
  if (!name || name.length <= max) return name
  const half = Math.floor((max - 3) / 2)
  return `${name.slice(0, half + 2)}…${name.slice(-half)}`
}

function StatPill({ label, value, accent }) {
  return (
    <div style={{
      background: accent ? 'var(--accent-soft)' : 'var(--stat-bg)',
      border: `0.5px solid ${accent ? 'var(--border-accent)' : 'var(--stat-border)'}`,
      borderRadius: 'var(--radius-lg)', padding: '0.875rem 1.25rem',
      display: 'flex', flexDirection: 'column', gap: 4,
      flex: 1, minWidth: '6rem',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '1.625rem', fontWeight: 700,
        color: accent ? 'var(--accent)' : 'var(--text-primary)', lineHeight: 1,
      }}>{value ?? '—'}</div>
      <div style={{
        fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>{label}</div>
    </div>
  )
}

function SectionLabel({ children, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
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

function MiniBar({ value, max = 5 }) {
  const pct   = value ? (value / max) * 100 : 0
  const color = value
    ? (value <= 2 ? confidenceColor(1) : value <= 3.5 ? confidenceColor(3) : confidenceColor(5))
    : 'var(--border)'
  return (
    <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'var(--bg-subtle)', marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: color, transition: 'width 0.3s ease' }} />
    </div>
  )
}

function PositionComfortBadge({ value }) {
  if (value == null) return (
    <div style={{
      padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-sm)',
      border: '0.5px solid var(--border)', background: 'var(--bg-subtle)',
      fontSize: '0.6875rem', color: 'var(--text-muted)',
      fontFamily: 'var(--font-display)', display: 'inline-flex', alignItems: 'center',
    }}>—</div>
  )
  const color = value <= 2 ? confidenceColor(1) : value <= 3.5 ? confidenceColor(3) : confidenceColor(5)
  return (
    <div style={{
      padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-sm)',
      border: `1px solid ${color}20`, background: `${color}10`,
      fontSize: '0.75rem', fontWeight: 700, color,
      fontFamily: 'var(--font-display)', display: 'inline-flex', alignItems: 'center',
    }}>{value.toFixed(1)}</div>
  )
}

function ChainDashboardCard({ chain, athletes, matrix, positionComfort, compReady, onAthleteClick }) {
  const moves = chain.moves || []
  if (moves.length === 0) return null

  const chainPositionIds = new Set()
  moves.forEach(m => {
    if (m.from_position?.id) chainPositionIds.add(m.from_position.id)
    if (m.to_position?.id)   chainPositionIds.add(m.to_position.id)
  })
  const chainPositions = [...chainPositionIds].map(pid =>
    moves.find(m => m.from_position?.id === pid)?.from_position ||
    moves.find(m => m.to_position?.id   === pid)?.to_position
  ).filter(Boolean)

  const squadConfs = []
  const moveSquadAvgs = moves.map((move) => {
    const confs = athletes.map(a => matrix[a.id]?.[move.id]?.confidence).filter(Boolean)
    const avg   = confs.length > 0 ? confs.reduce((a, b) => a + b, 0) / confs.length : null
    confs.forEach(c => squadConfs.push(c))
    return { move, avg }
  })
  const squadAvg = squadConfs.length > 0
    ? (squadConfs.reduce((a, b) => a + b, 0) / squadConfs.length).toFixed(1)
    : null
  const weakest = moveSquadAvgs.filter(m => m.avg !== null).sort((a, b) => a.avg - b.avg)[0]

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      {/* Chain header */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: '0.25rem',
      }}>
        <div style={{
          fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
        }}>{chain.name}</div>
        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          {moves.length} move{moves.length !== 1 ? 's' : ''} · {athletes.length} athlete{athletes.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Flow breadcrumb */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap',
        gap: '0.1rem', marginBottom: '0.75rem',
      }}>
        {moves.map((move, i) => (
          <div key={`flow-${move.id}-${i}`} style={{ display: 'flex', alignItems: 'center' }}>
            {i === 0 && move.from_position && (
              <>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{move.from_position.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 0.2rem' }}>→</span>
              </>
            )}
            <span
              title={move.name}
              style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-move)' }}
            >{truncateName(move.name, 18)}</span>
            {i < moves.length - 1 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 0.2rem' }}>→</span>
            )}
            {i === moves.length - 1 && move.to_position && (
              <>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 0.2rem' }}>→</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{move.to_position.name}</span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Athlete rows */}
      {athletes.map(athlete => {
        const ap               = matrix[athlete.id] || {}
        const athleteCompReady = compReady[athlete.id] || []
        const confs            = moves.map(m => ap[m.id]?.confidence).filter(Boolean)
        const avg              = confs.length > 0
          ? (confs.reduce((a, b) => a + b, 0) / confs.length).toFixed(1)
          : null
        const avgNum        = avg ? parseFloat(avg) : 0
        const borderColor   = avg
          ? (avgNum <= 2 ? confidenceColor(1) : avgNum <= 3.5 ? confidenceColor(3) : confidenceColor(5))
          : 'var(--border)'
        const ratedCount    = confs.length
        const completionPct = (ratedCount / moves.length) * 100
        const hasFavourite  = moves.some(m => ap[m.id]?.is_favourite)
        const compReadyCount = moves.filter(m => athleteCompReady.includes(m.id)).length

        return (
          <div key={athlete.id} style={{
            background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
            borderLeft: `3px solid ${borderColor}`, borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem', marginBottom: '0.375rem',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <button
                  onClick={() => onAthleteClick(athlete.id)}
                  style={{
                    fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)',
                    background: 'none', border: 'none', padding: 0,
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    textDecoration: 'underline', textDecorationColor: 'var(--border)',
                    textUnderlineOffset: 3,
                  }}
                >{athlete.display_name || 'Unnamed'}</button>
                {hasFavourite && <span style={{ fontSize: '0.875rem', color: 'var(--comp-ready)' }}>★</span>}
                {compReadyCount > 0 && (
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 600, color: 'var(--comp-ready)',
                    background: 'var(--comp-ready-soft)', border: '0.5px solid var(--comp-ready-border)',
                    borderRadius: 20, padding: '1px 6px', letterSpacing: '0.06em',
                  }}>⬡ {compReadyCount} comp ready</span>
                )}
              </div>
              {avg && (
                <div style={{
                  padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${borderColor}`, background: `${borderColor}12`,
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: '0.75rem', color: borderColor,
                }}>avg {avg}</div>
              )}
            </div>

            {/* Move pills */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0, marginBottom: '0.5rem' }}>
              {moves.map((move, i) => {
                const data        = ap[move.id]
                const conf        = data?.confidence
                const color       = conf ? confidenceColor(conf) : 'var(--border)'
                const bg          = conf ? confidenceBg(conf)    : 'var(--bg-subtle)'
                const isCompReady = athleteCompReady.includes(move.id)

                return (
                  <div key={`${move.id}-${i}`} style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      title={move.name}
                      style={{
                        background: bg, border: `1.5px solid ${color}`,
                        boxShadow: isCompReady ? `0 0 0 1.5px var(--comp-ready)` : 'none',
                        borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.5rem',
                        fontSize: '0.6875rem', fontWeight: 500,
                        color: conf ? color : 'var(--text-secondary)',
                        whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem',
                      }}
                    >
                      {truncateName(move.name)}
                      {conf ? (
                        <span style={{ fontWeight: 700, fontSize: 11, fontFamily: 'var(--font-display)', opacity: 0.9 }}>
                          {conf}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                      )}
                      {isCompReady && <span style={{ fontSize: 11, color: 'var(--comp-ready)' }}>⬡</span>}
                    </div>
                    {i < moves.length - 1 && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', padding: '0 0.2rem', flexShrink: 0 }}>→</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1, height: '0.1875rem', borderRadius: '0.125rem', background: 'var(--bg-subtle)' }}>
                <div style={{
                  width: `${completionPct}%`, height: '100%', borderRadius: '0.125rem',
                  background: borderColor, transition: 'width 0.3s ease',
                }} />
              </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {ratedCount} of {moves.length} rated
                </span>
            </div>
          </div>
        )
      })}

      {/* Squad summary */}
      <div style={{
        background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '0.625rem 1rem', marginTop: '0.25rem',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap',
          gap: '0.75rem', fontSize: '0.6875rem', color: 'var(--text-secondary)',
        }}>
          {squadAvg && (
            <span>Squad avg{' '}
              <strong style={{
                fontFamily: 'var(--font-display)',
                color: parseFloat(squadAvg) <= 2 ? confidenceColor(1)
                  : parseFloat(squadAvg) <= 3.5 ? confidenceColor(3) : confidenceColor(5),
              }}>{squadAvg}</strong>
            </span>
          )}
          {weakest?.avg != null && (
            <span>Weakest: <strong style={{ color: 'var(--text-primary)' }}>{weakest.move.name}</strong>{' '}
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                color: confidenceColor(Math.round(weakest.avg)),
              }}>({weakest.avg.toFixed(1)})</span>
            </span>
          )}
          {chainPositions.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {chainPositions.map(pos => {
                const values = athletes.map(a => positionComfort[a.id]?.[pos.id]).filter(Boolean)
                const avg    = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null
                const color  = avg
                  ? (avg <= 2 ? confidenceColor(1) : avg <= 3.5 ? confidenceColor(3) : confidenceColor(5))
                  : 'var(--text-muted)'
                return (
                  <span key={pos.id} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    {pos.name}{' '}
                    <strong style={{ fontFamily: 'var(--font-display)', color }}>
                      {avg ? avg.toFixed(1) : '—'}
                    </strong>
                  </span>
                )
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function FlatMatrix({ athletes, moves, matrix, athleteAggregates, moveAggregates, squadAvg, compReady, onAthleteClick }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 360px)' }}>
        <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%', fontFamily: 'var(--font-body)' }}>
          <thead>
            <tr>
              <th style={{
                position: 'sticky', top: 0, left: 0, zIndex: 3,
                background: 'var(--bg-subtle)', padding: '0.625rem 0.875rem',
                textAlign: 'left', fontSize: '0.625rem', fontWeight: 600,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)',
                minWidth: '10rem',
              }}>Athlete</th>
              <th style={{
                position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg-subtle)',
                padding: '0.625rem 0.5rem', textAlign: 'center', fontSize: '0.625rem',
                fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)',
                minWidth: '3.125rem',
              }}>Avg</th>
              {moves.map(move => (
                <th key={move.id} title={move.name} style={{
                  position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg-subtle)',
                  padding: '0.625rem 0.375rem', textAlign: 'center',
                  fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-secondary)',
                  borderBottom: '0.5px solid var(--border)',
                  minWidth: '4.375rem', maxWidth: '5.625rem',
                }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {truncateName(move.name, 14)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {athletes.map((athlete, i) => {
              const agg              = athleteAggregates[athlete.id]
              const athleteCompReady = compReady[athlete.id] || []
              const even             = i % 2 === 0
              return (
                <tr key={athlete.id} style={{ background: even ? 'transparent' : 'var(--bg-subtle)' }}>
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 1,
                    background: even ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                    padding: '0.5rem 0.875rem', borderBottom: '0.5px solid var(--border)',
                    whiteSpace: 'nowrap', minWidth: '10rem',
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
                  <td style={{ padding: '0.5rem 0.375rem', textAlign: 'center', borderBottom: '0.5px solid var(--border)' }}>
                    {agg?.avg_confidence != null ? (
                      <span style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8125rem',
                        color: agg.avg_confidence <= 2 ? confidenceColor(1)
                          : agg.avg_confidence <= 3.5 ? confidenceColor(3) : confidenceColor(5),
                      }}>{agg.avg_confidence.toFixed(1)}</span>
                    ) : <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  {moves.map(move => {
                    const data        = matrix[athlete.id]?.[move.id]
                    const isCompReady = athleteCompReady.includes(move.id)
                    if (!data) return (
                      <td key={move.id} style={{ padding: '0.5rem 0.375rem', textAlign: 'center', borderBottom: '0.5px solid var(--border)' }}>
                        <div style={{
                          width: '1.625rem', height: '1.625rem', borderRadius: 'var(--radius-sm)',
                          border: '0.5px solid var(--border)', background: 'var(--bg-subtle)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.6875rem', color: 'var(--text-muted)',
                        }}>·</div>
                      </td>
                    )
                    const conf = data.confidence
                    return (
                      <td key={move.id} style={{ padding: '0.5rem 0.375rem', textAlign: 'center', borderBottom: '0.5px solid var(--border)' }}>
                        <div style={{ position: 'relative', display: 'inline-flex' }}>
                          {isCompReady && (
                            <div style={{
                              position: 'absolute', inset: -3,
                              borderRadius: 'calc(var(--radius-sm) + 2px)',
                              border: '1.5px solid var(--comp-ready)', boxShadow: '0 0 6px var(--comp-ready-border)',
                              pointerEvents: 'none', zIndex: 1,
                            }} />
                          )}
                          <div style={{
                            width: '1.625rem', height: '1.625rem', borderRadius: 'var(--radius-sm)',
                            border: `1.5px solid ${confidenceColor(conf)}`,
                            background: confidenceBg(conf), color: confidenceColor(conf),
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.6875rem', fontWeight: 700, fontFamily: 'var(--font-display)',
                          }}>{conf}</div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            <tr style={{ background: 'var(--bg-subtle)' }}>
              <td style={{
                position: 'sticky', left: 0, zIndex: 1, background: 'var(--bg-subtle)',
                padding: '0.625rem 0.875rem', fontSize: '0.625rem', fontWeight: 600,
                letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)',
                borderTop: '1.5px solid var(--border-strong)',
              }}>Squad Avg</td>
              <td style={{ padding: '0.5rem 0.375rem', textAlign: 'center', borderTop: '1.5px solid var(--border-strong)' }}>
                {squadAvg
                  ? <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{squadAvg}</span>
                  : <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>—</span>}
              </td>
              {moves.map(move => {
                const agg = moveAggregates[move.id]
                return (
                  <td key={move.id} style={{ padding: '0.5rem 0.375rem', textAlign: 'center', borderTop: '1.5px solid var(--border-strong)' }}>
                    {agg?.avg_confidence != null
                      ? <span style={{
                          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem',
                          color: agg.avg_confidence <= 2 ? confidenceColor(1)
                            : agg.avg_confidence <= 3.5 ? confidenceColor(3) : confidenceColor(5),
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

function PositionComfortSection({ athletes, positions, positionComfort, squadPositionComfort }) {
  if (!positions || positions.length === 0) return null
  return (
    <div style={{ marginTop: '1.75rem' }}>
      <SectionLabel count={positions.length}>Position Comfort</SectionLabel>
      <div style={{
        background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', padding: '0.625rem 1rem 0.375rem',
            borderBottom: '0.5px solid var(--border)',
            minWidth: `calc(10rem + ${positions.length} * 5.625rem)`,
          }}>
            <div style={{
              width: '10rem', flexShrink: 0, fontSize: '0.625rem', fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)',
            }}>Athlete</div>
            {positions.map(pos => (
              <div key={pos.id} style={{
                width: '5.625rem', flexShrink: 0, fontSize: '0.625rem', fontWeight: 500,
                color: 'var(--text-secondary)', textAlign: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{pos.name}</div>
            ))}
          </div>
          {athletes.map((athlete, ai) => (
            <div key={athlete.id} style={{
              display: 'flex', alignItems: 'center', padding: '0.5rem 1rem',
              background: ai % 2 === 0 ? 'transparent' : 'var(--bg-subtle)',
              borderBottom: '0.5px solid var(--border)',
              minWidth: `calc(10rem + ${positions.length} * 5.625rem)`,
            }}>
              <div style={{
                width: '10rem', flexShrink: 0, fontSize: '0.8125rem', fontWeight: 500,
                color: 'var(--text-primary)', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{athlete.display_name || 'Unnamed'}</div>
              {positions.map(pos => (
                <div key={pos.id} style={{ width: '5.625rem', flexShrink: 0, textAlign: 'center' }}>
                  <PositionComfortBadge value={positionComfort[athlete.id]?.[pos.id] ?? null} />
                </div>
              ))}
            </div>
          ))}
          <div style={{
            display: 'flex', alignItems: 'center', padding: '0.625rem 1rem',
            borderTop: '1.5px solid var(--border-strong)',
            minWidth: `calc(10rem + ${positions.length} * 5.625rem)`,
          }}>
            <div style={{
              width: '10rem', flexShrink: 0, fontSize: '0.625rem', fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)',
            }}>Squad Avg</div>
            {positions.map(pos => (
              <div key={pos.id} style={{ width: '5.625rem', flexShrink: 0, textAlign: 'center' }}>
                <PositionComfortBadge value={squadPositionComfort[pos.id] ?? null} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptySquad({ clubName, inviteCode }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '2.5rem 1.5rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🤼</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600,
        color: 'var(--text-primary)', marginBottom: '0.375rem',
      }}>No athletes yet</div>
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

export default function DashboardPage() {
  const navigate    = useNavigate()
  const [club, setClub]                     = useState(null)
  const [dashboard, setDashboard]           = useState(null)
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)
  const [curricula, setCurricula]           = useState([])
  const [selectedCurriculum, setSelected]   = useState(null)

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
  const moveNameById = useMemo(() => {
    const map = {}
    if (dashboard?.moves) {
      dashboard.moves.forEach(m => { map[m.id] = m.name })
    }
    return map
  }, [dashboard?.moves])

  const handleCurriculumChange = (currId) => {
    const val = currId || null
    setSelected(val)
    reloadDashboard(val)
  }

  const handleAthleteClick = (athleteId) => navigate(`/athletes/${athleteId}`)

  if (loading) return (
    <div style={{ maxWidth: '60rem', margin: '0 auto', padding: '1.75rem 2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            height: '3.25rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
            animation: 'pulse 1.4s ease infinite', animationDelay: `${i * 0.1}s`,
          }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ maxWidth: '60rem', margin: '0 auto', padding: '1.75rem 2rem' }}>
      <div style={{
        background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
        borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
        fontSize: '0.8125rem', color: 'var(--accent)',
      }}>{error}</div>
    </div>
  )

  if (!club) return (
    <div style={{ maxWidth: '60rem', margin: '0 auto', padding: '1.75rem 2rem' }}>
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

  const athleteAggs    = Object.values(athlete_aggregates)
  const ratedAthletes  = athleteAggs.filter(a => a.avg_confidence != null)
  const totalRatings   = athleteAggs.reduce((s, a) => s + a.rated_count, 0)
  const squadAvg       = ratedAthletes.length > 0
    ? (ratedAthletes.reduce((s, a) => s + a.avg_confidence, 0) / ratedAthletes.length).toFixed(1)
    : null
  const weakCount      = Object.values(move_aggregates).filter(v => v.avg_confidence != null && v.avg_confidence <= 2).length
  const isCurriculumView = selectedCurriculum && chains && chains.length > 0

  return (
    <div style={{ maxWidth: '60rem', margin: '0 auto', padding: '1.75rem 2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
        }}>Squad Dashboard</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700,
          letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0,
        }}>{club.name}</h1>
      </div>

      {/* ───────── Squad Insights ───────── */}
      {insights && (insights.weakest || insights.strongest || insights.most_inconsistent) && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{
            fontSize: '0.625rem',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '0.75rem',
          }}>
            Squad Insights
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

            {insights.weakest && (
              <div style={{ fontSize: '0.875rem' }}>
                ⚠ Weakest move:{' '}
                <strong>{moveNameById[insights.weakest.move_id]}</strong>{' '}
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  color: 'var(--accent)',
                }}>
                  ({insights.weakest.avg_confidence})
                </span>
              </div>
            )}

            {insights.strongest && (
              <div style={{ fontSize: '0.875rem' }}>
                🏆 Strongest move:{' '}
                <strong>{moveNameById[insights.strongest.move_id]}</strong>{' '}
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  color: 'var(--success)',
                }}>
                  ({insights.strongest.avg_confidence})
                </span>
              </div>
            )}

            {insights.most_inconsistent && (
              <div style={{ fontSize: '0.875rem' }}>
                📊 Most inconsistent:{' '}
                <strong>{moveNameById[insights.most_inconsistent.move_id]}</strong>{' '}
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                }}>
                  ({insights.most_inconsistent.spread} spread)
                </span>
              </div>
            )}

          </div>
        </div>
      )}

      {athletes.length === 0 ? <EmptySquad clubName={club.name} inviteCode={club.invite_code} /> : (
        <>
          <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
            <StatPill label="Athletes"   value={athletes.length} />
            <StatPill label="Ratings"    value={totalRatings} />
            <StatPill label="Squad Avg"  value={squadAvg} />
            <StatPill label="Moves"      value={moves.length} />
            {weakCount > 0 && <StatPill label="Weak Moves" value={weakCount} accent />}
          </div>

          {curricula.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>Filter</span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleCurriculumChange(null)}
                  style={{
                    padding: '0.25rem 0.625rem', fontSize: '0.6875rem', fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: `0.5px solid ${!selectedCurriculum ? 'var(--accent)' : 'var(--border)'}`,
                    background: !selectedCurriculum ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                    color: !selectedCurriculum ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    transition: 'all var(--transition)',
                  }}>All moves</button>
                {curricula.map(c => (
                  <button key={c.id}
                    onClick={() => handleCurriculumChange(c.id)}
                    style={{
                      padding: '0.25rem 0.625rem', fontSize: '0.6875rem', fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: `0.5px solid ${selectedCurriculum === c.id ? 'var(--move-color)' : 'var(--border)'}`,
                      background: selectedCurriculum === c.id ? 'var(--move-soft)' : 'var(--bg-subtle)',
                      color: selectedCurriculum === c.id ? 'var(--move-color)' : 'var(--text-muted)',
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                      transition: 'all var(--transition)',
                    }}>{c.name}</button>
                ))}
              </div>
            </div>
          )}

          {isCurriculumView ? (
            <>
              <SectionLabel count={chains.length}>Chains</SectionLabel>
              {chains.map(chain => (
                <ChainDashboardCard
                  key={chain.id}
                  chain={chain}
                  athletes={athletes}
                  matrix={matrix}
                  positionComfort={position_comfort}
                  compReady={comp_ready}
                  onAthleteClick={handleAthleteClick}
                />
              ))}
            </>
          ) : (
            <>
              <SectionLabel count={`${athletes.length} × ${moves.length}`}>
                Progress Matrix
              </SectionLabel>
              <FlatMatrix
                athletes={athletes}
                moves={moves}
                matrix={matrix}
                athleteAggregates={athlete_aggregates}
                moveAggregates={move_aggregates}
                squadAvg={squadAvg}
                compReady={comp_ready}
                onAthleteClick={handleAthleteClick}
              />
            </>
          )}

          <PositionComfortSection
            athletes={athletes}
            positions={positions}
            positionComfort={position_comfort}
            squadPositionComfort={squad_position_comfort}
          />
        </>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}

// easter egg or smn
