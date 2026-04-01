import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  BaseEdge,
  getBezierPath,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import dagre from 'dagre'
import '@xyflow/react/dist/style.css'
import { getGraph, getMyBoard, getMyProgress, getMove, createChain, setChainMoves } from '../api'
import { confidenceColor } from '../components/MoveCard'
import MoveDetail from '../components/MoveDetail'

// ── Constants ─────────────────────────────────────────────────────────────────
const NODE_W         = 148
const NODE_H         = 40
const POSITION_COLOR = '#DC2626'
const MOVE_COLOR     = '#3B82F6'
const UNDISCOVERED   = '#A1A1AA'

// ── Style label display map ───────────────────────────────────────────────────
const STYLE_LABELS = {
  folkstyle: 'Folkstyle',
  freestyle: 'Freestyle',
  greco:     'Greco-Roman',
}

// ── Dagre layout ──────────────────────────────────────────────────────────────
// Map view only. Focus drill-down no longer uses dagre.
function buildDagreLayout(positions, moves) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'TB',
    ranksep: 80,
    nodesep: 40,
    marginx: 60,
    marginy: 60,
  })

  positions.forEach(p => {
    g.setNode(p.id, { width: NODE_W, height: NODE_H })
  })

  const posIds = new Set(positions.map(p => p.id))
  moves.forEach(m => {
    if (posIds.has(m.from_position_id) && posIds.has(m.to_position_id)) {
      g.setEdge(m.from_position_id, m.to_position_id)
    }
  })

  dagre.layout(g)

  const posXY = {}
  positions.forEach(p => {
    const node = g.node(p.id)
    posXY[p.id] = {
      x: node.x - NODE_W / 2,
      y: node.y - NODE_H / 2,
    }
  })
  return posXY
}

// ── Map: Position node ────────────────────────────────────────────────────────
function MapPositionNode({ data }) {
  return (
    <>
      <Handle type="target" position={Position.Top}  style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div
        onClick={data.onFocus}
        style={{
          width: NODE_W, height: NODE_H,
          background: data.isActive ? 'rgba(220,38,38,0.18)' : 'rgba(220,38,38,0.07)',
          border: data.isActive
            ? '1.5px solid rgba(220,38,38,0.85)'
            : '1px solid rgba(220,38,38,0.45)',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 14px', cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(220,38,38,0.14)'
          e.currentTarget.style.borderColor = 'rgba(220,38,38,0.75)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = data.isActive
            ? 'rgba(220,38,38,0.18)' : 'rgba(220,38,38,0.07)'
          e.currentTarget.style.borderColor = data.isActive
            ? 'rgba(220,38,38,0.85)' : 'rgba(220,38,38,0.45)'
        }}
      >
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
          color: data.isActive ? '#DC2626' : 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          pointerEvents: 'none', letterSpacing: '0.01em',
        }}>
          {data.name}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right}  style={{ opacity: 0 }} />
    </>
  )
}

// ── Map: Aggregate edge ───────────────────────────────────────────────────────
function AggregateEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, targetX, targetY, curvature: data.curvature ?? 0.25,
  })
  const onBoard = data.onBoardCount ?? 0
  const color   = data.avgConfidence
    ? confidenceColor(data.avgConfidence)
    : onBoard > 0 ? '#7C3AED' : 'rgba(255,255,255,0.12)'
  return (
    <BaseEdge id={id} path={edgePath} style={{
      stroke: color, strokeWidth: onBoard > 0 ? 2 : 1,
      opacity: onBoard > 0 ? 0.7 : 0.4,
    }} />
  )
}

const nodeTypes = { mapPosition: MapPositionNode }
const edgeTypes = { aggregate: AggregateEdge }

