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
const H_GAP          = 60
const LEVEL_GAP      = 140
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

// ── Focus layout ──────────────────────────────────────────────────────────────
function buildFocusLayout(levels, allMoves, allPositions, boardMoveIds, progressMap, callbacks) {
  const nodes = []
  const edges = []

  levels.forEach((level, li) => {
    const posY   = li * (NODE_H + LEVEL_GAP) * 2
    const movesY = posY + NODE_H + LEVEL_GAP * 0.8
    const { position, moves, selectedMoveId } = level

    const isTop = li === 0
    nodes.push({
      id:        `pos-${li}-${position.id}`,
      type:      isTop ? 'focusCenter' : 'focusDest',
      position:  { x: -((NODE_W + 40) / 2), y: posY },
      data:      { name: position.name, isTop },
      draggable:  false,
      selectable: false,
    })

    const totalW = moves.length * NODE_W + (moves.length - 1) * H_GAP
    const startX = -totalW / 2

    moves.forEach((m, mi) => {
      const x          = startX + mi * (NODE_W + H_GAP)
      const isSelected = m.id === selectedMoveId
      const isOnBoard  = boardMoveIds.has(m.id)
      const confidence = progressMap[m.id]?.confidence ?? null

      nodes.push({
        id:       `move-${li}-${m.id}`,
        type:     'focusMove',
        position: { x, y: movesY },
        data:     {
          name: m.name,
          isOnBoard,
          confidence,
          isSelected,
          onSelect: () => callbacks.onSelectMove(li, m),
          onDetail: () => callbacks.onDetail(m),
        },
        draggable: false,
      })

      edges.push({
        id:     `e-pm-${li}-${m.id}`,
        source: `pos-${li}-${position.id}`,
        target: `move-${li}-${m.id}`,
        type:   'straight',
        style:  {
          stroke:      isSelected ? (isOnBoard ? MOVE_COLOR : UNDISCOVERED) : 'var(--border)',
          strokeWidth: isSelected ? 2 : 1,
          opacity:     isSelected ? 0.9 : 0.3,
        },
      })
    })
  })

  levels.forEach((level, li) => {
    if (li >= levels.length - 1) return
    const nextLevel = levels[li + 1]
    const selMove   = level.moves.find(m => m.id === level.selectedMoveId)
    if (!selMove) return
    edges.push({
      id:     `e-mp-${li}`,
      source: `move-${li}-${selMove.id}`,
      target: `pos-${li + 1}-${nextLevel.position.id}`,
      type:   'straight',
      style:  { stroke: MOVE_COLOR, strokeWidth: 2, opacity: 0.7 },
      markerEnd: { type: 'ArrowClosed', width: 10, height: 10, color: MOVE_COLOR },
    })
  })

  return { nodes, edges }
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
          background: 'rgba(220,38,38,0.07)',
          border: '1px solid rgba(220,38,38,0.45)',
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
          e.currentTarget.style.background = 'rgba(220,38,38,0.07)'
          e.currentTarget.style.borderColor = 'rgba(220,38,38,0.45)'
        }}
      >
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
          color: 'var(--text-primary)',
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

