import { useState, useEffect } from 'react'
import { getMyBoard, upsertProgress, deleteProgress, getMyChains } from '../api'
import { confidenceColor, confidenceBg } from '../components/MoveCard'

// ── Helpers ───────────────────────────────────────────────────────────────────
function avg(nums) {
  if (!nums.length) return null
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
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

// ── Section heading ───────────────────────────────────────────────────────────
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

// ── Inline confidence selector ────────────────────────────────────────────────
function InlineConfidence({ value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          onClick={() => !disabled && onChange(i)}
          title={['', 'Beginner', 'Developing', 'Competent', 'Proficient', 'Expert'][i]}
          style={{
            width: 26,
            height: 26,
            borderRadius: 'var(--radius-sm)',
            border: `1.5px solid ${i === value ? confidenceColor(i) : 'var(--border)'}`,
            background: i === value ? confidenceBg(i) : 'var(--bg-subtle)',
            color: i === value ? confidenceColor(i) : 'var(--text-muted)',
            fontSize: 11,
            fontWeight: 700,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all var(--transition)',
            fontFamily: 'var(--font-display)',
            flexShrink: 0,
          }}
        >
          {i}
        </button>
      ))}
    </div>
  )
}

// ── Progress move row ─────────────────────────────────────────────────────────
function MoveRow({ item, onProgressChange }) {
  const [saving, setSaving] = useState(false)

  const move       = item.move
  const confidence = item.progress?.confidence   ?? null
  const isFav      = item.progress?.is_favourite ?? false

  const handleConfidence = async (val) => {
    setSaving(true)
    try {
      if (val === confidence) {
        // clear confidence
        if (isFav) {
          const updated = await upsertProgress(move.id, null, true)
          onProgressChange(move.id, updated)
        } else {
          await deleteProgress(move.id)
          onProgressChange(move.id, null)
        }
      } else {
        const updated = await upsertProgress(move.id, val, isFav)
        onProgressChange(move.id, updated)
      }
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleFav = async () => {
    setSaving(true)
    try {
      const newFav = !isFav
      if (!newFav && confidence === null) {
        await deleteProgress(move.id)
        onProgressChange(move.id, null)
      } else {
        const updated = await upsertProgress(move.id, confidence, newFav)
        onProgressChange(move.id, updated)
      }
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const borderLeft = `3px solid ${confidence ? confidenceColor(confidence) : 'var(--border)'}`

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderLeft,
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 6,
      transition: 'border-color var(--transition)',
      opacity: saving ? 0.6 : 1,
    }}>
      {/* Move name + position */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {move.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {move.from_position?.name ?? '—'} → {move.to_position?.name ?? '—'}
        </div>
      </div>

      {/* Confidence */}
      <InlineConfidence value={confidence} onChange={handleConfidence} disabled={saving} />

      {/* Favourite */}
      <button
        onClick={handleFav}
        disabled={saving}
        style={{
          background: isFav ? '#FEF9C3' : 'var(--bg-subtle)',
          border: `0.5px solid ${isFav ? '#FDE047' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)',
          width: 28,
          height: 28,
          fontSize: 13,
          cursor: saving ? 'not-allowed' : 'pointer',
          transition: 'all var(--transition)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isFav ? '★' : '☆'}
      </button>
    </div>
  )
}

// ── Chain card ────────────────────────────────────────────────────────────────
function ChainCard({ chain }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      marginBottom: 10,
    }}>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 10,
      }}>
        {chain.name}
      </div>

      {chain.moves.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No moves added yet
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
          {chain.moves.map((item, i) => {
            const confidence = item.progress?.confidence ?? null
            const color = confidenceColor(confidence)
            const bg    = confidence ? confidenceBg(confidence) : 'var(--bg-subtle)'
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  background: bg,
                  border: `1.5px solid ${color}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: confidence ? color : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                }}>
                  {item.move.name}
                  {confidence && (
                    <span style={{
                      marginLeft: 5,
                      fontSize: 10,
                      fontWeight: 700,
                      opacity: 0.8,
                    }}>
                      {confidence}
                    </span>
                  )}
                </div>
                {i < chain.moves.length - 1 && (
                  <div style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    padding: '0 4px',
                    flexShrink: 0,
                  }}>
                    →
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Chain weakness indicator */}
      {chain.moves.length > 0 && (() => {
        const confidences = chain.moves
          .map(m => m.progress?.confidence)
          .filter(Boolean)
        const weakLink = chain.moves.find(m => {
          const c = m.progress?.confidence
          return c && c <= 2
        })
        const unrated = chain.moves.filter(m => !m.progress?.confidence).length

        if (!weakLink && !unrated) return null

        return (
          <div style={{
            marginTop: 10,
            fontSize: 11,
            color: weakLink ? '#EF4444' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}>
            {weakLink
              ? `⚠ Weak link: ${weakLink.move.name} (${weakLink.progress.confidence}/5)`
              : `${unrated} move${unrated > 1 ? 's' : ''} unrated`}
          </div>
        )
      })()}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyBoard() {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 6,
      }}>
        Your board is empty
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Head to the Graph and add moves to your board to start tracking your progress.
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const [boardItems, setBoardItems] = useState([])
  const [chains, setChains]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [filter, setFilter]         = useState('all') // 'all' | 'rated' | 'unrated' | 'weak'

  useEffect(() => {
    Promise.all([getMyBoard(), getMyChains()])
      .then(([board, chains]) => {
        setBoardItems(board)
        setChains(chains)
      })
      .catch(() => setError('Could not load progress data.'))
      .finally(() => setLoading(false))
  }, [])

  // ── Progress change ─────────────────────────────────────────────────────────
  const handleProgressChange = (moveId, progressData) => {
    setBoardItems(prev => prev.map(item => {
      if (item.move.id !== moveId) return item
      return { ...item, progress: progressData }
    }))
    // Also update chains
    setChains(prev => prev.map(chain => ({
      ...chain,
      moves: chain.moves.map(m =>
        m.move.id === moveId ? { ...m, progress: progressData } : m
      ),
    })))
  }

  // ── Derived stats ───────────────────────────────────────────────────────────
  const rated      = boardItems.filter(i => i.progress?.confidence)
  const unrated    = boardItems.filter(i => !i.progress?.confidence)
  const weak       = boardItems.filter(i => i.progress?.confidence <= 2)
  const favourites = boardItems.filter(i => i.progress?.is_favourite)
  const avgConf    = avg(rated.map(i => i.progress.confidence))

  // ── Filtered board ──────────────────────────────────────────────────────────
  const filteredItems = (() => {
    if (filter === 'rated')   return rated
    if (filter === 'unrated') return unrated
    if (filter === 'weak')    return weak
    return boardItems
  })()

  // ── Group board by from_position ────────────────────────────────────────────
  const grouped = filteredItems.reduce((acc, item) => {
    const key = item.move.from_position?.name ?? 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  if (loading) return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 32px' }}>
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
    </div>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 32px' }}>

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
          My Progress
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '-0.5px',
          color: 'var(--text-primary)',
        }}>
          Technique Tracker
        </h1>
      </div>

      {error && (
        <div style={{
          background: 'var(--accent-soft)',
          border: '0.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          fontSize: 13,
          color: 'var(--accent)',
          marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {boardItems.length === 0 && !loading ? (
        <EmptyBoard />
      ) : (
        <>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
            <StatPill label="On board"       value={boardItems.length} />
            <StatPill label="Rated"          value={rated.length} />
            <StatPill label="Avg confidence" value={avgConf} />
            <StatPill label="Favourites"     value={favourites.length} />
            {weak.length > 0 && (
              <StatPill label="Needs work" value={weak.length} accent />
            )}
          </div>

          {/* Chains */}
          {chains.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <SectionLabel count={chains.length}>My Chains</SectionLabel>
              {chains.map(chain => (
                <ChainCard key={chain.id} chain={chain} />
              ))}
            </div>
          )}

          {/* Favourites */}
          {favourites.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <SectionLabel count={favourites.length}>Favourites</SectionLabel>
              {favourites.map(item => (
                <MoveRow
                  key={item.move.id}
                  item={item}
                  onProgressChange={handleProgressChange}
                />
              ))}
            </div>
          )}

          {/* Board — with filter tabs */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <SectionLabel count={filteredItems.length}>All Board Moves</SectionLabel>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { key: 'all',     label: 'All'        },
                  { key: 'unrated', label: 'Unrated'    },
                  { key: 'weak',    label: 'Needs work' },
                  { key: 'rated',   label: 'Rated'      },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: `0.5px solid ${filter === tab.key ? 'var(--accent)' : 'var(--border)'}`,
                      background: filter === tab.key ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                      color: filter === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      transition: 'all var(--transition)',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--text-muted)',
                background: 'var(--bg-surface)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}>
                No moves in this category
              </div>
            ) : (
              Object.entries(grouped).map(([positionName, items]) => (
                <div key={positionName} style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    paddingLeft: 4,
                  }}>
                    From {positionName}
                  </div>
                  {items.map(item => (
                    <MoveRow
                      key={item.move.id}
                      item={item}
                      onProgressChange={handleProgressChange}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}