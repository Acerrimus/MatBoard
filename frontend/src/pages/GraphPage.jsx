import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { getGraph, getMyBoard, getMyProgress } from '../api'
import { confidenceColor } from '../components/MoveCard'

// ── Constants ─────────────────────────────────────────────────────────────────
const NODE_W         = 148
const NODE_H         = 40
const POSITION_COLOR = '#DC2626'
const MOVE_COLOR     = '#3B82F6'
const UNDISCOVERED   = '#A1A1AA'

const STYLE_LABELS = {
  folkstyle: 'Folkstyle',
  freestyle: 'Freestyle',
  greco:     'Greco-Roman',
}

// ── Dagre layout ──────────────────────────────────────────────────────────────
function buildDagreLayout(positions, moves) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40, marginx: 60, marginy: 60 })
  positions.forEach(p => g.setNode(p.id, { width: NODE_W, height: NODE_H }))
  const posIds = new Set(positions.map(p => p.id))
  moves.forEach(m => {
    if (posIds.has(m.from_position_id) && posIds.has(m.to_position_id))
      g.setEdge(m.from_position_id, m.to_position_id)
  })
  dagre.layout(g)
  const posXY = {}
  positions.forEach(p => {
    const node = g.node(p.id)
    posXY[p.id] = { x: node.x - NODE_W / 2, y: node.y - NODE_H / 2 }
  })
  return posXY
}

// ── Position node ─────────────────────────────────────────────────────────────
function MapPositionNode({ data }) {
  const isActive = data.isActive
  return (
    <>
      <Handle type="target" position={Position.Top}  style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div
        onClick={data.onClick}
        style={{
          width: NODE_W, height: NODE_H,
          background: isActive ? 'rgba(220,38,38,0.18)' : 'rgba(220,38,38,0.06)',
          border: isActive
            ? '1.5px solid rgba(220,38,38,0.9)'
            : '1px solid rgba(220,38,38,0.4)',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 14px', cursor: 'pointer',
          transition: 'all 0.15s',
          boxShadow: isActive ? '0 0 0 3px rgba(220,38,38,0.12)' : 'none',
        }}
        onMouseEnter={e => {
          if (!isActive) {
            e.currentTarget.style.background = 'rgba(220,38,38,0.12)'
            e.currentTarget.style.borderColor = 'rgba(220,38,38,0.65)'
          }
        }}
        onMouseLeave={e => {
          if (!isActive) {
            e.currentTarget.style.background = 'rgba(220,38,38,0.06)'
            e.currentTarget.style.borderColor = 'rgba(220,38,38,0.4)'
          }
        }}
      >
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
          color: isActive ? '#DC2626' : 'var(--text-primary)',
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

// ── Aggregate edge ────────────────────────────────────────────────────────────
function AggregateEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, targetX, targetY, curvature: data.curvature ?? 0.25,
  })
  const onBoard = data.onBoardCount ?? 0
  const color = data.avgConfidence
    ? confidenceColor(data.avgConfidence)
    : onBoard > 0 ? '#7C3AED' : 'rgba(255,255,255,0.1)'
  return (
    <BaseEdge id={id} path={edgePath} style={{
      stroke: color, strokeWidth: onBoard > 0 ? 2 : 1,
      opacity: onBoard > 0 ? 0.75 : 0.35,
    }} />
  )
}

const nodeTypes = { mapPosition: MapPositionNode }
const edgeTypes = { aggregate: AggregateEdge }

