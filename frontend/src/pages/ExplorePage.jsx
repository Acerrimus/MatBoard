import { useEffect, useState, useCallback, useMemo } from 'react'
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
  EdgeLabelRenderer,
  getSmoothStepPath,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getGraph, getMyBoard, getMyProgress, getMove } from '../api'
import { confidenceColor } from '../components/MoveCard'
import MoveDetail from '../components/MoveDetail'

// ── Design tokens ─────────────────────────────────────────────────────────────
const POSITION_COLOR = '#DC2626'
const MOVE_COLOR     = '#3B82F6'
const UNDISCOVERED   = '#A1A1AA'

// ── Layout constants ──────────────────────────────────────────────────────────
const NODE_W    = 148
const NODE_H    = 44
const H_GAP     = 36
const PHASE_GAP = 120

const PHASE_ORDER = ['standing', 'transition', 'ground']

// ── Layout ────────────────────────────────────────────────────────────────────
function computeLayout(positions, moves, expandedPairs) {
  const byPhase = { standing: [], transition: [], ground: [] }
  positions.forEach(p => {
    const ph = p.phase ?? 'ground'
    if (!byPhase[ph]) byPhase[ph] = []
    byPhase[ph].push(p)
  })

  const posXY = {}
  PHASE_ORDER.forEach((phase, pi) => {
    const ps     = byPhase[phase] ?? []
    const totalW = ps.length * NODE_W + (ps.length - 1) * H_GAP
    const baseY  = pi * (NODE_H + PHASE_GAP) * 2.2
    ps.forEach((p, i) => {
      posXY[p.id] = {
        x: i * (NODE_W + H_GAP) - totalW / 2,
        y: baseY,
      }
    })
  })

  // Group moves by from→to pair
  const pairMoves = {}
  moves.forEach(m => {
    const key = `${m.from_position_id}__${m.to_position_id}`
    if (!pairMoves[key]) pairMoves[key] = []
    pairMoves[key].push(m)
  })

  const moveXY = {}
  const visibleMoveIds = new Set()

  Object.entries(pairMoves).forEach(([key, ms]) => {
    if (!expandedPairs.has(key)) return
    const from = posXY[ms[0].from_position_id]
    const to   = posXY[ms[0].to_position_id]
    if (!from || !to) return

    const total = ms.length
    ms.forEach((m, i) => {
      visibleMoveIds.add(m.id)

      const mx = (from.x + to.x) / 2
      const my = (from.y + to.y) / 2

      const dx  = to.x - from.x
      const dy  = to.y - from.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const px  = -dy / len
      const py  =  dx / len

      const spread = 60
      const offset = (i - (total - 1) / 2) * spread

      moveXY[m.id] = {
        x: mx + px * offset - NODE_W / 2,
        y: my + py * offset - NODE_H / 2,
      }
    })
  })

  return { posXY, moveXY, pairMoves, visibleMoveIds }
}

// ── Position node ─────────────────────────────────────────────────────────────
function PositionNode({ data }) {
  return (
    <>
      <Handle type="target" position={Position.Top}    style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left}   style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right}  style={{ opacity: 0 }} />
      <div style={{
        width: NODE_W, height: NODE_H,
        background: 'var(--bg-surface)',
        border: `2px solid ${POSITION_COLOR}`,
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 12px',
        userSelect: 'none',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 12, fontWeight: 700,
          color: 'var(--text-primary)',
          textAlign: 'center', lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {data.name}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left}   style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top}    style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right}  style={{ opacity: 0 }} />
    </>
  )
}

