import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getMovesFromPosition, getMove, getMyBoard, getMyProgress, getGraph, createChain, setChainMoves } from '../api'
import MoveDetail from '../components/MoveDetail'
import { confidenceColor } from '../components/MoveCard'

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_POSITION = 'neutral'

const STYLE_LABELS = {
  folkstyle: 'Folkstyle',
  freestyle: 'Freestyle',
  greco:     'Greco-Roman',
}

const CONF_LABEL = (c) =>
  c >= 4 ? 'Strong' : c >= 3 ? 'Developing' : 'Needs work'

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ height = 68, style = {} }) {
  return (
    <div style={{
      height,
      background: 'var(--bg-subtle)',
      borderRadius: 10,
      animation: 'pulse 1.4s ease infinite',
      ...style,
    }} />
  )
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
function Breadcrumb({ trail, onNavigateTo }) {
  if (!trail.length) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: 12, color: 'var(--text-muted)',
      flexWrap: 'wrap', marginBottom: 20,
    }}>
      {trail.map((crumb, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && (
            <span style={{ color: 'var(--border-strong)', fontSize: 10 }}>›</span>
          )}
          {i < trail.length - 1 ? (
            <button
              onClick={() => onNavigateTo(i)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: 'var(--text-muted)', padding: 0,
                fontFamily: 'var(--font-body)',
                textDecoration: 'underline',
                textDecorationColor: 'var(--border-strong)',
              }}
            >
              {crumb.name}
            </button>
          ) : (
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {crumb.name}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}

// ── Position header ───────────────────────────────────────────────────────────
function PositionHeader({ position, moves, boardMoveIds, progressMap }) {
  const onBoard  = moves.filter(m => boardMoveIds.has(m.id)).length
  const confs    = moves.map(m => progressMap[m.id]?.confidence).filter(Boolean)
  const avgConf  = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null
  const confColor = avgConf ? confidenceColor(avgConf) : null

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderLeft: '3px solid #DC2626',
      borderRadius: 12,
      padding: '20px 22px',
      marginBottom: 20,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6,
      }}>
        Position
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
        letterSpacing: '-0.5px', color: 'var(--text-primary)', marginBottom: 14,
      }}>
        {position.name}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatPill label="Moves" value={moves.length} />
        {onBoard > 0 && <StatPill label="On board" value={onBoard} />}
        {avgConf && (
          <StatPill
            label="Avg confidence"
            value={CONF_LABEL(avgConf)}
            valueColor={confColor}
          />
        )}
      </div>
    </div>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, valueColor }) {
  return (
    <div style={{
      background: 'var(--bg-subtle)',
      border: '0.5px solid var(--border)',
      borderRadius: 8, padding: '7px 12px',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700,
        color: valueColor ?? 'var(--text-primary)', lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 3,
      }}>
        {label}
      </div>
    </div>
  )
}