// ── Position popup ────────────────────────────────────────────────────────────
// Anchored to screen position of the clicked node.
// Shows move count, avg confidence, best rated move.
// One action: Explore from here.
function PositionPopup({ position, stats, screenPos, onExplore, onClose }) {
  const popupRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const confLabel = stats.avgConfidence
    ? stats.avgConfidence >= 4 ? 'Strong'
      : stats.avgConfidence >= 3 ? 'Developing'
      : 'Needs work'
    : null

  const confColor = stats.avgConfidence
    ? confidenceColor(stats.avgConfidence)
    : 'var(--text-muted)'

  return (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        left: screenPos.x,
        top: screenPos.y,
        zIndex: 30,
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 14,
        padding: '14px 16px',
        width: 220,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        pointerEvents: 'all',
      }}
    >
      {/* Position name */}
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
        color: '#DC2626', marginBottom: 10, letterSpacing: '0.01em',
      }}>
        {position.name}
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 12,
      }}>
        <div style={{
          flex: 1, background: 'var(--bg-subtle)',
          border: '0.5px solid var(--border)',
          borderRadius: 8, padding: '6px 10px',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
            color: 'var(--text-primary)', lineHeight: 1,
          }}>
            {stats.moveCount}
          </div>
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 3,
          }}>
            moves
          </div>
        </div>

        {stats.onBoardCount > 0 && (
          <div style={{
            flex: 1, background: 'var(--bg-subtle)',
            border: '0.5px solid var(--border)',
            borderRadius: 8, padding: '6px 10px',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
              color: 'var(--text-primary)', lineHeight: 1,
            }}>
              {stats.onBoardCount}
            </div>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 3,
            }}>
              on board
            </div>
          </div>
        )}
      </div>

      {/* Avg confidence */}
      {confLabel && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 12,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: confColor, flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Avg confidence: <span style={{ color: confColor, fontWeight: 600 }}>{confLabel}</span>
          </span>
        </div>
      )}

      {/* Best move */}
      {stats.bestMove && (
        <div style={{
          fontSize: 11, color: 'var(--text-muted)',
          marginBottom: 12,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          Best: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            {stats.bestMove}
          </span>
        </div>
      )}

      {/* Explore button */}
      <button
        onClick={onExplore}
        style={{
          width: '100%', padding: '9px 14px',
          background: 'var(--accent)', border: 'none',
          borderRadius: 8, fontSize: 12, fontWeight: 600,
          color: '#fff', cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        Explore from here →
      </button>
    </div>
  )
}

// ── Legend item ───────────────────────────────────────────────────────────────
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

// ── GraphInner ────────────────────────────────────────────────────────────────
function GraphInner({
  rawPositions, rawMoves,
  boardMoveIds, progressMap,
  activeStyle, setActiveStyle, styles,
}) {
  const navigate   = useNavigate()
  const { fitView, flowToScreenPosition } = useReactFlow()
  const fitQueued  = useRef(false)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Active popup state
  const [activePopup, setActivePopup] = useState(null)
  // { position, stats, screenPos }

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

  // ── Per-position stats ──────────────────────────────────────────────────────
  const positionStats = useMemo(() => {
    const stats = {}
    filteredPositions.forEach(p => {
      const moves     = filteredMoves.filter(m => m.from_position_id === p.id)
      const onBoard   = moves.filter(m => boardMoveIds.has(m.id))
      const confs     = moves.map(m => progressMap[m.id]?.confidence).filter(Boolean)
      const avgConf   = confs.length
        ? confs.reduce((a, b) => a + b, 0) / confs.length
        : null
      const bestMove  = moves
        .filter(m => progressMap[m.id]?.confidence)
        .sort((a, b) => (progressMap[b.id]?.confidence ?? 0) - (progressMap[a.id]?.confidence ?? 0))[0]
      stats[p.id] = {
        moveCount:    moves.length,
        onBoardCount: onBoard.length,
        avgConfidence: avgConf,
        bestMove:     bestMove?.name ?? null,
      }
    })
    return stats
  }, [filteredPositions, filteredMoves, boardMoveIds, progressMap])

  // ── Handle node click ───────────────────────────────────────────────────────
  const handleNodeClick = useCallback((position, nodeElement) => {
    // If clicking the already-active position, close popup
    if (activePopup?.position.id === position.id) {
      setActivePopup(null)
      return
    }

    // Get screen coordinates of node for popup anchor
    // We use the node's DOM position — center of node + offset below
    const rect = nodeElement?.getBoundingClientRect?.()
    const screenPos = rect
      ? { x: rect.left + rect.width / 2 - 110, y: rect.bottom + 8 }
      : { x: window.innerWidth / 2 - 110, y: window.innerHeight / 2 }

    setActivePopup({
      position,
      stats: positionStats[position.id] ?? { moveCount: 0, onBoardCount: 0, avgConfidence: null, bestMove: null },
      screenPos,
    })
  }, [activePopup, positionStats])

  // ── Build graph ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!filteredPositions.length) return

    const posXY    = buildDagreLayout(filteredPositions, filteredMoves)
    const newNodes = []
    const newEdges = []

    filteredPositions.forEach(p => {
      newNodes.push({
        id:       `pos-${p.id}`,
        type:     'mapPosition',
        position: posXY[p.id] ?? { x: 0, y: 0 },
        data:     {
          name:     p.name,
          isActive: activePopup?.position.id === p.id,
          onClick:  (e) => handleNodeClick(p, e?.currentTarget),
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
      const avgConf        = confs.length
        ? confs.reduce((a, b) => a + b, 0) / confs.length
        : null
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
  }, [filteredPositions, filteredMoves, boardMoveIds, progressMap,
      activePopup, handleNodeClick])

  useEffect(() => {
    if (!fitQueued.current) return
    const t = setTimeout(() => {
      fitView({ padding: 0.3, duration: 400 })
      fitQueued.current = false
    }, 50)
    return () => clearTimeout(t)
  }, [nodes, fitView])

  // ── Close popup when style changes ──────────────────────────────────────────
  useEffect(() => { setActivePopup(null) }, [activeStyle])

  return (
    <div style={{ height: '100dvh', position: 'relative' }}>

      {/* Top bar — style toggle */}
      {styles.length > 0 && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, display: 'flex', alignItems: 'center', gap: 2,
          background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '4px 6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          pointerEvents: 'all',
        }}>
          {['all', ...styles].map(s => (
            <button
              key={s}
              onClick={() => setActiveStyle(s)}
              style={{
                background: activeStyle === s ? 'var(--accent)' : 'none',
                border: 'none', borderRadius: 8,
                padding: '5px 12px', fontSize: 11, fontWeight: 600,
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

      {/* Hint */}
      <div style={{
        position: 'absolute',
        top: styles.length > 0 ? 64 : 12,
        left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, fontSize: 11, color: 'var(--text-muted)',
        pointerEvents: 'none',
        background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '4px 12px', whiteSpace: 'nowrap',
      }}>
        Click a position to see details
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
          Edge colour = your avg confidence
        </div>
        <LegendItem dot color="#22C55E"              label="Strong (4–5)" />
        <LegendItem dot color="var(--comp-ready)"    label="Developing (3)" />
        <LegendItem dot color="#EF4444"              label="Weak (1–2)" />
        <LegendItem dot color="#7C3AED"              label="On board, unrated" />
        <LegendItem dot color="rgba(255,255,255,0.1)" label="Not explored" />
      </div>

      {/* Position popup */}
      {activePopup && (
        <PositionPopup
          position={activePopup.position}
          stats={activePopup.stats}
          screenPos={activePopup.screenPos}
          onExplore={() => navigate(`/explore?position=${activePopup.position.slug}`)}
          onClose={() => setActivePopup(null)}
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
        onNodeClick={(event, node) => {
          if (node.data?.onClick) node.data.onClick(event)
        }}
      >
        <Background color="var(--border)" gap={32} size={0.75} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={n => n.type === 'mapPosition' ? POSITION_COLOR : UNDISCOVERED}
          maskColor="rgba(0,0,0,0.05)"
          style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}
        />
      </ReactFlow>
    </div>
  )
}

// ── Page wrapper ──────────────────────────────────────────────────────────────
export default function GraphPage() {
  const [rawPositions, setRawPositions] = useState([])
  const [rawMoves, setRawMoves]         = useState([])
  const [boardMoveIds, setBoardMoveIds] = useState(new Set())
  const [progressMap, setProgressMap]   = useState({})
  const [activeStyle, setActiveStyle]   = useState('folkstyle')
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
      <GraphInner
        rawPositions={rawPositions} rawMoves={rawMoves}
        boardMoveIds={boardMoveIds} progressMap={progressMap}
        activeStyle={activeStyle}   setActiveStyle={setActiveStyle}
        styles={styles}
      />
    </ReactFlowProvider>
  )
}