// ── Move node ─────────────────────────────────────────────────────────────────
function MoveNode({ data }) {
  const isOnBoard  = data.isOnBoard
  const confidence = data.confidence ?? null
  const border     = isOnBoard ? MOVE_COLOR : UNDISCOVERED
  const bg         = isOnBoard ? 'rgba(59,130,246,0.06)' : 'var(--bg-surface)'
  const dotColor   = confidence
    ? confidenceColor(confidence)
    : isOnBoard ? '#7C3AED' : 'var(--border)'

  return (
    <>
      <Handle type="target" position={Position.Top}   style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left}  style={{ opacity: 0 }} />
      <div
        onClick={data.onClick}
        style={{
          width: NODE_W, height: NODE_H,
          background: bg,
          border: `2px solid ${border}`,
          borderRadius: 8,
          display: 'flex', alignItems: 'center',
          padding: '0 10px', gap: 8,
          cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        {/* Icon placeholder with confidence dot */}
        <div style={{
          width: 24, height: 24, borderRadius: 5, flexShrink: 0,
          background: isOnBoard ? 'rgba(59,130,246,0.1)' : 'var(--bg-subtle)',
          border: `1px solid ${isOnBoard ? 'rgba(59,130,246,0.25)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: dotColor,
          }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11, fontWeight: 500,
          color: isOnBoard ? 'var(--text-primary)' : 'var(--text-muted)',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY, borderRadius: 16,
  })

  const onBoard = data.onBoardCount ?? 0
  const avg     = data.avgConfidence
  const color   = avg
    ? confidenceColor(avg)
    : onBoard > 0 ? '#7C3AED' : 'var(--border-strong)'

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: onBoard > 0 ? 2 : 1.5,
          opacity: onBoard > 0 ? 0.9 : 0.35,
        }}
      />
      <EdgeLabelRenderer>
        <div
          onClick={data.onExpand}
          style={{
            position: 'absolute',
            transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            cursor: 'pointer',
            background: 'var(--bg-surface)',
            border: `1.5px solid ${color}`,
            borderRadius: 20,
            padding: '2px 9px',
            fontSize: 10,
            fontWeight: 700,
            color,
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
          title="Click to expand moves"
        >
          {data.count} move{data.count !== 1 ? 's' : ''} +
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const nodeTypes = { position: PositionNode, move: MoveNode }
const edgeTypes = { aggregate: AggregateEdge }

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const [rawPositions, setRawPositions]     = useState([])
  const [rawMoves, setRawMoves]             = useState([])
  const [boardMoveIds, setBoardMoveIds]     = useState(new Set())
  const [progressMap, setProgressMap]       = useState({})
  const [expandedPairs, setExpandedPairs]   = useState(new Set())
  const [activeSport, setActiveSport]       = useState('all')
  const [panelMove, setPanelMove]           = useState(null)
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)

  // ── Load ────────────────────────────────────────────────────────────────────
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

  // ── Filter by sport ─────────────────────────────────────────────────────────
  const filteredMoves = useMemo(() => {
    if (activeSport === 'all') return rawMoves
    return rawMoves.filter(m => (m.sport ?? 'wrestling') === activeSport)
  }, [rawMoves, activeSport])

  // ── Rebuild on any change ───────────────────────────────────────────────────
  const rebuildGraph = useCallback((positions, moves, boardIds, pm, expanded) => {
    const { posXY, moveXY, pairMoves, visibleMoveIds } = computeLayout(positions, moves, expanded)

    const posNodes = positions.map(p => ({
      id:        `pos-${p.id}`,
      type:      'position',
      position:  posXY[p.id] ?? { x: 0, y: 0 },
      data:      { name: p.name, slug: p.slug, phase: p.phase },
      draggable: false,
    }))

    const moveNodes = moves
      .filter(m => visibleMoveIds.has(m.id))
      .map(m => ({
        id:        `move-${m.id}`,
        type:      'move',
        position:  moveXY[m.id] ?? { x: 0, y: 0 },
        data:      {
          name:             m.name,
          slug:             m.slug,
          from_position_id: m.from_position_id,
          to_position_id:   m.to_position_id,
          isOnBoard:        boardIds.has(m.id),
          confidence:       pm[m.id]?.confidence ?? null,
          onClick:          () => handleMoveClick(m),
        },
        draggable: false,
      }))

    const edgeList = []

    Object.entries(pairMoves).forEach(([key, ms]) => {
      const [fromId, toId] = key.split('__')
      const isExpanded = expanded.has(key)

      if (isExpanded) {
        ms.forEach(m => {
          if (!visibleMoveIds.has(m.id)) return
          const edgeStyle = { stroke: 'var(--border-strong)', strokeWidth: 1.5 }
          const marker    = { type: 'ArrowClosed', width: 10, height: 10, color: 'var(--border-strong)' }
          edgeList.push({
            id: `ein-${m.id}`, source: `pos-${m.from_position_id}`, target: `move-${m.id}`,
            type: 'smoothstep', style: edgeStyle, markerEnd: marker,
          })
          edgeList.push({
            id: `eout-${m.id}`, source: `move-${m.id}`, target: `pos-${m.to_position_id}`,
            type: 'smoothstep', style: edgeStyle, markerEnd: marker,
          })
        })
      } else {
        const onBoardCount = ms.filter(m => boardIds.has(m.id)).length
        const confs        = ms.map(m => pm[m.id]?.confidence).filter(Boolean)
        const avgConf      = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null

        edgeList.push({
          id:     `agg-${key}`,
          source: `pos-${fromId}`,
          target: `pos-${toId}`,
          type:   'aggregate',
          data:   {
            count: ms.length,
            onBoardCount,
            avgConfidence: avgConf,
            onExpand: () => setExpandedPairs(prev => {
              const next = new Set(prev)
              next.has(key) ? next.delete(key) : next.add(key)
              return next
            }),
          },
        })
      }
    })

    setNodes([...posNodes, ...moveNodes])
    setEdges(edgeList)
  }, [])

  useEffect(() => {
    if (!rawPositions.length) return
    rebuildGraph(rawPositions, filteredMoves, boardMoveIds, progressMap, expandedPairs)
  }, [rawPositions, filteredMoves, boardMoveIds, progressMap, expandedPairs, rebuildGraph])

  // ── Move click ──────────────────────────────────────────────────────────────
  const handleMoveClick = async (move) => {
    try {
      const full = await getMove(move.slug)
      setPanelMove(full)
    } catch {
      setPanelMove(move)
    }
  }

  // ── Callbacks ───────────────────────────────────────────────────────────────
  const handleBoardChange = useCallback((moveId, added) => {
    setBoardMoveIds(prev => {
      const next = new Set(prev)
      added ? next.add(moveId) : next.delete(moveId)
      return next
    })
  }, [])

  const handleProgressChange = useCallback((moveId, progressData) => {
    setProgressMap(prev => {
      const next = { ...prev }
      if (progressData === null) delete next[moveId]
      else next[moveId] = progressData
      return next
    })
  }, [])

  const sports = useMemo(() => {
    const set = new Set(rawMoves.map(m => m.sport ?? 'wrestling'))
    return ['all', ...Array.from(set)]
  }, [rawMoves])

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      Loading graph...
    </div>
  )

  if (error) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: 13 }}>
      {error}
    </div>
  )

  return (
    <div style={{ height: '100%', position: 'relative' }}>

      {/* Sport filter */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '6px 10px', pointerEvents: 'all',
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginRight: 2 }}>
          Sport
        </span>
        {sports.map(s => (
          <button key={s} onClick={() => setActiveSport(s)} style={{
            padding: '3px 10px', fontSize: 11, fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            border: `0.5px solid ${activeSport === s ? 'var(--accent)' : 'var(--border)'}`,
            background: activeSport === s ? 'var(--accent-soft)' : 'transparent',
            color: activeSport === s ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer', fontFamily: 'var(--font-body)', textTransform: 'capitalize',
            transition: 'all 0.15s',
          }}>
            {s}
          </button>
        ))}
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
        <LegendItem square color={MOVE_COLOR}     label="Move (on board)" />
        <LegendItem square color={UNDISCOVERED}   label="Move (undiscovered)" />
        <div style={{ height: '0.5px', background: 'var(--border)', margin: '2px 0' }} />
        <LegendItem dot color="#22C55E" label="Confidence 4–5" />
        <LegendItem dot color="#F59E0B" label="Confidence 3" />
        <LegendItem dot color="#EF4444" label="Confidence 1–2" />
        <LegendItem dot color="#7C3AED" label="On board, unrated" />
        <div style={{ height: '0.5px', background: 'var(--border)', margin: '2px 0' }} />
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Click edge pill to expand moves</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Click move node to view detail</div>
      </div>

      {/* MoveDetail panel */}
      {panelMove && (
        <div style={{
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

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2.5}
        style={{ background: 'var(--bg-page)' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border)" gap={28} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={n => n.type === 'position' ? POSITION_COLOR : n.data?.isOnBoard ? MOVE_COLOR : UNDISCOVERED}
          maskColor="rgba(0,0,0,0.05)"
          style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}
        />
      </ReactFlow>
    </div>
  )
}

function LegendItem({ color, label, square, dot }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      {square
        ? <div style={{ width: 13, height: 13, borderRadius: 3, border: `2px solid ${color}`, flexShrink: 0 }} />
        : <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      }
      <span>{label}</span>
    </div>
  )
}