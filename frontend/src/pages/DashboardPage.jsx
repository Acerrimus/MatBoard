import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMyClub, getClubDashboard, getCurricula } from '../api'
import { confidenceColor, confidenceBg } from '../components/MoveCard'

function StatPill({ label, value, accent }) {
  return (
    <div style={{
      background: accent ? 'var(--accent-soft)' : 'var(--stat-bg)',
      border: `0.5px solid ${accent ? 'var(--border-accent)' : 'var(--stat-border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '14px 20px',
      display: 'flex', flexDirection: 'column', gap: 4,
      flex: 1, minWidth: 100,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
        color: accent ? 'var(--accent)' : 'var(--text-primary)', lineHeight: 1,
      }}>{value ?? '—'}</div>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>{label}</div>
    </div>
  )
}

function SectionLabel({ children, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>{children}</div>
      {count !== undefined && (
        <div style={{
          fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
          background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
          borderRadius: 20, padding: '1px 7px',
        }}>{count}</div>
      )}
    </div>
  )
}

function MiniBar({ value, max = 5 }) {
  const pct = value ? (value / max) * 100 : 0
  const color = value ? (value <= 2 ? confidenceColor(1) : value <= 3.5 ? confidenceColor(3) : confidenceColor(5)) : 'var(--border)'
  return (
    <div style={{
      width: '100%', height: 3, borderRadius: 2,
      background: 'var(--bg-subtle)', marginTop: 4,
    }}>
      <div style={{
        width: `${pct}%`, height: '100%', borderRadius: 2,
        background: color, transition: 'width 0.3s ease',
      }} />
    </div>
  )
}

function ConfidenceCell({ data }) {
  if (!data) {
    return (
      <div style={{
        width: 48, padding: '6px 4px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 'var(--radius-sm)',
          border: '0.5px solid var(--border)', background: 'var(--bg-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)',
        }}>·</div>
        <MiniBar value={null} />
      </div>
    )
  }
  const conf = data.confidence
  return (
    <div style={{
      width: 48, padding: '6px 4px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', flexShrink: 0,
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 'var(--radius-sm)',
          border: `1.5px solid ${confidenceColor(conf)}`, background: confidenceBg(conf),
          color: confidenceColor(conf), display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 11, fontWeight: 700,
          fontFamily: 'var(--font-display)',
        }}>{conf}</div>
        {data.is_favourite && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            fontSize: 8, lineHeight: 1,
          }}>★</div>
        )}
      </div>
      <MiniBar value={conf} />
    </div>
  )
}

function PositionComfortBadge({ value }) {
  if (value == null) return (
    <div style={{
      padding: '4px 10px', borderRadius: 'var(--radius-sm)',
      border: '0.5px solid var(--border)', background: 'var(--bg-subtle)',
      fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>—</div>
  )
  const color = value <= 2 ? confidenceColor(1) : value <= 3.5 ? confidenceColor(3) : confidenceColor(5)
  return (
    <div style={{
      padding: '4px 10px', borderRadius: 'var(--radius-sm)',
      border: `1px solid ${color}20`, background: `${color}10`,
      fontSize: 12, fontWeight: 700, color,
      fontFamily: 'var(--font-display)',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {value.toFixed(1)}
    </div>
  )
}

function ChainDashboardCard({ chain, athletes, matrix, positionComfort }) {
  const moves = chain.moves || []
  if (moves.length === 0) return null

  const chainPositionIds = new Set()
  moves.forEach(m => {
    if (m.from_position?.id) chainPositionIds.add(m.from_position.id)
    if (m.to_position?.id) chainPositionIds.add(m.to_position.id)
  })
  const chainPositions = [...chainPositionIds].map(pid => {
    const pos = moves.find(m => m.from_position?.id === pid)?.from_position
      || moves.find(m => m.to_position?.id === pid)?.to_position
    return pos
  }).filter(Boolean)

  const NAME_COL = '9rem'
  const cellFr = `repeat(${moves.length}, 1fr)`
  const gridCols = `${NAME_COL} ${cellFr}`

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      {/* Chain name + flow — outside card */}
      <div style={{ marginBottom: '0.4rem' }}>
        <div style={{
          fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)', marginBottom: '0.25rem',
        }}>{chain.name}</div>
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.15rem',
        }}>
          {moves.map((move, i) => (
            <div key={`flow-${move.id}-${i}`} style={{ display: 'flex', alignItems: 'center' }}>
              {i === 0 && move.from_position && (
                <>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {move.from_position.name}
                  </span>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', padding: '0 0.2rem' }}>→</span>
                </>
              )}
              <span style={{ fontSize: '0.55rem', fontWeight: 500, color: 'var(--text-move)' }}>
                {move.name}
              </span>
              {i < moves.length - 1 && (
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', padding: '0 0.2rem' }}>→</span>
              )}
              {i === moves.length - 1 && move.to_position && (
                <>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', padding: '0 0.2rem' }}>→</span>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {move.to_position.name}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
        borderLeft: '3px solid var(--move-color)',
        borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem',
      }}>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: gridCols,
          paddingBottom: '0.5rem',
          borderBottom: '0.5px solid var(--border)',
          alignItems: 'end',
        }}>
          <div style={{
            fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
          }}>Athlete</div>
          {moves.map((move, i) => (
            <div key={`hdr-${move.id}-${i}`} style={{
              textAlign: 'center', fontSize: '0.65rem', fontWeight: 600,
              color: 'var(--text-secondary)', padding: '0 0.125rem',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{move.name}</div>
          ))}
        </div>

        {/* Athlete rows */}
        {athletes.map((athlete, ai) => {
          const ap = matrix[athlete.id] || {}
          const confs = moves.map(m => ap[m.id]?.confidence).filter(Boolean)
          const avg = confs.length > 0
            ? (confs.reduce((a, b) => a + b, 0) / confs.length).toFixed(1)
            : null
          const avgColor = avg
            ? (parseFloat(avg) <= 2 ? confidenceColor(1) : parseFloat(avg) <= 3.5 ? confidenceColor(3) : confidenceColor(5))
            : 'var(--text-muted)'

          return (
            <div key={athlete.id} style={{
              display: 'grid', gridTemplateColumns: gridCols,
              alignItems: 'center',
              padding: '0.5rem 0',
              borderBottom: '0.5px solid var(--border)',
              background: ai % 2 !== 0 ? 'var(--bg-subtle)' : 'transparent',
            }}>
              {/* Name + avg */}
              <div>
                <div style={{
                  fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{athlete.display_name || 'Unnamed'}</div>
                <div style={{
                  fontSize: '0.6rem', fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: avgColor, marginTop: '0.1rem',
                }}>avg {avg || '—'}</div>
              </div>

              {/* Cells */}
              {moves.map((move, mi) => {
                const data = ap[move.id]
                const conf = data?.confidence
                const color = conf ? confidenceColor(conf) : 'var(--border)'
                const bg = conf ? confidenceBg(conf) : 'var(--bg-subtle)'
                const barPct = conf ? (conf / 5) * 100 : 0

                return (
                  <div key={`${move.id}-${mi}`} style={{
                    display: 'flex', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: '2.75rem',
                      background: bg,
                      border: `1px solid ${color}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '0.35rem 0.2rem 0.25rem',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: '0.1rem',
                      position: 'relative',
                    }}>
                      {data?.is_favourite && (
                        <div style={{
                          position: 'absolute', top: '-0.15rem', right: '-0.15rem',
                          fontSize: '0.85rem', color: '#FDE047', lineHeight: 1,
                        }}>★</div>
                      )}
                      <div style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700,
                        fontSize: '1rem', color: conf ? color : 'var(--text-muted)',
                        lineHeight: 1,
                      }}>{conf || '·'}</div>
                      <div style={{
                        width: '80%', height: '0.15rem', borderRadius: '0.075rem',
                        background: 'var(--bg-page)', marginTop: '0.05rem',
                      }}>
                        <div style={{
                          width: `${barPct}%`, height: '100%', borderRadius: '0.075rem',
                          background: conf ? color : 'transparent',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* Squad avg row */}
        <div style={{
          display: 'grid', gridTemplateColumns: gridCols,
          alignItems: 'center',
          padding: '0.5rem 0 0.25rem',
          borderTop: '1.5px solid var(--border-strong)',
        }}>
          <div style={{
            fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
          }}>Squad Avg</div>
          {moves.map((move, mi) => {
            const confs = athletes.map(a => matrix[a.id]?.[move.id]?.confidence).filter(Boolean)
            const avg = confs.length > 0 ? (confs.reduce((a, b) => a + b, 0) / confs.length).toFixed(1) : null
            const color = avg
              ? (parseFloat(avg) <= 2 ? confidenceColor(1) : parseFloat(avg) <= 3.5 ? confidenceColor(3) : confidenceColor(5))
              : 'var(--text-muted)'
            return (
              <div key={`avg-${move.id}-${mi}`} style={{
                textAlign: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '0.8rem', color,
              }}>{avg || '—'}</div>
            )
          })}
        </div>

        {/* Position comfort */}
        {chainPositions.length > 0 && (
          <div style={{
            marginTop: '0.75rem', paddingTop: '0.75rem',
            borderTop: '0.5px solid var(--border)',
          }}>
            <div style={{
              fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem',
            }}>Position Comfort</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {chainPositions.map(pos => {
                const values = athletes
                  .map(a => positionComfort[a.id]?.[pos.id])
                  .filter(Boolean)
                const avg = values.length > 0
                  ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
                  : null
                return (
                  <div key={pos.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {pos.name}
                    </span>
                    <PositionComfortBadge value={avg ? parseFloat(avg) : null} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FlatMatrix({ athletes, moves, matrix, athleteAggregates, moveAggregates, squadAvg }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 360px)' }}>
        <table style={{
          borderCollapse: 'collapse', width: 'max-content',
          minWidth: '100%', fontFamily: 'var(--font-body)',
        }}>
          <thead>
            <tr>
              <th style={{
                position: 'sticky', top: 0, left: 0, zIndex: 3,
                background: 'var(--bg-subtle)', padding: '10px 14px',
                textAlign: 'left', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)',
                minWidth: 160,
              }}>Athlete</th>
              <th style={{
                position: 'sticky', top: 0, zIndex: 2,
                background: 'var(--bg-subtle)', padding: '10px 8px',
                textAlign: 'center', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)',
                minWidth: 50,
              }}>Avg</th>
              {moves.map(move => (
                <th key={move.id} style={{
                  position: 'sticky', top: 0, zIndex: 2,
                  background: 'var(--bg-subtle)', padding: '10px 6px',
                  textAlign: 'center', fontSize: 11, fontWeight: 500,
                  color: 'var(--text-secondary)', borderBottom: '0.5px solid var(--border)',
                  minWidth: 70, maxWidth: 90,
                }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {move.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {athletes.map((athlete, i) => {
              const agg = athleteAggregates[athlete.id]
              const even = i % 2 === 0
              return (
                <tr key={athlete.id} style={{ background: even ? 'transparent' : 'var(--bg-subtle)' }}>
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 1,
                    background: even ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                    padding: '8px 14px', fontWeight: 500, fontSize: 13,
                    color: 'var(--text-primary)', borderBottom: '0.5px solid var(--border)',
                    whiteSpace: 'nowrap', minWidth: 160,
                  }}>{athlete.display_name || 'Unnamed'}</td>
                  <td style={{
                    padding: '8px 6px', textAlign: 'center',
                    borderBottom: '0.5px solid var(--border)',
                  }}>
                    {agg?.avg_confidence != null ? (
                      <span style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                        color: agg.avg_confidence <= 2 ? confidenceColor(1) : agg.avg_confidence <= 3.5 ? confidenceColor(3) : confidenceColor(5),
                      }}>{agg.avg_confidence.toFixed(1)}</span>
                    ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  {moves.map(move => {
                    const data = matrix[athlete.id]?.[move.id]
                    if (!data) {
                      return (
                        <td key={move.id} style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '0.5px solid var(--border)' }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                            border: '0.5px solid var(--border)', background: 'var(--bg-subtle)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)',
                          }}>·</div>
                        </td>
                      )
                    }
                    const conf = data.confidence
                    return (
                      <td key={move.id} style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '0.5px solid var(--border)' }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                          border: `1.5px solid ${confidenceColor(conf)}`, background: confidenceBg(conf),
                          color: confidenceColor(conf), display: 'inline-flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)',
                        }}>{conf}</div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            <tr style={{ background: 'var(--bg-subtle)' }}>
              <td style={{
                position: 'sticky', left: 0, zIndex: 1, background: 'var(--bg-subtle)',
                padding: '10px 14px', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--text-muted)',
                borderTop: '1.5px solid var(--border-strong)',
              }}>Squad Avg</td>
              <td style={{ padding: '8px 6px', textAlign: 'center', borderTop: '1.5px solid var(--border-strong)' }}>
                {squadAvg ? (
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{squadAvg}</span>
                ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
              </td>
              {moves.map(move => {
                const agg = moveAggregates[move.id]
                return (
                  <td key={move.id} style={{ padding: '8px 6px', textAlign: 'center', borderTop: '1.5px solid var(--border-strong)' }}>
                    {agg?.avg_confidence != null ? (
                      <span style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                        color: agg.avg_confidence <= 2 ? confidenceColor(1) : agg.avg_confidence <= 3.5 ? confidenceColor(3) : confidenceColor(5),
                      }}>{agg.avg_confidence.toFixed(1)}</span>
                    ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
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
    <div style={{ marginTop: 28 }}>
      <SectionLabel count={positions.length}>Position Comfort</SectionLabel>
      <div style={{
        background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', padding: '10px 16px 6px',
            borderBottom: '0.5px solid var(--border)',
            minWidth: 160 + positions.length * 90,
          }}>
            <div style={{
              width: 160, flexShrink: 0, fontSize: 10, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)',
            }}>Athlete</div>
            {positions.map(pos => (
              <div key={pos.id} style={{
                width: 90, flexShrink: 0, fontSize: 10, fontWeight: 500,
                color: 'var(--text-secondary)', textAlign: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{pos.name}</div>
            ))}
          </div>
          {athletes.map((athlete, ai) => (
            <div key={athlete.id} style={{
              display: 'flex', alignItems: 'center', padding: '8px 16px',
              background: ai % 2 === 0 ? 'transparent' : 'var(--bg-subtle)',
              borderBottom: '0.5px solid var(--border)',
              minWidth: 160 + positions.length * 90,
            }}>
              <div style={{
                width: 160, flexShrink: 0, fontSize: 13, fontWeight: 500,
                color: 'var(--text-primary)', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{athlete.display_name || 'Unnamed'}</div>
              {positions.map(pos => (
                <div key={pos.id} style={{ width: 90, flexShrink: 0, textAlign: 'center' }}>
                  <PositionComfortBadge value={positionComfort[athlete.id]?.[pos.id] ?? null} />
                </div>
              ))}
            </div>
          ))}
          <div style={{
            display: 'flex', alignItems: 'center', padding: '10px 16px',
            borderTop: '1.5px solid var(--border-strong)',
            minWidth: 160 + positions.length * 90,
          }}>
            <div style={{
              width: 160, flexShrink: 0, fontSize: 10, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)',
            }}>Squad Avg</div>
            {positions.map(pos => (
              <div key={pos.id} style={{ width: 90, flexShrink: 0, textAlign: 'center' }}>
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
      borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🤼</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600,
        color: 'var(--text-primary)', marginBottom: 6,
      }}>No athletes yet</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
        Share your invite code so athletes can join {clubName}.
      </div>
      <code style={{
        display: 'inline-block', padding: '8px 18px', background: 'var(--bg-subtle)',
        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
        fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)',
        letterSpacing: '0.15em', color: 'var(--accent)',
      }}>{inviteCode}</code>
    </div>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [club, setClub] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [curricula, setCurricula] = useState([])
  const [selectedCurriculum, setSelectedCurriculum] = useState(null)

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
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCurriculumChange = (currId) => {
    const val = currId || null
    setSelectedCurriculum(val)
    reloadDashboard(val)
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 52, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
              animation: 'pulse 1.4s ease infinite', animationDelay: `${i * 0.1}s`,
            }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px' }}>
        <div style={{
          background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 13, color: 'var(--accent)',
        }}>{error}</div>
      </div>
    )
  }

  if (!club) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px' }}>
        <div style={{
          background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 13, color: 'var(--accent)',
        }}>No club found. Create or join a club first.</div>
      </div>
    )
  }

  const {
    athletes, moves, chains, matrix,
    athlete_aggregates, move_aggregates,
    positions, position_comfort, squad_position_comfort,
  } = dashboard

  const athleteAggs = Object.values(athlete_aggregates)
  const ratedAthletes = athleteAggs.filter(a => a.avg_confidence != null)
  const totalRatings = athleteAggs.reduce((s, a) => s + a.rated_count, 0)
  const squadAvg = ratedAthletes.length > 0
    ? (ratedAthletes.reduce((s, a) => s + a.avg_confidence, 0) / ratedAthletes.length).toFixed(1)
    : null
  const weakMoves = Object.entries(move_aggregates).filter(([, v]) => v.avg_confidence != null && v.avg_confidence <= 2)
  const weakCount = weakMoves.length
  const isCurriculumView = selectedCurriculum && chains && chains.length > 0

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
        }}>Squad Dashboard</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
          letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0,
        }}>{club.name}</h1>
      </div>

      {athletes.length === 0 ? (
        <EmptySquad clubName={club.name} inviteCode={club.invite_code} />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
            <StatPill label="Athletes" value={athletes.length} />
            <StatPill label="Ratings" value={totalRatings} />
            <StatPill label="Squad Avg" value={squadAvg} />
            <StatPill label="Moves" value={moves.length} />
            {weakCount > 0 && <StatPill label="Weak Moves" value={weakCount} accent />}
          </div>

          {curricula.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>Filter</span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleCurriculumChange(null)}
                  style={{
                    padding: '4px 10px', fontSize: 11, fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: `0.5px solid ${!selectedCurriculum ? 'var(--accent)' : 'var(--border)'}`,
                    background: !selectedCurriculum ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                    color: !selectedCurriculum ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all var(--transition)',
                  }}>All moves</button>
                {curricula.map(c => (
                  <button key={c.id}
                    onClick={() => handleCurriculumChange(c.id)}
                    style={{
                      padding: '4px 10px', fontSize: 11, fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: `0.5px solid ${selectedCurriculum === c.id ? 'var(--move-color)' : 'var(--border)'}`,
                      background: selectedCurriculum === c.id ? 'var(--move-soft)' : 'var(--bg-subtle)',
                      color: selectedCurriculum === c.id ? 'var(--move-color)' : 'var(--text-muted)',
                      cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all var(--transition)',
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
                />
              ))}
            </>
          ) : (
            <>
              <SectionLabel count={`${athletes.length} × ${moves.length}`}>
                Progress Matrix
              </SectionLabel>
              <FlatMatrix
                athletes={athletes} moves={moves} matrix={matrix}
                athleteAggregates={athlete_aggregates}
                moveAggregates={move_aggregates} squadAvg={squadAvg}
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
    </div>
  )
}