// ── Cascade: Move row item ────────────────────────────────────────────────────
function CascadeMoveItem({ move, isSelected, isOnBoard, confidence, onSelect, onDetail }) {
  const dotColor = confidence
    ? confidenceColor(confidence)
    : isOnBoard ? '#7C3AED' : 'var(--border-strong)'

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
        background: isSelected
          ? isOnBoard ? 'rgba(59,130,246,0.08)' : 'rgba(161,161,170,0.06)'
          : 'transparent',
        border: '0.5px solid',
        borderColor: isSelected
          ? isOnBoard ? 'rgba(59,130,246,0.35)' : 'rgba(161,161,170,0.3)'
          : 'var(--border)',
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => {
        if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-strong)'
      }}
      onMouseLeave={e => {
        if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      {/* Confidence dot */}
      <div style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        background: isOnBoard ? 'rgba(59,130,246,0.08)' : 'var(--bg-subtle)',
        border: `1px solid ${isOnBoard ? 'rgba(59,130,246,0.2)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', background: dotColor,
        }} />
      </div>

      {/* Move name */}
      <span style={{
        flex: 1, fontSize: 13, fontWeight: isSelected ? 600 : 500,
        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {move.name}
      </span>

      {/* Selected indicator */}
      {isSelected && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
          ↓
        </span>
      )}

      {/* Detail button */}
      <div
        onClick={e => { e.stopPropagation(); onDetail() }}
        title="View detail"
        style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: 'var(--text-muted)', cursor: 'pointer',
        }}
      >
        ↗
      </div>
    </div>
  )
}

// ── Cascade: Position header ──────────────────────────────────────────────────
function CascadePositionHeader({ name, isFirst }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: isFirst ? '0 0 10px 0' : '16px 0 10px 0',
    }}>
      {!isFirst && (
        <div style={{
          width: 1, height: 16, background: 'rgba(220,38,38,0.3)',
          marginLeft: 4, flexShrink: 0,
        }} />
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'rgba(220,38,38,0.7)', flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
          color: '#DC2626', letterSpacing: '0.01em',
        }}>
          {name}
        </span>
      </div>
    </div>
  )
}

// ── Cascade panel ─────────────────────────────────────────────────────────────
// Replaces the ReactFlow focus drill-down on both mobile and desktop.
// Vertical scroll, one level at a time cascades below the previous.
function CascadePanel({
  chainLevels, boardMoveIds, progressMap,
  onSelectMove, onDetail, onBack,
  chainMoves, onSaveChain, savedChain,
  isMobile,
}) {
  const bottomRef = useRef(null)

  // Scroll to bottom when a new level appears
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [chainLevels.length])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-page)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg-surface)',
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font-body)', padding: '0 4px',
          }}
        >
          ← {isMobile ? 'Positions' : 'Map'}
        </button>
        <div style={{ width: '0.5px', height: 14, background: 'var(--border)' }} />
        <span style={{
          fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
        }}>
          {chainLevels[0]?.position?.name ?? ''}
        </span>
      </div>

      {/* Cascade levels — scrollable */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 16px 120px',
      }}>
        {chainLevels.map((level, li) => {
          const { position, moves, selectedMoveId } = level
          const isFirst = li === 0
          return (
            <div key={`${position.id}-${li}`}>
              <CascadePositionHeader name={position.name} isFirst={isFirst} />

              {moves.length === 0 && (
                <div style={{
                  fontSize: 12, color: 'var(--text-muted)',
                  padding: '8px 0 4px', fontStyle: 'italic',
                }}>
                  No moves from this position
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {moves.map(m => (
                  <CascadeMoveItem
                    key={m.id}
                    move={m}
                    isSelected={m.id === selectedMoveId}
                    isOnBoard={boardMoveIds.has(m.id)}
                    confidence={progressMap[m.id]?.confidence ?? null}
                    onSelect={() => onSelectMove(li, m)}
                    onDetail={() => onDetail(m)}
                  />
                ))}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Save chain — fixed at bottom of panel */}
      {chainMoves.length >= 1 && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 16px',
          background: 'var(--bg-surface)',
          borderTop: '0.5px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {/* Chain summary */}
          <div style={{
            fontSize: 11, color: 'var(--text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {chainMoves.map(m => m.name).join(' → ')}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {savedChain && (
              <div style={{
                fontSize: 11, color: 'var(--success)', fontWeight: 600,
                background: 'var(--success-soft)', border: '0.5px solid var(--success-border)',
                borderRadius: 'var(--radius-sm)', padding: '5px 10px', whiteSpace: 'nowrap',
              }}>
                ✓ "{savedChain.name}"
              </div>
            )}
            <button
              onClick={onSaveChain}
              style={{
                flex: 1, padding: '9px 16px',
                background: 'var(--accent)', border: 'none',
                borderRadius: 'var(--radius-md)', fontSize: 13,
                fontWeight: 600, color: '#fff',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
              }}
            >
              Save chain ({chainMoves.length} move{chainMoves.length !== 1 ? 's' : ''})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


// ── Mobile: Position list ─────────────────────────────────────────────────────
function MobilePositionList({ positions, moves, activeStyle, setActiveStyle, styles, onSelect }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return positions
    const q = search.toLowerCase()
    return positions.filter(p => p.name.toLowerCase().includes(q))
  }, [positions, search])

  const moveCount = useMemo(() => {
    const map = {}
    moves.forEach(m => {
      map[m.from_position_id] = (map[m.from_position_id] ?? 0) + 1
    })
    return map
  }, [moves])

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-page)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700,
          color: 'var(--text-primary)', marginBottom: 12,
        }}>
          Positions
        </div>

        {/* Style toggle */}
        {styles.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {['all', ...styles].map(s => (
              <button
                key={s}
                onClick={() => setActiveStyle(s)}
                style={{
                  padding: '5px 12px',
                  background: activeStyle === s ? 'var(--accent)' : 'var(--bg-subtle)',
                  border: activeStyle === s ? 'none' : '0.5px solid var(--border)',
                  borderRadius: 20,
                  fontSize: 12, fontWeight: 600,
                  color: activeStyle === s ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  transition: 'all 0.15s',
                }}
              >
                {s === 'all' ? 'All' : STYLE_LABELS[s] ?? s}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search positions..."
            style={{
              width: '100%', padding: '9px 12px 9px 34px',
              background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
              borderRadius: 10, fontSize: 14,
              color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <span style={{
            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
            fontSize: 14, color: 'var(--text-muted)', pointerEvents: 'none',
          }}>
            ⌕
          </span>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 32px' }}>
        {filtered.map(p => {
          const count = moveCount[p.id] ?? 0
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '13px 14px',
                background: 'var(--bg-surface)',
                border: '0.5px solid var(--border)',
                borderRadius: 12, marginBottom: 8,
                cursor: 'pointer', textAlign: 'left',
                fontFamily: 'var(--font-body)',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'rgba(220,38,38,0.6)', flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 14, fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                }}>
                  {p.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {count > 0 && (
                  <span style={{
                    fontSize: 11, color: 'var(--text-muted)',
                    background: 'var(--bg-subtle)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 6, padding: '2px 7px',
                  }}>
                    {count} move{count !== 1 ? 's' : ''}
                  </span>
                )}
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>›</span>
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div style={{
            textAlign: 'center', color: 'var(--text-muted)',
            fontSize: 13, marginTop: 40,
          }}>
            No positions match "{search}"
          </div>
        )}
      </div>
    </div>
  )
}

// ── Save chain modal ──────────────────────────────────────────────────────────
function SaveChainModal({ moves, onSave, onClose }) {
  const [name, setName]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const chain = await createChain(name.trim())
      await setChainMoves(chain.id, moves.map(m => m.id))
      onSave(chain)
    } catch {
      setError('Failed to save chain. Try again.')
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
        borderRadius: 'var(--radius-xl)', padding: '1.75rem',
        width: 'min(380px, calc(100vw - 2rem))',
        margin: '0 1rem', boxSizing: 'border-box',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
          color: 'var(--text-primary)', marginBottom: 6,
        }}>
          Save as chain
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
          {moves.length} move{moves.length !== 1 ? 's' : ''}: {moves.map(m => m.name).join(' → ')}
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
            borderRadius: 'var(--radius-md)', fontSize: 13,
            color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
            outline: 'none', marginBottom: 16, boxSizing: 'border-box',
          }}
        />
        {error && (
          <div style={{
            background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
            borderRadius: 'var(--radius-sm)', padding: '8px 12px',
            fontSize: 12, color: 'var(--accent)', marginBottom: 12,
          }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '9px 16px',
              background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)', fontSize: 13,
              color: 'var(--text-secondary)', cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{
              flex: 2, padding: '9px 16px',
              background: name.trim() && !saving ? 'var(--accent)' : 'var(--bg-subtle)',
              border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13,
              fontWeight: 600,
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

function ExploreInner({
  rawPositions, rawMoves,
  boardMoveIds, setBoardMoveIds,
  progressMap, setProgressMap,
  activeStyle, setActiveStyle, styles,
  panelMove, setPanelMove,
}) {
  const isMobile = useRef(window.innerWidth < 768).current

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const [focusTrail, setFocusTrail]       = useState([])
  const [chainLevels, setChainLevels]     = useState([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [savedChain, setSavedChain]       = useState(null)

  const { fitView } = useReactFlow()
  const fitQueued   = useRef(false)

  // ── Style filtering ─────────────────────────────────────────────────────────
  const filteredMoves = useMemo(() => {
    if (activeStyle === 'all') return rawMoves
    return rawMoves.filter(m => Array.isArray(m.styles) && m.styles.includes(activeStyle))
  }, [rawMoves, activeStyle])

  const filteredPositions = useMemo(() => {
    if (activeStyle === 'all') return rawPositions
    const ids = new Set(filteredMoves.flatMap(m => [m.from_position_id, m.to_position_id]))
    return rawPositions.filter(p => ids.has(p.id))
  }, [rawPositions, filteredMoves, activeStyle])

  const focusPosition = focusTrail.length > 0 ? focusTrail[focusTrail.length - 1] : null

  // ── Reset focus when style changes ──────────────────────────────────────────
  useEffect(() => {
    setFocusTrail([])
    setChainLevels([])
  }, [activeStyle])

  // ── Enter focus ─────────────────────────────────────────────────────────────
  const enterFocus = useCallback((position) => {
    const moves = filteredMoves.filter(m => m.from_position_id === position.id)
    setFocusTrail([position])
    setChainLevels([{ position, moves, selectedMoveId: null }])
  }, [filteredMoves])

  const exitFocus = useCallback(() => {
    setFocusTrail([])
    setChainLevels([])
  }, [])

  // ── Select a move in the cascade ────────────────────────────────────────────
  const onSelectMove = useCallback((levelIndex, move) => {
    // If tapping an already-selected move, deselect and trim levels below
    const currentLevel = chainLevels[levelIndex]
    if (currentLevel?.selectedMoveId === move.id) {
      setChainLevels(prev => prev.slice(0, levelIndex + 1).map((l, i) =>
        i === levelIndex ? { ...l, selectedMoveId: null } : l
      ))
      setFocusTrail(prev => prev.slice(0, levelIndex + 1))
      return
    }

    const destPosition = rawPositions.find(p => p.id === move.to_position_id)
    if (!destPosition) return
    const destMoves = filteredMoves.filter(m => m.from_position_id === destPosition.id)

    setChainLevels(prev => {
      const updated = prev.slice(0, levelIndex + 1).map((l, i) =>
        i === levelIndex ? { ...l, selectedMoveId: move.id } : l
      )
      return [...updated, { position: destPosition, moves: destMoves, selectedMoveId: null }]
    })
    setFocusTrail(prev => [...prev.slice(0, levelIndex + 1), destPosition])
  }, [rawPositions, filteredMoves, chainLevels])

  // ── Move detail ─────────────────────────────────────────────────────────────
  const handleMoveClick = useCallback(async (move) => {
    try {
      const full = await getMove(move.slug)
      setPanelMove(full)
    } catch {
      setPanelMove(move)
    }
  }, [setPanelMove])

  // ── Chain moves for saving ──────────────────────────────────────────────────
  const chainMoves = useMemo(() => {
    return chainLevels
      .filter(l => l.selectedMoveId)
      .map(l => l.moves.find(m => m.id === l.selectedMoveId))
      .filter(Boolean)
  }, [chainLevels])

  // ── Board / progress callbacks ───────────────────────────────────────────────
  const handleBoardChange = useCallback((moveId, added) => {
    setBoardMoveIds(prev => {
      const n = new Set(prev)
      added ? n.add(moveId) : n.delete(moveId)
      return n
    })
  }, [setBoardMoveIds])

  const handleProgressChange = useCallback((moveId, data) => {
    setProgressMap(prev => {
      const n = { ...prev }
      data === null ? delete n[moveId] : n[moveId] = data
      return n
    })
  }, [setProgressMap])

  // ── Build map graph ──────────────────────────────────────────────────────────
  // Always builds — map stays visible on desktop even when cascade is open.
  // On mobile we skip it entirely since map is never shown.
  useEffect(() => {
    if (isMobile) return
    if (!filteredPositions.length) return

    const posXY = buildDagreLayout(filteredPositions, filteredMoves)
    const newNodes = []
    const newEdges = []

    filteredPositions.forEach(p => {
      newNodes.push({
        id:       `pos-${p.id}`,
        type:     'mapPosition',
        position: posXY[p.id] ?? { x: 0, y: 0 },
        data:     {
          name: p.name,
          slug: p.slug,
          isActive: focusPosition?.id === p.id,
          onFocus: () => enterFocus(p),
        },
        draggable: false,
      })
    })

    const pairMoves = {}
    filteredMoves.forEach(m => {
      const key = `${m.from_position_id}__${m.to_position_id}`
      if (!pairMoves[key]) pairMoves[key] = []
      pairMoves[key].push(m)
    })

    Object.entries(pairMoves).forEach(([key, ms]) => {
      const [fromId, toId] = key.split('__')
      const hasReverse     = !!pairMoves[`${toId}__${fromId}`]
      const onBoardCount   = ms.filter(m => boardMoveIds.has(m.id)).length
      const confs          = ms.map(m => progressMap[m.id]?.confidence).filter(Boolean)
      const avgConf        = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null
      newEdges.push({
        id:     `agg-${key}`,
        source: `pos-${fromId}`,
        target: `pos-${toId}`,
        type:   'aggregate',
        data:   {
          count: ms.length, onBoardCount,
          avgConfidence: avgConf,
          curvature: hasReverse ? 0.35 : 0.2,
        },
      })
    })

    setNodes(newNodes)
    setEdges(newEdges)
    fitQueued.current = true
  }, [isMobile, filteredPositions, filteredMoves, boardMoveIds, progressMap,
      focusPosition, enterFocus])

  useEffect(() => {
    if (!fitQueued.current) return
    const t = setTimeout(() => {
      fitView({ padding: 0.3, duration: 400 })
      fitQueued.current = false
    }, 50)
    return () => clearTimeout(t)
  }, [nodes, fitView])

  // ── Mobile: position list ────────────────────────────────────────────────────
  if (isMobile && !focusPosition) {
    return (
      <>
        <MobilePositionList
          positions={filteredPositions}
          moves={filteredMoves}
          activeStyle={activeStyle}
          setActiveStyle={setActiveStyle}
          styles={styles}
          onSelect={enterFocus}
        />
        {panelMove && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'var(--bg-page)', overflowY: 'auto',
          }}>
            <MoveDetail
              move={panelMove}
              onNavigate={() => setPanelMove(null)}
              onBack={() => setPanelMove(null)}
              isOnBoard={boardMoveIds.has(panelMove.id)}
              progress={progressMap[panelMove.id] ?? null}
              onBoardChange={handleBoardChange}
              onProgressChange={handleProgressChange}
            />
          </div>
        )}
      </>
    )
  }

  // ── Mobile: cascade ──────────────────────────────────────────────────────────
  if (isMobile && focusPosition) {
    return (
      <div style={{ height: '100dvh', position: 'relative' }}>
        <CascadePanel
          chainLevels={chainLevels}
          boardMoveIds={boardMoveIds}
          progressMap={progressMap}
          onSelectMove={onSelectMove}
          onDetail={handleMoveClick}
          onBack={exitFocus}
          chainMoves={chainMoves}
          onSaveChain={() => { setSavedChain(null); setShowSaveModal(true) }}
          savedChain={savedChain}
          isMobile={true}
        />
        {panelMove && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'var(--bg-page)', overflowY: 'auto',
          }}>
            <MoveDetail
              move={panelMove}
              onNavigate={() => setPanelMove(null)}
              onBack={() => setPanelMove(null)}
              isOnBoard={boardMoveIds.has(panelMove.id)}
              progress={progressMap[panelMove.id] ?? null}
              onBoardChange={handleBoardChange}
              onProgressChange={handleProgressChange}
            />
          </div>
        )}
        {showSaveModal && (
          <SaveChainModal
            moves={chainMoves}
            onSave={chain => { setSavedChain(chain); setShowSaveModal(false) }}
            onClose={() => setShowSaveModal(false)}
          />
        )}
      </div>
    )
  }

  // ── Desktop: map + cascade panel side by side ────────────────────────────────
  // Cascade panel slides in from the right when a position is selected.
  // Map stays visible and dimmed behind it. Clicking map exits the panel.
  const cascadeWidth = 360

  return (
    <div style={{ height: '100dvh', position: 'relative', display: 'flex' }}>

      {/* ReactFlow map — full width, shrinks when panel is open */}
      <div style={{
        flex: 1, position: 'relative',
        transition: 'all 0.25s ease',
      }}>

        {/* Style toggle + breadcrumb — top centre of map */}
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, display: 'flex', alignItems: 'center', gap: 0,
          background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)', pointerEvents: 'all',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}>
          {styles.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              padding: '4px 6px',
              borderRight: '0.5px solid var(--border)',
            }}>
              {['all', ...styles].map(s => (
                <button
                  key={s}
                  onClick={() => setActiveStyle(s)}
                  style={{
                    background: activeStyle === s ? 'var(--accent)' : 'none',
                    border: 'none', borderRadius: 8,
                    padding: '4px 9px', fontSize: 11, fontWeight: 600,
                    color: activeStyle === s ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                >
                  {s === 'all' ? 'All' : STYLE_LABELS[s] ?? s}
                </button>
              ))}
            </div>
          )}
          <div style={{
            padding: '6px 10px',
            fontSize: 11, fontWeight: 600,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-body)',
          }}>
            {focusPosition
              ? <span style={{ color: 'var(--text-muted)' }}>{focusPosition.name}</span>
              : 'Click a position to explore'
            }
          </div>
        </div>

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 80, left: 16, zIndex: 10,
          background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          display: 'flex', flexDirection: 'column', gap: 6,
          fontSize: 11, color: 'var(--text-secondary)', pointerEvents: 'none',
        }}>
          <LegendItem square color={POSITION_COLOR} label="Position" />
          <div style={{ height: '0.5px', background: 'var(--border)', margin: '2px 0' }} />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
            Edge = avg confidence
          </div>
          <LegendItem dot color="#22C55E"            label="Strong (4–5)" />
          <LegendItem dot color="var(--comp-ready)"  label="Developing (3)" />
          <LegendItem dot color="#EF4444"            label="Weak (1–2)" />
          <LegendItem dot color="#7C3AED"            label="On board, unrated" />
          <LegendItem dot color="var(--border-strong)" label="Not explored" />
        </div>

        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes} edgeTypes={edgeTypes}
          fitView fitViewOptions={{ padding: 0.3 }}
          minZoom={0.08} maxZoom={2.5}
          style={{ background: 'var(--bg-page)' }}
          proOptions={{ hideAttribution: true }}
          nodesFocusable={false}
          nodesConnectable={false}
          onNodeClick={(_, node) => {
            if (node.data?.onFocus) node.data.onFocus()
          }}
        >
          <Background color="var(--border)" gap={32} size={0.75} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={n => {
              if (n.type === 'mapPosition') return POSITION_COLOR
              return n.data?.isOnBoard ? MOVE_COLOR : UNDISCOVERED
            }}
            maskColor="rgba(0,0,0,0.05)"
            style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}
          />
        </ReactFlow>
      </div>

      {/* Cascade panel — slides in from right when position selected */}
      {focusPosition && (
        <div style={{
          width: cascadeWidth, flexShrink: 0,
          borderLeft: '0.5px solid var(--border)',
          position: 'relative',
          background: 'var(--bg-page)',
          display: 'flex', flexDirection: 'column',
        }}>
          <CascadePanel
            chainLevels={chainLevels}
            boardMoveIds={boardMoveIds}
            progressMap={progressMap}
            onSelectMove={onSelectMove}
            onDetail={handleMoveClick}
            onBack={exitFocus}
            chainMoves={chainMoves}
            onSaveChain={() => { setSavedChain(null); setShowSaveModal(true) }}
            savedChain={savedChain}
            isMobile={false}
          />
        </div>
      )}

      {/* MoveDetail — overlays on top of cascade panel */}
      {panelMove && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: focusPosition ? cascadeWidth : 400,
          height: '100%',
          overflowY: 'auto', zIndex: 20,
          background: 'var(--bg-page)',
          borderLeft: '0.5px solid var(--border)',
        }}>
          <MoveDetail
            move={panelMove}
            onNavigate={() => setPanelMove(null)}
            onBack={() => setPanelMove(null)}
            isOnBoard={boardMoveIds.has(panelMove.id)}
            progress={progressMap[panelMove.id] ?? null}
            onBoardChange={handleBoardChange}
            onProgressChange={handleProgressChange}
          />
        </div>
      )}

      {/* Save chain modal */}
      {showSaveModal && (
        <SaveChainModal
          moves={chainMoves}
          onSave={chain => { setSavedChain(chain); setShowSaveModal(false) }}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  )
}
// ── Page wrapper ──────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const [rawPositions, setRawPositions] = useState([])
  const [rawMoves, setRawMoves]         = useState([])
  const [boardMoveIds, setBoardMoveIds] = useState(new Set())
  const [progressMap, setProgressMap]   = useState({})
  const [activeStyle, setActiveStyle]   = useState('folkstyle')
  const [panelMove, setPanelMove]       = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  useEffect(() => {
    Promise.all([getGraph(), getMyBoard(), getMyProgress()])
      .then(([graphData, boardData, progressData]) => {
        const boardIds = new Set(boardData.map(i => i.move.id))
        const pm = {}
        progressData.forEach(p => { pm[p.move_id] = p })
        setRawPositions(graphData.positions)
        setRawMoves(graphData.moves)
        setBoardMoveIds(boardIds)
        setProgressMap(pm)
      })
      .catch(() => setError('Could not load graph.'))
      .finally(() => setLoading(false))
  }, [])

  // Derive unique styles — toggle only appears when more than one style present.
  // Greco will appear automatically once seeded.
  const styles = useMemo(() => {
    const set = new Set()
    rawMoves.forEach(m => {
      if (Array.isArray(m.styles)) m.styles.forEach(s => set.add(s))
    })
    return set.size > 1 ? Array.from(set).sort() : []
  }, [rawMoves])

  if (loading) return (
    <div style={{
      height: '100%', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-muted)', fontSize: 13,
    }}>
      Loading graph...
    </div>
  )

  if (error) return (
    <div style={{
      height: '100%', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--accent)', fontSize: 13,
    }}>
      {error}
    </div>
  )

  return (
    <ReactFlowProvider>
      <ExploreInner
        rawPositions={rawPositions} rawMoves={rawMoves}
        boardMoveIds={boardMoveIds} setBoardMoveIds={setBoardMoveIds}
        progressMap={progressMap}   setProgressMap={setProgressMap}
        activeStyle={activeStyle}   setActiveStyle={setActiveStyle}
        styles={styles}
        panelMove={panelMove}       setPanelMove={setPanelMove}
      />
    </ReactFlowProvider>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function LegendItem({ color, label, square }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      {square
        ? <div style={{ width: 12, height: 12, borderRadius: 3, border: `1.5px solid ${color}`, flexShrink: 0 }} />
        : <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      }
      <span>{label}</span>
    </div>
  )
}