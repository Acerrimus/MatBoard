import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  getMovesFromPosition,
  getMove,
  getMyBoard,
  getMyProgress,
  getGraph,
  createChain,
  setChainMoves,
  addToBoard,
} from '../api'
import MoveDetail from '../components/MoveDetail'
import { confidenceColor, confidenceBg, confidenceLabel } from '../components/MoveCard'

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_POSITION = 'fk-neutral'

const STYLE_LABELS = {
  folkstyle: 'Folkstyle',
  freestyle: 'Freestyle',
  greco:     'Greco-Roman',
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ height = 52, style = {} }) {
  return (
    <div style={{
      height,
      background:    'var(--bg-subtle)',
      borderRadius:  'var(--radius-md)',
      animation:     'exploreP 1.4s ease infinite',
      ...style,
    }} />
  )
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
// Sticky on scroll. Each crumb is a real 44px tap target.
// Active crumb is accent-coloured. Previous crumbs are muted + underlined.
function Breadcrumb({ trail, onNavigateTo }) {
  if (!trail.length) return null

  return (
    <div style={{
      position:        'sticky',
      top:             0,
      zIndex:          20,
      background:      'var(--bg-page)',
      borderBottom:    '0.5px solid var(--border)',
      padding:         '0 clamp(12px, 4vw, 20px)',
      marginLeft:      'calc(-1 * clamp(12px, 4vw, 20px))',
      marginRight:     'calc(-1 * clamp(12px, 4vw, 20px))',
      marginBottom:    16,
      display:         'flex',
      alignItems:      'center',
      gap:             2,
      overflowX:       'auto',
      WebkitOverflowScrolling: 'touch',
      // Hide scrollbar but keep scroll
      scrollbarWidth:  'none',
      msOverflowStyle: 'none',
    }}>
      {trail.map((crumb, i) => {
        const isLast = i === trail.length - 1
        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {i > 0 && (
              <span style={{
                color:    'var(--border-strong)',
                fontSize: 11,
                padding:  '0 4px',
                userSelect: 'none',
              }}>
                /
              </span>
            )}
            {isLast ? (
              <span style={{
                fontSize:   12,
                fontWeight: 700,
                color:      'var(--accent)',
                padding:    '14px 4px 14px 0',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}>
                {crumb.name}
              </span>
            ) : (
              <button
                onClick={() => onNavigateTo(i)}
                style={{
                  background:  'none',
                  border:      'none',
                  cursor:      'pointer',
                  fontSize:    12,
                  fontWeight:  500,
                  color:       'var(--text-muted)',
                  padding:     '14px 4px 14px 0',
                  fontFamily:  'var(--font-body)',
                  lineHeight:  1,
                  whiteSpace:  'nowrap',
                  minHeight:   '44px',
                  touchAction: 'manipulation',
                  textDecoration:      'underline',
                  textDecorationColor: 'var(--border)',
                  textUnderlineOffset: 3,
                  transition:  'color 0.12s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                {crumb.name}
              </button>
            )}
          </span>
        )
      })}
      {/* Fade on right edge to indicate scroll */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

// ── Style toggle ──────────────────────────────────────────────────────────────
// Segmented control aesthetic — one container, active option slides inside it.
function StyleToggle({ styles, activeStyle, onChange }) {
  if (!styles.length) return null

  const options = ['all', ...styles]

  return (
    <div style={{
      display:        'inline-flex',
      background:     'var(--bg-subtle)',
      border:         '0.5px solid var(--border)',
      borderRadius:   'var(--radius-lg)',
      padding:        3,
      gap:            2,
      marginBottom:   20,
    }}>
      {options.map(s => {
        const active = activeStyle === s
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            style={{
              padding:      '6px 14px',
              background:   active ? 'var(--bg-surface)' : 'transparent',
              border:       active ? '0.5px solid var(--border)' : 'none',
              borderRadius: 'var(--radius-md)',
              fontSize:     12,
              fontWeight:   active ? 700 : 500,
              color:        active ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor:       'pointer',
              fontFamily:   'var(--font-body)',
              transition:   'all 0.12s ease',
              whiteSpace:   'nowrap',
              touchAction:  'manipulation',
              boxShadow:    active ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {s === 'all' ? 'All' : STYLE_LABELS[s] ?? s}
          </button>
        )
      })}
    </div>
  )
}

// ── Position header ───────────────────────────────────────────────────────────
// The identity block for the current position.
// Phase badge, confidence summary, move/board counts.
function PositionHeader({ position, moves, boardMoveIds, progressMap }) {
  const onBoardMoves = moves.filter(m => boardMoveIds.has(m.id))
  const confs        = onBoardMoves
    .map(m => progressMap[m.id]?.confidence)
    .filter(Boolean)
  const avgConf      = confs.length
    ? confs.reduce((a, b) => a + b, 0) / confs.length
    : null
  const confColor    = avgConf ? confidenceColor(avgConf) : null
  const confBg       = avgConf ? confidenceBg(avgConf)    : null

  // Confidence arc — segmented into 5 slots, filled up to avgConf
  const arcSlots = [1, 2, 3, 4, 5]

  return (
    <div style={{
      background:   'var(--bg-surface)',
      border:       '0.5px solid var(--border)',
      borderLeft:   `3px solid var(--accent)`,
      borderRadius: 'var(--radius-lg)',
      overflow:     'hidden',
      marginBottom: 20,
    }}>

      {/* Confidence tint top strip */}
      {avgConf && (
        <div style={{
          height:     3,
          background: confColor,
          opacity:    0.7,
        }} />
      )}

      <div style={{ padding: '18px 20px 16px' }}>

        {/* Label */}
        <div style={{
          fontSize:      9,
          fontWeight:    700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color:         'var(--text-muted)',
          marginBottom:  6,
        }}>
          Position
        </div>

        {/* Name */}
        <div style={{
          fontFamily:    'var(--font-display)',
          fontSize:      26,
          fontWeight:    700,
          letterSpacing: '-0.5px',
          color:         'var(--text-primary)',
          lineHeight:    1.15,
          marginBottom:  14,
        }}>
          {position.name}
        </div>

        {/* Stats row */}
        <div style={{
          display:  'flex',
          gap:      8,
          flexWrap: 'wrap',
        }}>

          {/* Move count */}
          <div style={{
            background:   'var(--bg-subtle)',
            border:       '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding:      '8px 12px',
            minWidth:     60,
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize:   20,
              fontWeight: 700,
              color:      'var(--text-primary)',
              lineHeight: 1,
            }}>
              {moves.length}
            </div>
            <div style={{
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color:         'var(--text-muted)',
              marginTop:     4,
            }}>
              {moves.length === 1 ? 'move' : 'moves'}
            </div>
          </div>

          {/* On board count — only shown if > 0 */}
          {onBoardMoves.length > 0 && (
            <div style={{
              background:   'var(--bg-subtle)',
              border:       '0.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding:      '8px 12px',
              minWidth:     60,
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize:   20,
                fontWeight: 700,
                color:      'var(--text-primary)',
                lineHeight: 1,
              }}>
                {onBoardMoves.length}
              </div>
              <div style={{
                fontSize:      9,
                fontWeight:    700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:         'var(--text-muted)',
                marginTop:     4,
              }}>
                in my kit
              </div>
            </div>
          )}

          {/* Avg confidence — only shown if any rated */}
          {avgConf && (
            <div style={{
              background:   confBg,
              border:       `0.5px solid ${confColor}44`,
              borderRadius: 'var(--radius-sm)',
              padding:      '8px 12px',
              minWidth:     60,
              display:      'flex',
              flexDirection:'column',
              gap:          4,
            }}>
              {/* Segmented confidence arc */}
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {arcSlots.map(s => (
                  <div
                    key={s}
                    style={{
                      height:       4,
                      flex:         1,
                      borderRadius: 2,
                      background:   s <= Math.round(avgConf)
                        ? confColor
                        : 'var(--border)',
                      transition:   'background 0.2s ease',
                    }}
                  />
                ))}
              </div>
              <div style={{
                fontSize:      9,
                fontWeight:    700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:         confColor,
              }}>
                {confidenceLabel(Math.round(avgConf))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Move row ──────────────────────────────────────────────────────────────────
// The core list item in ExplorePage.
// Left border = confidence colour (or muted if unrated).
// Expanded: bottom border dissolves, MoveDetail flows below with a connected
// left accent spine creating visual continuity.
function MoveRow({ move, isExpanded, isOnBoard, confidence, onClick }) {
  const borderColor = isOnBoard
    ? confidenceColor(confidence)
    : 'var(--border)'

  const bg = isExpanded
    ? 'var(--bg-surface)'
    : 'var(--bg-surface)'

  return (
    <div
      onClick={onClick}
      style={{
        display:          'flex',
        alignItems:       'center',
        gap:              12,
        padding:          '13px 16px',
        background:       bg,
        border:           '0.5px solid var(--border)',
        borderLeft:       `3px solid ${borderColor}`,
        // When expanded, remove bottom border so MoveDetail connects flush
        borderBottom:     isExpanded
          ? '0.5px solid transparent'
          : '0.5px solid var(--border)',
        borderRadius:     isExpanded
          ? 'var(--radius-md) var(--radius-md) 0 0'
          : 'var(--radius-md)',
        cursor:           'pointer',
        transition:       'background 0.12s ease, border-color 0.12s ease',
        userSelect:       'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => {
        if (!isExpanded) {
          e.currentTarget.style.background = 'var(--bg-subtle)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--bg-surface)'
      }}
    >
      {/* Confidence dot */}
      <div style={{
        width:        10,
        height:       10,
        borderRadius: '50%',
        flexShrink:   0,
        background:   isOnBoard
          ? confidenceColor(confidence)
          : 'var(--border)',
        boxShadow:    isOnBoard && confidence
          ? `0 0 0 3px ${confidenceBg(confidence)}`
          : 'none',
        transition:   'background 0.15s ease, box-shadow 0.15s ease',
      }} />

      {/* Move name + destination */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize:     14,
          fontWeight:   isExpanded ? 700 : 500,
          color:        isExpanded
            ? 'var(--text-primary)'
            : 'var(--text-secondary)',
          fontFamily:   'var(--font-body)',
          whiteSpace:   'nowrap',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          lineHeight:   1.3,
          marginBottom: 2,
          transition:   'color 0.12s ease, font-weight 0.12s ease',
        }}>
          {move.name}
        </div>
        <div style={{
          fontSize:   11,
          color:      'var(--text-muted)',
          lineHeight: 1,
          display:    'flex',
          alignItems: 'center',
          gap:        4,
        }}>
          <span style={{ fontSize: 9, opacity: 0.7 }}>→</span>
          <span>{move.to_position?.name ?? '—'}</span>
          {move.scoring_value > 0 && (
            <>
              <span style={{ color: 'var(--border-strong)' }}>·</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                {move.scoring_value}pts
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right side: confidence badge or rate nudge + chevron */}
      <div style={{
        display:    'flex',
        alignItems: 'center',
        gap:        8,
        flexShrink: 0,
      }}>
        {isOnBoard && confidence ? (
          <div style={{
            fontSize:     11,
            fontWeight:   700,
            color:        confidenceColor(confidence),
            background:   confidenceBg(confidence),
            border:       `0.5px solid ${confidenceColor(confidence)}44`,
            borderRadius: 6,
            padding:      '3px 8px',
            lineHeight:   1,
          }}>
            {confidence}/5
          </div>
        ) : isOnBoard ? (
          <div style={{
            fontSize:     10,
            fontWeight:   600,
            color:        'var(--text-muted)',
            background:   'var(--bg-subtle)',
            border:       '0.5px solid var(--border)',
            borderRadius: 6,
            padding:      '3px 8px',
            lineHeight:   1,
          }}>
            Rate it
          </div>
        ) : null}

        <span style={{
          fontSize:   13,
          color:      'var(--border-strong)',
          transform:  isExpanded ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.15s ease',
          lineHeight: 1,
        }}>
          ›
        </span>
      </div>
    </div>
  )
}

// ── Chain bar ─────────────────────────────────────────────────────────────────
// Floating island above the bottom of the viewport.
// Shows once the athlete has navigated at least one move.
// The trail renders as connected node chips, not a text string.
function ChainBar({ trail, onSave }) {
  const [showModal, setShowModal] = useState(false)

  // Trail must have at least 2 entries (start position + 1 navigated move)
  if (trail.length < 2) return null

  return (
    <>
      <div style={{
        position:       'fixed',
        bottom:         16,
        left:           '50%',
        transform:      'translateX(-50%)',
        zIndex:         40,
        background:     'var(--bg-surface)',
        border:         '0.5px solid var(--border-strong)',
        borderRadius:   'var(--radius-xl)',
        padding:        '10px 14px',
        display:        'flex',
        alignItems:     'center',
        gap:            12,
        boxShadow:      '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
        maxWidth:       'calc(100vw - 32px)',
        animation:      'chainBarIn 0.2s ease',
      }}>

        {/* Trail chips */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          gap:            0,
          overflowX:      'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          flex:           1,
          minWidth:       0,
        }}>
          {trail.map((t, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {i > 0 && (
                <span style={{
                  fontSize: 10,
                  color:    'var(--border-strong)',
                  padding:  '0 4px',
                }}>
                  →
                </span>
              )}
              <span style={{
                fontSize:     11,
                fontWeight:   600,
                color:        'var(--text-secondary)',
                background:   'var(--bg-subtle)',
                border:       '0.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding:      '3px 8px',
                whiteSpace:   'nowrap',
              }}>
                {t.name}
              </span>
            </span>
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={() => setShowModal(true)}
          style={{
            flexShrink:   0,
            background:   'var(--accent)',
            border:       'none',
            borderRadius: 'var(--radius-md)',
            padding:      '8px 16px',
            fontSize:     12,
            fontWeight:   700,
            color:        '#fff',
            cursor:       'pointer',
            fontFamily:   'var(--font-body)',
            boxShadow:    '0 2px 8px rgba(220,38,38,0.35)',
            touchAction:  'manipulation',
            transition:   'opacity 0.12s ease',
            whiteSpace:   'nowrap',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Save sequence
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
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const moveIds = trail.flatMap(t => t.moveId ? [t.moveId] : [])
      const chain   = await createChain(name.trim())
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
        position:       'fixed',
        inset:          0,
        zIndex:         100,
        background:     'rgba(0,0,0,0.6)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '0 16px',
        backdropFilter: 'blur(2px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background:   'var(--bg-surface)',
        border:       '0.5px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding:      '24px',
        width:        'min(400px, 100%)',
        boxShadow:    '0 16px 48px rgba(0,0,0,0.4)',
        animation:    'modalIn 0.15s ease',
      }}>

        {/* Title */}
        <div style={{
          fontFamily:    'var(--font-display)',
          fontSize:      17,
          fontWeight:    700,
          color:         'var(--text-primary)',
          marginBottom:  4,
          letterSpacing: '-0.2px',
        }}>
          Save sequence
        </div>

        {/* Trail preview */}
        <div style={{
          fontSize:     11,
          color:        'var(--text-muted)',
          marginBottom: 20,
          lineHeight:   1.5,
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}>
          {trail.map(t => t.name).join(' → ')}
        </div>

        {/* Name input */}
        <label style={{
          display:       'block',
          fontSize:      10,
          fontWeight:    700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color:         'var(--text-muted)',
          marginBottom:  6,
        }}>
          Sequence name
        </label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="e.g. Tie-up to Back Control"
          style={{
            width:        '100%',
            padding:      '10px 14px',
            background:   'var(--bg-subtle)',
            border:       '0.5px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize:     14,
            color:        'var(--text-primary)',
            fontFamily:   'var(--font-body)',
            outline:      'none',
            marginBottom: 16,
            boxSizing:    'border-box',
            transition:   'border-color 0.12s ease',
          }}
          onFocus={e  => e.currentTarget.style.borderColor = 'var(--accent)'}
          onBlur={e   => e.currentTarget.style.borderColor = 'var(--border)'}
        />

        {error && (
          <div style={{
            background:   'var(--accent-soft)',
            border:       '0.5px solid var(--border-accent)',
            borderRadius: 'var(--radius-sm)',
            padding:      '8px 12px',
            fontSize:     12,
            color:        'var(--accent)',
            marginBottom: 12,
          }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex:         1,
              padding:      '10px 16px',
              background:   'var(--bg-subtle)',
              border:       '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize:     13,
              color:        'var(--text-secondary)',
              cursor:       'pointer',
              fontFamily:   'var(--font-body)',
              transition:   'all 0.12s ease',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            style={{
              flex:         2,
              padding:      '10px 16px',
              background:   name.trim() && !saving
                ? 'var(--accent)'
                : 'var(--bg-subtle)',
              border:       'none',
              borderRadius: 'var(--radius-md)',
              fontSize:     13,
              fontWeight:   700,
              color:        name.trim() && !saving
                ? '#fff'
                : 'var(--text-muted)',
              cursor:       name.trim() && !saving
                ? 'pointer'
                : 'not-allowed',
              fontFamily:   'var(--font-body)',
              transition:   'all 0.15s ease',
            }}
          >
            {saving ? 'Saving...' : 'Save sequence'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
// Tells the athlete exactly what to do next — not just that it's empty.
function EmptyMoves({ positionName }) {
  return (
    <div style={{
      background:   'var(--bg-surface)',
      border:       '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding:      '32px 24px',
      textAlign:    'center',
    }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>🤼</div>
      <div style={{
        fontFamily:   'var(--font-display)',
        fontSize:     15,
        fontWeight:   700,
        color:        'var(--text-primary)',
        marginBottom: 6,
      }}>
        No moves mapped here yet
      </div>
      <div style={{
        fontSize:   13,
        color:      'var(--text-muted)',
        lineHeight: 1.6,
      }}>
        No techniques are mapped from {positionName} for this style.
        Try switching styles above, or go back and explore a different position.
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const [searchParams]                        = useSearchParams()
  const navigate                              = useNavigate()

  // Position + moves
  const [position, setPosition]               = useState(null)
  const [moves, setMoves]                     = useState([])
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState(null)

  // Expanded move
  const [expandedMoveId, setExpandedMoveId]   = useState(null)
  const [expandedMoveFull, setExpandedMoveFull] = useState(null)
  const [loadingMove, setLoadingMove]         = useState(false)

  // Navigation trail — each entry: { name, slug, moveId? }
  // moveId = the move used to navigate TO this position
  const [trail, setTrail]                     = useState([])
  // Chain trail — flat list of { name, moveId } for the save-chain flow
  const [chainTrail, setChainTrail]           = useState([])
  const [savedChain, setSavedChain]           = useState(null)

  // Board + progress
  const [boardMoveIds, setBoardMoveIds]       = useState(new Set())
  const [progressMap, setProgressMap]         = useState({})
  const [boardReady, setBoardReady]           = useState(false)

  // Style filter
  const [activeStyle, setActiveStyle]         = useState('folkstyle')
  const [styles, setStyles]                   = useState([])

  const expandedRef = useRef(null)

  // ── Load board + progress + derive styles ──────────────────────────────────
  useEffect(() => {
    Promise.all([
      getMyBoard(),
      getMyProgress(),
      getGraph(),
    ])
      .then(([boardData, progressData, graphData]) => {
        setBoardMoveIds(new Set(boardData.map(i => i.move.id)))
        const pm = {}
        progressData.forEach(p => { pm[p.move_id] = p })
        setProgressMap(pm)

        const styleSet = new Set()
        graphData.moves.forEach(m => {
          if (Array.isArray(m.styles)) m.styles.forEach(s => styleSet.add(s))
        })
        setStyles(styleSet.size > 1 ? Array.from(styleSet).sort() : [])
      })
      .catch(console.error)
      .finally(() => setBoardReady(true))
  }, [])

  // ── Load a position by slug ────────────────────────────────────────────────
  const loadPosition = useCallback(async (slug, newTrail, newChainTrail) => {
    setLoading(true)
    setExpandedMoveId(null)
    setExpandedMoveFull(null)
    setError(null)
    try {
      const data = await getMovesFromPosition(slug)
      setPosition(data.position)
      setMoves(data.moves)
      setTrail(newTrail      ?? [{ name: data.position.name, slug }])
      setChainTrail(newChainTrail ?? [])
    } catch {
      setError('Could not load position. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Mount: read ?position param ────────────────────────────────────────────
  useEffect(() => {
    const slug = searchParams.get('position') || DEFAULT_POSITION
    loadPosition(slug)
  }, []) // intentionally mount-only

// ── Style-filtered moves ───────────────────────────────────────────────────
const filteredMoves = useMemo(() => {
  if (activeStyle === 'all') return moves
  return moves.filter(m => {
    const moveStyles = Array.isArray(m.styles) ? m.styles : []
    return moveStyles.includes(activeStyle)
  })
}, [moves, activeStyle])

  // ── Click a move row ───────────────────────────────────────────────────────
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
      // Fall back to partial move object — better than nothing
      setExpandedMoveFull(move)
    } finally {
      setLoadingMove(false)
    }

    // Scroll expanded row into view
    setTimeout(() => {
      expandedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 80)
  }, [expandedMoveId])

  // ── Navigate to destination position ──────────────────────────────────────
  const handleNavigate = useCallback((destPos, viaMove) => {
    if (!destPos?.slug) return
    const newTrail = [...trail, { name: destPos.name, slug: destPos.slug }]
    const newChainTrail = [
      ...chainTrail,
      { name: viaMove?.name ?? destPos.name, moveId: viaMove?.id },
    ]
    loadPosition(destPos.slug, newTrail, newChainTrail)
  }, [trail, chainTrail, loadPosition])

  // ── Breadcrumb navigation ──────────────────────────────────────────────────
  const handleBreadcrumbNav = useCallback((index) => {
    const crumb = trail[index]
    loadPosition(
      crumb.slug,
      trail.slice(0, index + 1),
      chainTrail.slice(0, index),
    )
  }, [trail, chainTrail, loadPosition])

  // ── Board + progress callbacks ─────────────────────────────────────────────
  const handleBoardChange = useCallback((moveId, added) => {
    setBoardMoveIds(prev => {
      const next = new Set(prev)
      added ? next.add(moveId) : next.delete(moveId)
      return next
    })
  }, [])

  const handleProgressChange = useCallback((moveId, data) => {
    setProgressMap(prev => {
      const next = { ...prev }
      data === null ? delete next[moveId] : next[moveId] = data
      return next
    })
  }, [])

  // ── Style change — collapse any open move ──────────────────────────────────
  const handleStyleChange = useCallback((s) => {
    setActiveStyle(s)
    setExpandedMoveId(null)
    setExpandedMoveFull(null)
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  const bottomPad = chainTrail.length >= 1
    ? 96
    : 'clamp(16px, 3vw, 28px)'

  return (
    <div style={{
      maxWidth:     680,
      margin:       '0 auto',
      padding:      `clamp(16px, 3vw, 28px) clamp(12px, 4vw, 20px) ${bottomPad}`,
    }}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'flex-end',
        justifyContent: 'space-between',
        marginBottom:   20,
        gap:            12,
      }}>
        <div>
          <div style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color:         'var(--text-muted)',
            marginBottom:  4,
          }}>
            Technique Graph
          </div>
          <h1 style={{
            fontFamily:    'var(--font-display)',
            fontSize:      26,
            fontWeight:    700,
            letterSpacing: '-0.5px',
            color:         'var(--text-primary)',
            margin:        0,
            lineHeight:    1.1,
          }}>
            Explore
          </h1>
        </div>

        <button
          onClick={() => navigate('/graph')}
          style={{
            background:   'var(--bg-subtle)',
            border:       '0.5px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding:      '7px 13px',
            fontSize:     11,
            fontWeight:   600,
            color:        'var(--text-muted)',
            cursor:       'pointer',
            fontFamily:   'var(--font-body)',
            whiteSpace:   'nowrap',
            flexShrink:   0,
            transition:   'all 0.12s ease',
            touchAction:  'manipulation',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--border-strong)'
            e.currentTarget.style.color       = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color       = 'var(--text-muted)'
          }}
        >
          Graph view →
        </button>
      </div>

      {/* ── Style toggle ────────────────────────────────────────────── */}
      <StyleToggle
        styles={styles}
        activeStyle={activeStyle}
        onChange={handleStyleChange}
      />

      {/* ── Breadcrumb — sticky, shows once navigation starts ───────── */}
      <Breadcrumb trail={trail} onNavigateTo={handleBreadcrumbNav} />

      {/* ── Error ───────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          background:   'var(--accent-soft)',
          border:       '0.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)',
          padding:      '12px 16px',
          fontSize:     13,
          color:        'var(--accent)',
          marginBottom: 16,
          lineHeight:   1.5,
        }}>
          {error}
        </div>
      )}

      {/* ── Position header ─────────────────────────────────────────── */}
      {loading ? (
        <Skeleton height={140} style={{ marginBottom: 20 }} />
      ) : position ? (
        <PositionHeader
          position={position}
          moves={filteredMoves}
          boardMoveIds={boardMoveIds}
          progressMap={progressMap}
        />
      ) : null}

      {/* ── Section label ───────────────────────────────────────────── */}
      <div style={{
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color:         'var(--text-muted)',
        marginBottom:  10,
      }}>
        {loading
          ? 'Loading...'
          : filteredMoves.length === 0
          ? 'No moves for this style'
          : `${filteredMoves.length} move${filteredMoves.length !== 1 ? 's' : ''} from here`
        }
      </div>

      {/* ── Move list ───────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} height={62} style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      ) : filteredMoves.length === 0 ? (
        <EmptyMoves positionName={position?.name ?? 'this position'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {filteredMoves.map((move, index) => {
            const isExpanded = expandedMoveId === move.id
            const isOnBoard  = boardMoveIds.has(move.id)
            const confidence = progressMap[move.id]?.confidence ?? null

            return (
              <div
                key={move.id}
                ref={isExpanded ? expandedRef : null}
                style={{
                  // Slight gap between rows except when expanded
                  // (expanded row + detail form one connected unit)
                  marginBottom: isExpanded ? 0 : 6,
                }}
              >
                <MoveRow
                  move={move}
                  isExpanded={isExpanded}
                  isOnBoard={isOnBoard}
                  confidence={confidence}
                  onClick={() => handleMoveClick(move)}
                />

                {/* Inline MoveDetail — flows directly below the row */}
                {isExpanded && (
                  <div style={{
                    // Connected left border spine — same colour as the row's
                    // left border, creating visual continuity top to bottom
                    borderLeft:   `3px solid ${isOnBoard
                      ? confidenceColor(confidence)
                      : 'var(--border)'}`,
                    border:       '0.5px solid var(--border)',
                    borderTop:    'none',
                    borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                    overflow:     'hidden',
                    marginBottom: 6,
                  }}>
                    {loadingMove ? (
                      <div style={{ padding: 20 }}>
                        <Skeleton height={180} />
                      </div>
                    ) : expandedMoveFull ? (
                      <MoveDetail
                        move={expandedMoveFull}
                        onNavigate={(destPos) =>
                          handleNavigate(destPos, expandedMoveFull)
                        }
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
        </div>
      )}

      {/* ── Saved chain confirmation ─────────────────────────────────── */}
      {savedChain && (
        <div style={{
          marginTop:    16,
          background:   'var(--success-soft)',
          border:       '0.5px solid var(--success-border)',
          borderRadius: 'var(--radius-md)',
          padding:      '10px 16px',
          fontSize:     12,
          color:        'var(--success)',
          fontWeight:   600,
          display:      'flex',
          alignItems:   'center',
          gap:          8,
        }}>
          <span>✓</span>
          <span>Sequence saved as "{savedChain.name}"</span>
        </div>
      )}

      {/* ── Chain bar ───────────────────────────────────────────────── */}
      <ChainBar
        trail={chainTrail}
        onSave={(chain) => setSavedChain(chain)}
      />

      <style>{`
        @keyframes exploreP {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes chainBarIn {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  )
}