// ── Move row ──────────────────────────────────────────────────────────────────
function MoveRow({ move, isExpanded, isOnBoard, confidence, onClick }) {
  const dotColor = confidence
    ? confidenceColor(confidence)
    : isOnBoard ? '#7C3AED' : 'var(--border-strong)'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: isExpanded ? 'var(--bg-surface)' : 'var(--bg-surface)',
        border: '0.5px solid',
        borderColor: isExpanded ? 'rgba(220,38,38,0.4)' : 'var(--border)',
        borderRadius: isExpanded ? '10px 10px 0 0' : 10,
        cursor: 'pointer',
        transition: 'all 0.12s',
        borderBottom: isExpanded ? '0.5px solid var(--border)' : undefined,
      }}
      onMouseEnter={e => {
        if (!isExpanded) e.currentTarget.style.borderColor = 'var(--border-strong)'
      }}
      onMouseLeave={e => {
        if (!isExpanded) e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      {/* Confidence indicator */}
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: isOnBoard ? 'rgba(59,130,246,0.08)' : 'var(--bg-subtle)',
        border: `1px solid ${isOnBoard ? 'rgba(59,130,246,0.2)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: dotColor,
        }} />
      </div>

      {/* Move name */}
      <span style={{
        flex: 1, fontSize: 14, fontWeight: isExpanded ? 600 : 500,
        color: isExpanded ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
      }}>
        {move.name}
      </span>

      {/* Confidence badge */}
      {confidence && (
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: confidenceColor(confidence),
          background: 'var(--bg-subtle)',
          border: `0.5px solid ${confidenceColor(confidence)}44`,
          borderRadius: 6, padding: '2px 7px', flexShrink: 0,
        }}>
          {confidence}/5
        </span>
      )}

      {/* Expand indicator */}
      <span style={{
        fontSize: 12, color: 'var(--text-muted)', flexShrink: 0,
        transform: isExpanded ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.15s',
      }}>
        ›
      </span>
    </div>
  )
}

// ── Chain bar ─────────────────────────────────────────────────────────────────
function ChainBar({ trail, onSave }) {
  const [showModal, setShowModal] = useState(false)
  // Trail has at least 2 entries to show (start position + at least one move navigated)
  if (trail.length < 2) return null

  return (
    <>
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 40,
        background: 'var(--bg-surface)',
        borderTop: '0.5px solid var(--border)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          flex: 1,
          fontSize: 11, color: 'var(--text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {trail.map(t => t.name).join(' → ')}
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            flexShrink: 0,
            background: 'var(--accent)', border: 'none',
            borderRadius: 8, padding: '8px 16px',
            fontSize: 12, fontWeight: 600, color: '#fff',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
          }}
        >
          Save chain
        </button>
      </div>

      {showModal && (
        <SaveChainModal
          trail={trail}
          onSave={(chain) => { onSave(chain); setShowModal(false) }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

// ── Save chain modal ──────────────────────────────────────────────────────────
function SaveChainModal({ trail, onSave, onClose }) {
  const [name, setName]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const moveIds = trail.flatMap(t => t.moveId ? [t.moveId] : [])
      const chain = await createChain(name.trim())
      await setChainMoves(chain.id, moveIds)
      onSave(chain)
    } catch {
      setError('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
        borderRadius: 14, padding: '1.75rem',
        width: 'min(380px, calc(100vw - 2rem))',
        margin: '0 1rem', boxSizing: 'border-box',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
          color: 'var(--text-primary)', marginBottom: 6,
        }}>
          Save as chain
        </div>
        <div style={{
          fontSize: 12, color: 'var(--text-muted)', marginBottom: 20,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {trail.map(t => t.name).join(' → ')}
        </div>
        <label style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'block', marginBottom: 6,
        }}>
          Chain name
        </label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="e.g. Tie-Up to Back Control"
          style={{
            width: '100%', padding: '9px 12px',
            background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
            borderRadius: 8, fontSize: 13,
            color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
            outline: 'none', marginBottom: 16, boxSizing: 'border-box',
          }}
        />
        {error && (
          <div style={{
            background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
            borderRadius: 8, padding: '8px 12px',
            fontSize: 12, color: 'var(--accent)', marginBottom: 12,
          }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '9px 16px',
            background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
            borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{
              flex: 2, padding: '9px 16px',
              background: name.trim() && !saving ? 'var(--accent)' : 'var(--bg-subtle)',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
              color: name.trim() && !saving ? '#fff' : 'var(--text-muted)',
              cursor: name.trim() && !saving ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-body)', transition: 'all 0.15s',
            }}
          >
            {saving ? 'Saving...' : 'Save chain'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Style toggle ──────────────────────────────────────────────────────────────
function StyleToggle({ styles, activeStyle, onChange }) {
  if (!styles.length) return null
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
      {['all', ...styles].map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          style={{
            padding: '5px 12px',
            background: activeStyle === s ? 'var(--accent)' : 'var(--bg-subtle)',
            border: activeStyle === s ? 'none' : '0.5px solid var(--border)',
            borderRadius: 20, fontSize: 12, fontWeight: 600,
            color: activeStyle === s ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            transition: 'all 0.15s',
          }}
        >
          {s === 'all' ? 'All' : STYLE_LABELS[s] ?? s}
        </button>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const [searchParams]                    = useSearchParams()
  const navigate                          = useNavigate()

  const [position, setPosition]           = useState(null)
  const [moves, setMoves]                 = useState([])
  const [expandedMoveId, setExpandedMoveId] = useState(null)
  const [expandedMoveFull, setExpandedMoveFull] = useState(null)
  const [loadingMove, setLoadingMove]     = useState(false)

  // Trail — each entry: { name, slug, moveId? }
  // moveId is the move that was used to navigate TO this position
  const [trail, setTrail]                 = useState([])
  // Chain trail — flat list of moves navigated through
  const [chainTrail, setChainTrail]       = useState([])
  const [savedChain, setSavedChain]       = useState(null)

  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)

  const [boardMoveIds, setBoardMoveIds]   = useState(new Set())
  const [progressMap, setProgressMap]     = useState({})
  const [boardReady, setBoardReady]       = useState(false)

  // Style filter
  const [activeStyle, setActiveStyle]     = useState('folkstyle')
  const [allMoves, setAllMoves]           = useState([])
  const [styles, setStyles]               = useState([])

  // Scroll ref for expanded move
  const expandedRef = useRef(null)

  // ── Load board + progress ───────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      import('../api').then(m => m.getMyBoard()),
      import('../api').then(m => m.getMyProgress()),
      getGraph(),
    ])
      .then(([boardData, progressData, graphData]) => {
        setBoardMoveIds(new Set(boardData.map(i => i.move.id)))
        const pm = {}
        progressData.forEach(p => { pm[p.move_id] = p })
        setProgressMap(pm)

        // Derive styles
        const set = new Set()
        graphData.moves.forEach(m => {
          if (Array.isArray(m.styles)) m.styles.forEach(s => set.add(s))
        })
        setAllMoves(graphData.moves)
        setStyles(set.size > 1 ? Array.from(set).sort() : [])
      })
      .catch(() => {})
      .finally(() => setBoardReady(true))
  }, [])

  // ── Load position ───────────────────────────────────────────────────────────
  const loadPosition = useCallback(async (slug, newTrail, newChainTrail) => {
    setLoading(true)
    setExpandedMoveId(null)
    setExpandedMoveFull(null)
    setError(null)
    try {
      const data = await getMovesFromPosition(slug)
      setPosition(data.position)
      setMoves(data.moves)
      setTrail(newTrail ?? [{ name: data.position.name, slug }])
      setChainTrail(newChainTrail ?? [])
    } catch {
      setError('Could not load position.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Initial load from ?position param ──────────────────────────────────────
  useEffect(() => {
    const slug = searchParams.get('position') || DEFAULT_POSITION
    loadPosition(slug)
  }, []) // intentionally only on mount

  // ── Filter moves by active style ────────────────────────────────────────────
  const filteredMoves = useMemo(() => {
    if (activeStyle === 'all') return moves
    return moves.filter(m => Array.isArray(m.styles) && m.styles.includes(activeStyle))
  }, [moves, activeStyle])

  // ── Click a move row ─────────────────────────────────────────────────────────
  const handleMoveClick = useCallback(async (move) => {
    // Collapse if already expanded
    if (expandedMoveId === move.id) {
      setExpandedMoveId(null)
      setExpandedMoveFull(null)
      return
    }

    setExpandedMoveId(move.id)
    setExpandedMoveFull(null)
    setLoadingMove(true)

    try {
      const full = await getMove(move.slug)
      setExpandedMoveFull(full)
    } catch {
      setExpandedMoveFull(move)
    } finally {
      setLoadingMove(false)
    }

    // Scroll to expanded move after render
    setTimeout(() => {
      expandedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 80)
  }, [expandedMoveId])

  // ── Navigate to destination position ────────────────────────────────────────
  const handleNavigate = useCallback((destPos, viaMove) => {
    if (!destPos?.slug) return
    const newTrail = [
      ...trail,
      { name: destPos.name, slug: destPos.slug },
    ]
    // Chain trail stores move names for the save chain bar
    const newChainTrail = [
      ...chainTrail,
      { name: viaMove?.name ?? destPos.name, moveId: viaMove?.id },
    ]
    loadPosition(destPos.slug, newTrail, newChainTrail)
  }, [trail, chainTrail, loadPosition])

  // ── Breadcrumb nav ───────────────────────────────────────────────────────────
  const handleBreadcrumbNav = useCallback((index) => {
    const crumb = trail[index]
    loadPosition(crumb.slug, trail.slice(0, index + 1), chainTrail.slice(0, index))
  }, [trail, chainTrail, loadPosition])

  // ── Board/progress callbacks ─────────────────────────────────────────────────
  const handleBoardChange = useCallback((moveId, added) => {
    setBoardMoveIds(prev => {
      const n = new Set(prev)
      added ? n.add(moveId) : n.delete(moveId)
      return n
    })
  }, [])

  const handleProgressChange = useCallback((moveId, data) => {
    setProgressMap(prev => {
      const n = { ...prev }
      data === null ? delete n[moveId] : n[moveId] = data
      return n
    })
  }, [])

  // ── Style change — reset to current position ────────────────────────────────
  const handleStyleChange = useCallback((s) => {
    setActiveStyle(s)
    setExpandedMoveId(null)
    setExpandedMoveFull(null)
  }, [])

  return (
    <div style={{
      maxWidth: 680,
      margin: '0 auto',
      padding: 'clamp(16px, 3vw, 28px) clamp(12px, 4vw, 20px)',
      paddingBottom: chainTrail.length >= 1 ? 80 : 'clamp(16px, 3vw, 28px)',
    }}>

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
        }}>
          Technique Graph
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
            letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0,
          }}>
            Explore
          </h1>
          <button
            onClick={() => navigate('/graph')}
            style={{
              background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
              borderRadius: 8, padding: '6px 12px',
              fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Graph view →
          </button>
        </div>
      </div>

      {/* Style toggle */}
      <StyleToggle
        styles={styles}
        activeStyle={activeStyle}
        onChange={handleStyleChange}
      />

      {/* Breadcrumb */}
      <Breadcrumb trail={trail} onNavigateTo={handleBreadcrumbNav} />

      {/* Error */}
      {error && (
        <div style={{
          background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
          borderRadius: 10, padding: '12px 16px',
          fontSize: 13, color: 'var(--accent)', marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Position header */}
      {!loading && position && (
        <PositionHeader
          position={position}
          moves={filteredMoves}
          boardMoveIds={boardMoveIds}
          progressMap={progressMap}
        />
      )}

      {loading && (
        <div style={{ marginBottom: 20 }}>
          <Skeleton height={120} />
        </div>
      )}

      {/* Moves section label */}
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
        marginBottom: 10,
      }}>
        {loading
          ? 'Loading...'
          : filteredMoves.length === 0
          ? 'No moves mapped for this style'
          : `${filteredMoves.length} move${filteredMoves.length !== 1 ? 's' : ''} from here`
        }
      </div>

      {/* Move list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} height={52} style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredMoves.map(move => {
            const isExpanded  = expandedMoveId === move.id
            const isOnBoard   = boardMoveIds.has(move.id)
            const confidence  = progressMap[move.id]?.confidence ?? null

            return (
              <div key={move.id} ref={isExpanded ? expandedRef : null}>
                <MoveRow
                  move={move}
                  isExpanded={isExpanded}
                  isOnBoard={isOnBoard}
                  confidence={confidence}
                  onClick={() => handleMoveClick(move)}
                />

                {/* Inline MoveDetail */}
                {isExpanded && (
                  <div style={{
                    border: '0.5px solid rgba(220,38,38,0.4)',
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    overflow: 'hidden',
                  }}>
                    {loadingMove ? (
                      <div style={{ padding: 20 }}>
                        <Skeleton height={200} />
                      </div>
                    ) : expandedMoveFull ? (
                      <MoveDetail
                        move={expandedMoveFull}
                        onNavigate={(destPos) => handleNavigate(destPos, expandedMoveFull)}
                        onBack={() => {
                          setExpandedMoveId(null)
                          setExpandedMoveFull(null)
                        }}
                        isOnBoard={boardMoveIds.has(expandedMoveFull.id)}
                        progress={progressMap[expandedMoveFull.id] ?? null}
                        onBoardChange={handleBoardChange}
                        onProgressChange={handleProgressChange}
                        inline
                      />
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}

          {filteredMoves.length === 0 && !loading && (
            <div style={{
              textAlign: 'center', color: 'var(--text-muted)',
              fontSize: 13, padding: '32px 0',
            }}>
              No moves mapped from this position yet.
            </div>
          )}
        </div>
      )}

      {/* Saved chain confirmation */}
      {savedChain && (
        <div style={{
          marginTop: 16,
          background: 'var(--success-soft)', border: '0.5px solid var(--success-border)',
          borderRadius: 8, padding: '10px 14px',
          fontSize: 12, color: 'var(--success)', fontWeight: 600,
        }}>
          ✓ Chain saved as "{savedChain.name}"
        </div>
      )}

      {/* Chain bar */}
      <ChainBar
        trail={chainTrail}
        onSave={(chain) => setSavedChain(chain)}
      />

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}