// ── Focus: Centre position node ───────────────────────────────────────────────
function FocusCenterNode({ data }) {
  return (
    <>
      <div style={{
        width: NODE_W + 40, height: NODE_H + 8,
        background: 'rgba(220,38,38,0.12)',
        border: '1.5px solid rgba(220,38,38,0.6)',
        borderRadius: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px', userSelect: 'none',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
          color: '#DC2626',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {data.name}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  )
}

// ── Focus: Destination position node ─────────────────────────────────────────
function FocusDestNode({ data }) {
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{
        width: NODE_W + 40, height: NODE_H + 8,
        background: 'rgba(220,38,38,0.08)',
        border: '1px solid rgba(220,38,38,0.4)',
        borderRadius: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px', userSelect: 'none',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
          color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {data.name}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  )
}

// ── Focus: Move node ──────────────────────────────────────────────────────────
function FocusMoveNode({ data }) {
  const { isOnBoard, isSelected, confidence, name, onSelect, onDetail } = data
  const border   = isSelected
    ? (isOnBoard ? 'rgba(59,130,246,0.7)' : 'rgba(161,161,170,0.5)')
    : 'var(--border)'
  const bg = isSelected && isOnBoard
    ? 'rgba(59,130,246,0.09)'
    : isSelected
    ? 'rgba(161,161,170,0.06)'
    : 'var(--bg-surface)'
  const dotColor = confidence
    ? confidenceColor(confidence)
    : isOnBoard ? '#7C3AED' : 'var(--border)'
  const textColor = isSelected ? 'var(--text-primary)' : 'var(--text-muted)'

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{
          width: NODE_W, height: NODE_H,
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center',
          padding: '0 10px', gap: 8,
          cursor: 'pointer',
          opacity: isSelected ? 1 : 0.5,
          transition: 'all 0.15s',
        }}
        onClick={onSelect}
        onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = isSelected ? '1' : '0.5' }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: isOnBoard ? 'rgba(59,130,246,0.1)' : 'var(--bg-subtle)',
          border: `1px solid ${isOnBoard ? 'rgba(59,130,246,0.2)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: isSelected ? 600 : 500,
          color: textColor,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
        <div
          onClick={e => { e.stopPropagation(); onDetail() }}
          title="View detail"
          style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
            background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, color: 'var(--text-muted)', cursor: 'pointer',
          }}
        >
          ↗
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  )
}

const nodeTypes = {
  mapPosition: MapPositionNode,
  focusCenter: FocusCenterNode,
  focusDest:   FocusDestNode,
  focusMove:   FocusMoveNode,
}
const edgeTypes = { aggregate: AggregateEdge }

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

// ── Inner (needs ReactFlow context) ──────────────────────────────────────────
function ExploreInner({
  rawPositions, rawMoves,
  boardMoveIds, setBoardMoveIds,
  progressMap, setProgressMap,
  activeStyle, setActiveStyle, styles,
  panelMove, setPanelMove,
}) {
  // ── isMobile declared first — used throughout this component ────────────────
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

  const exitFocus = useCallback((index) => {
    if (index === 0) {
      setFocusTrail([])
      setChainLevels([])
    } else {
      setFocusTrail(prev => prev.slice(0, index))
      setChainLevels(prev => prev.slice(0, index))
    }
  }, [])

  // ── Select a move at a level ────────────────────────────────────────────────
  const onSelectMove = useCallback((levelIndex, move) => {
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
  }, [rawPositions, filteredMoves])

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

  // ── Build graph (desktop only) ───────────────────────────────────────────────
  useEffect(() => {
    if (isMobile) return
    if (!filteredPositions.length) return

    let newNodes = []
    let newEdges = []

    if (focusPosition && chainLevels.length) {
      const { nodes: fn, edges: fe } = buildFocusLayout(
        chainLevels, filteredMoves, filteredPositions,
        boardMoveIds, progressMap,
        { onSelectMove, onDetail: handleMoveClick }
      )
      newNodes = fn
      newEdges = fe
    } else {
      const posXY = buildDagreLayout(filteredPositions, filteredMoves)

      filteredPositions.forEach(p => {
        newNodes.push({
          id:       `pos-${p.id}`,
          type:     'mapPosition',
          position: posXY[p.id] ?? { x: 0, y: 0 },
          data:     { name: p.name, slug: p.slug, onFocus: () => enterFocus(p) },
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
    }

    setNodes(newNodes)
    setEdges(newEdges)
    fitQueued.current = true
  }, [isMobile, filteredPositions, filteredMoves, chainLevels, boardMoveIds, progressMap,
      focusPosition, enterFocus, onSelectMove, handleMoveClick])

  useEffect(() => {
    if (!fitQueued.current) return
    const t = setTimeout(() => {
      fitView({ padding: 0.3, duration: 400 })
      fitQueued.current = false
    }, 50)
    return () => clearTimeout(t)
  }, [nodes, fitView])

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

  // ── Mobile: position list → focus drill-down ─────────────────────────────────
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

  // ── Desktop (and mobile in focus mode) ───────────────────────────────────────
  return (
    <div style={{ height: '100dvh', position: 'relative' }}>

      {/* Top bar — unified strip: style toggle left, breadcrumb centre */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, display: 'flex', alignItems: 'center', gap: 0,
        background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', pointerEvents: 'all',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        maxWidth: 'calc(100vw - 200px)',
      }}>
        {/* Style pills — only rendered when multiple styles present */}
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
                  border: 'none',
                  borderRadius: 8,
                  padding: '4px 9px',
                  fontSize: 11, fontWeight: 600,
                  color: activeStyle === s ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {s === 'all' ? 'All' : STYLE_LABELS[s] ?? s}
              </button>
            ))}
          </div>
        )}

        {/* Breadcrumb */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '6px 10px', flexWrap: 'wrap',
        }}>
          <button
            onClick={() => exitFocus(0)}
            style={crumbStyle(focusTrail.length === 0)}
          >
            {isMobile ? '← Positions' : 'All Positions'}
          </button>
          {focusTrail.map((pos, i) => (
            <span key={`${pos.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: 'var(--border-strong)', fontSize: 10 }}>›</span>
              <button onClick={() => exitFocus(i + 1)} style={crumbStyle(i === focusTrail.length - 1)}>
                {pos.name}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Save chain button */}
      {chainMoves.length >= 1 && (
        <>
          {!isMobile && (
            <div style={{
              position: 'absolute', top: 12, right: panelMove ? 432 : 16,
              zIndex: 10, pointerEvents: 'all',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {savedChain && (
                <div style={{
                  fontSize: 11, color: 'var(--success)', fontWeight: 600,
                  background: 'var(--success-soft)', border: '0.5px solid var(--success-border)',
                  borderRadius: 'var(--radius-sm)', padding: '5px 10px',
                }}>
                  ✓ Saved as "{savedChain.name}"
                </div>
              )}
              <button
                onClick={() => { setSavedChain(null); setShowSaveModal(true) }}
                style={{
                  background: 'var(--accent)', border: 'none',
                  borderRadius: 'var(--radius-md)', padding: '7px 16px',
                  fontSize: 12, fontWeight: 600, color: '#fff',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
                }}
              >
                Save chain ({chainMoves.length} move{chainMoves.length !== 1 ? 's' : ''})
              </button>
            </div>
          )}
          {isMobile && (
            <div style={{
              position: 'absolute', bottom: 24,
              left: '50%', transform: 'translateX(-50%)',
              zIndex: 10, pointerEvents: 'all',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              {savedChain && (
                <div style={{
                  fontSize: '0.6875rem', fontWeight: 600, color: 'var(--success)',
                  background: 'var(--success-soft)', border: '0.5px solid var(--success-border)',
                  borderRadius: 'var(--radius-sm)', padding: '5px 10px', whiteSpace: 'nowrap',
                }}>
                  ✓ Saved as "{savedChain.name}"
                </div>
              )}
              <button
                onClick={() => { setSavedChain(null); setShowSaveModal(true) }}
                style={{
                  background: 'var(--accent)', border: 'none',
                  borderRadius: 'var(--radius-md)', padding: '0.75rem 1.5rem',
                  fontSize: '0.875rem', fontWeight: 600, color: '#fff',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  boxShadow: '0 4px 12px rgba(220,38,38,0.35)',
                  minHeight: '2.75rem', whiteSpace: 'nowrap',
                }}
              >
                Save chain ({chainMoves.length} move{chainMoves.length !== 1 ? 's' : ''})
              </button>
            </div>
          )}
        </>
      )}

      {/* Hint — desktop map only */}
      {!isMobile && !focusPosition && (
        <div style={{
          position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, fontSize: 11, color: 'var(--text-muted)', pointerEvents: 'none',
          background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '4px 12px', whiteSpace: 'nowrap',
        }}>
          Click a position to explore its moves
        </div>
      )}

      {/* Legend — desktop only */}
      {!isMobile && (
        <div style={{
          position: 'absolute', bottom: 80, left: 16, zIndex: 10,
          background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          display: 'flex', flexDirection: 'column', gap: 6,
          fontSize: 11, color: 'var(--text-secondary)', pointerEvents: 'none',
        }}>
          {focusPosition ? (
            <>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
                Click a move to trace a chain
              </div>
              <LegendItem square color={MOVE_COLOR}   label="Move (on board)" />
              <LegendItem square color={UNDISCOVERED} label="Move (undiscovered)" />
              <div style={{ height: '0.5px', background: 'var(--border)', margin: '2px 0' }} />
              <LegendItem dot color="#22C55E" label="Confidence 4–5" />
              <LegendItem dot color="var(--comp-ready)" label="Confidence 3" />
              <LegendItem dot color="#EF4444" label="Confidence 1–2" />
              <LegendItem dot color="#7C3AED" label="On board, unrated" />
            </>
          ) : (
            <>
              <LegendItem square color={POSITION_COLOR} label="Position (click to explore)" />
              <div style={{ height: '0.5px', background: 'var(--border)', margin: '2px 0' }} />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
                Edge = avg confidence
              </div>
              <LegendItem dot color="#22C55E" label="Strong (4–5)" />
              <LegendItem dot color="var(--comp-ready)" label="Developing (3)" />
              <LegendItem dot color="#EF4444" label="Weak (1–2)" />
              <LegendItem dot color="#7C3AED" label="On board, unrated" />
              <LegendItem dot color="var(--border-strong)" label="Not explored" />
            </>
          )}
        </div>
      )}

      {/* MoveDetail panel — desktop side panel, mobile full screen */}
      {panelMove && (
        <div style={isMobile ? {
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'var(--bg-page)', overflowY: 'auto',
        } : {
          position: 'absolute', top: 16, right: 16,
          width: 400, maxHeight: 'calc(100% - 32px)',
          overflowY: 'auto', zIndex: 10,
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
          if (node.data?.onSelect) node.data.onSelect()
          else if (node.data?.onFocus) node.data.onFocus()
        }}
      >
        <Background color="var(--border)" gap={32} size={0.75} />
        {!isMobile && <Controls showInteractive={false} />}
        {!isMobile && (
          <MiniMap
            nodeColor={n => {
              if (['mapPosition', 'focusCenter', 'focusDest'].includes(n.type)) return POSITION_COLOR
              return n.data?.isOnBoard ? MOVE_COLOR : UNDISCOVERED
            }}
            maskColor="rgba(0,0,0,0.05)"
            style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}
          />
        )}
      </ReactFlow>
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
const crumbStyle = (isActive) => ({
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 11, fontWeight: 600,
  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
  fontFamily: 'var(--font-body)', padding: '0 2px',
})

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