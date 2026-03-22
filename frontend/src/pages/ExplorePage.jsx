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
  getBezierPath,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getGraph, getMyBoard, getMyProgress, getMove } from '../api'
import { confidenceColor } from '../components/MoveCard'
import MoveDetail from '../components/MoveDetail'

// ── Constants ─────────────────────────────────────────────────────────────────
const NODE_W         = 160
const NODE_H         = 48
const H_GAP          = 60
const BAND_GAP       = 500
const MOVE_SPACING   = 180
const MOVE_ROW_OFFSET = 80

const POSITION_COLOR = '#DC2626'
const MOVE_COLOR     = '#3B82F6'
const UNDISCOVERED   = '#A1A1AA'

const BAND_CONFIG = {
  standing:   { y: 0,            label: 'Standing' },
  transition: { y: BAND_GAP,     label: 'Transitions' },
  ground:     { y: BAND_GAP * 2, label: 'Ground' },
}

const PHASE_ORDER = ['standing', 'transition', 'ground']

// ── Layout ────────────────────────────────────────────────────────────────────
function computeLayout(positions, moves, expandedPairs) {
  // Count connectivity per position
  const connectivity = {}
  positions.forEach(p => { connectivity[p.id] = 0 })
  moves.forEach(m => {
    if (connectivity[m.from_position_id] !== undefined) connectivity[m.from_position_id]++
    if (connectivity[m.to_position_id]   !== undefined) connectivity[m.to_position_id]++
  })

  // Group and sort positions by phase
  const byPhase = { standing: [], transition: [], ground: [] }
  positions.forEach(p => {
    const ph = p.phase ?? 'ground'
    if (!byPhase[ph]) byPhase[ph] = []
    byPhase[ph].push(p)
  })
  PHASE_ORDER.forEach(phase => {
    byPhase[phase].sort((a, b) => {
      const diff = (connectivity[b.id] ?? 0) - (connectivity[a.id] ?? 0)
      return diff !== 0 ? diff : a.name.localeCompare(b.name)
    })
  })

  // Assign positions
  const posXY = {}
  PHASE_ORDER.forEach(phase => {
    const ps     = byPhase[phase] ?? []
    const totalW = ps.length * NODE_W + (ps.length - 1) * H_GAP
    const startX = -totalW / 2
    const bandY  = BAND_CONFIG[phase]?.y ?? 0
    ps.forEach((p, i) => {
      posXY[p.id] = {
        x: startX + i * (NODE_W + H_GAP),
        y: bandY,
      }
    })
  })

  // Group moves by directional pair
  const pairMoves = {}
  moves.forEach(m => {
    const key = `${m.from_position_id}__${m.to_position_id}`
    if (!pairMoves[key]) pairMoves[key] = []
    pairMoves[key].push(m)
  })

  // Place expanded move nodes
  const moveXY         = {}
  const visibleMoveIds = new Set()
  const placedMoveRects = [] // for collision detection: {x, y, w, h}

  Object.entries(pairMoves).forEach(([key, ms]) => {
    if (!expandedPairs.has(key)) return
    const from = posXY[ms[0].from_position_id]
    const to   = posXY[ms[0].to_position_id]
    if (!from || !to) return

    ms.forEach(m => visibleMoveIds.add(m.id))

    const fromPhase = positions.find(p => p.id === ms[0].from_position_id)?.phase
    const toPhase   = positions.find(p => p.id === ms[0].to_position_id)?.phase
    const sameBand  = fromPhase === toPhase

    const centerX = (from.x + to.x) / 2
    let   rowY

    if (sameBand) {
      rowY = (BAND_CONFIG[fromPhase]?.y ?? 0) + MOVE_ROW_OFFSET
    } else {
      rowY = (from.y + to.y) / 2 - NODE_H / 2
    }

    const count = ms.length
    ms.forEach((m, i) => {
      let x = centerX + (i - (count - 1) / 2) * MOVE_SPACING - NODE_W / 2
      let y = rowY

      // Simple collision resolution: shift down if overlapping a placed node
      let attempts = 0
      while (attempts < 10) {
        const overlaps = placedMoveRects.some(r =>
          Math.abs(r.x - x) < NODE_W + 20 &&
          Math.abs(r.y - y) < NODE_H + 20
        )
        if (!overlaps) break
        y += NODE_H + 30
        attempts++
      }

      moveXY[m.id] = { x, y }
      placedMoveRects.push({ x, y, w: NODE_W, h: NODE_H })
    })
  })

  return { posXY, moveXY, pairMoves, visibleMoveIds }
}

// ── Band label node ───────────────────────────────────────────────────────────
function BandLabelNode({ data }) {
  return (
    <div style={{
      pointerEvents: 'none',
      userSelect: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      width: 200,
    }}>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        opacity: 0.7,
      }}>
        {data.label}
      </span>
      <div style={{
        width: 120,
        height: 1,
        background: 'var(--border)',
        opacity: 0.5,
      }} />
    </div>
  )
}

// ── Position node ─────────────────────────────────────────────────────────────
function PositionNode({ data }) {
  return (
    <>
      <Handle type="target" position={Position.Top}  style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div style={{
        width: NODE_W, height: NODE_H,
        background: 'var(--bg-surface)',
        border: `2px solid ${POSITION_COLOR}`,
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 14px',
        userSelect: 'none',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13, fontWeight: 700,
          color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {data.name}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
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
      <Handle type="target" position={Position.Top}  style={{ opacity: 0 }} />
      <div
        onClick={data.onClick}
        style={{
          width: NODE_W, height: NODE_H,
          background: bg,
          border: `2px solid ${border}`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center',
          padding: '0 10px', gap: 8,
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: 6, flexShrink: 0,
          background: isOnBoard ? 'rgba(59,130,246,0.1)' : 'var(--bg-subtle)',
          border: `1px solid ${isOnBoard ? 'rgba(59,130,246,0.25)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
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
    </>
  )
}

// ── Aggregate edge ────────────────────────────────────────────────────────────
function AggregateEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
  const curvature = data.curvature ?? 0.25
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, curvature,
  })

  const onBoard   = data.onBoardCount ?? 0
  const avg       = data.avgConfidence
  const color     = avg
    ? confidenceColor(avg)
    : onBoard > 0 ? '#7C3AED' : 'var(--border-strong)'
  const isExpanded = data.isExpanded ?? false

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#arrow-${color.replace('#', '')})`}
        style={{
          stroke: color,
          strokeWidth: onBoard > 0 ? 2.5 : 1.5,
          opacity: onBoard > 0 ? 0.85 : 0.3,
        }}
      />
      <EdgeLabelRenderer>
        <div
          onClick={data.onToggle}
          style={{
            position: 'absolute',
            transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            cursor: 'pointer',
            background: 'var(--bg-surface)',
            border: `1.5px solid ${isExpanded ? color : 'var(--border-strong)'}`,
            borderRadius: 20,
            padding: '3px 12px',
            fontSize: 11,
            fontWeight: 600,
            color: isExpanded ? color : 'var(--text-secondary)',
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.15s',
          }}
        >
          {data.count} move{data.count !== 1 ? 's' : ''} {isExpanded ? '▴' : '▾'}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const nodeTypes = {
  position:  PositionNode,
  move:      MoveNode,
  bandLabel: BandLabelNode,
}
const edgeTypes = { aggregate: AggregateEdge }

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const [rawPositions, setRawPositions]   = useState([])
  const [rawMoves, setRawMoves]           = useState([])
  const [boardMoveIds, setBoardMoveIds]   = useState(new Set())
  const [progressMap, setProgressMap]     = useState({})
  const [expandedPairs, setExpandedPairs] = useState(new Set())
  const [activeSport, setActiveSport]     = useState('all')
  const [panelMove, setPanelMove]         = useState(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)

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

  // ── Derived: filter by sport ────────────────────────────────────────────────
  const filteredMoves = useMemo(() => {
    if (activeSport === 'all') return rawMoves
    return rawMoves.filter(m => (m.sport ?? 'wrestling') === activeSport)
  }, [rawMoves, activeSport])

  const filteredPositions = useMemo(() => {
    if (activeSport === 'all') return rawPositions
    const connectedIds = new Set(filteredMoves.flatMap(m => [m.from_position_id, m.to_position_id]))
    return rawPositions.filter(p => connectedIds.has(p.id))
  }, [rawPositions, filteredMoves, activeSport])

  const sports = useMemo(() => {
    const set = new Set(rawMoves.map(m => m.sport ?? 'wrestling'))
    return ['all', ...Array.from(set)]
  }, [rawMoves])

  // ── Toggle pair ─────────────────────────────────────────────────────────────
  const togglePair = useCallback((key) => {
    setExpandedPairs(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  // ── Build graph ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!filteredPositions.length) return

    const { posXY, moveXY, pairMoves, visibleMoveIds } =
      computeLayout(filteredPositions, filteredMoves, expandedPairs)

    // Band label nodes
    const bandNodes = PHASE_ORDER.map(phase => ({
      id:          `band-${phase}`,
      type:        'bandLabel',
      position:    { x: -700, y: (BAND_CONFIG[phase]?.y ?? 0) - 10 },
      data:        { label: BAND_CONFIG[phase]?.label ?? phase },
      draggable:   false,
      selectable:  false,
      connectable: false,
    }))

    // Position nodes
    const posNodes = filteredPositions.map(p => ({
      id:        `pos-${p.id}`,
      type:      'position',
      position:  posXY[p.id] ?? { x: 0, y: 0 },
      data:      { name: p.name, slug: p.slug, phase: p.phase },
      draggable: false,
    }))

    // Move nodes
    const moveNodes = filteredMoves
      .filter(m => visibleMoveIds.has(m.id))
      .map(m => ({
        id:        `move-${m.id}`,
        type:      'move',
        position:  moveXY[m.id] ?? { x: 0, y: 0 },
        data:      {
          name:      m.name,
          slug:      m.slug,
          isOnBoard: boardMoveIds.has(m.id),
          confidence: progressMap[m.id]?.confidence ?? null,
          onClick:   () => handleMoveClick(m),
        },
        draggable: false,
      }))

    // Edges
    const edgeList = []

    // Track how many aggregate edges share a source/target for curvature offset
    const pairKeys = Object.keys(pairMoves)

    pairKeys.forEach(key => {
      const ms         = pairMoves[key]
      const [fromId, toId] = key.split('__')
      const isExpanded = expandedPairs.has(key)

      // Check if reverse also exists — if so, apply curvature offset
      const reverseKey = `${toId}__${fromId}`
      const hasReverse = !!pairMoves[reverseKey]
      const curvature  = hasReverse ? 0.35 : 0.25

      if (isExpanded) {
        const edgeStyle  = { stroke: 'var(--border-strong)', strokeWidth: 1.5 }
        const markerEnd  = { type: 'ArrowClosed', width: 10, height: 10, color: 'var(--border-strong)' }
        ms.forEach(m => {
          if (!visibleMoveIds.has(m.id)) return
          edgeList.push({
            id: `ein-${m.id}`, source: `pos-${fromId}`, target: `move-${m.id}`,
            type: 'bezier', style: edgeStyle, markerEnd,
          })
          edgeList.push({
            id: `eout-${m.id}`, source: `move-${m.id}`, target: `pos-${toId}`,
            type: 'bezier', style: edgeStyle, markerEnd,
          })
        })
      } else {
        const onBoardCount = ms.filter(m => boardMoveIds.has(m.id)).length
        const confs        = ms.map(m => progressMap[m.id]?.confidence).filter(Boolean)
        const avgConf      = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null

        edgeList.push({
          id:       `agg-${key}`,
          source:   `pos-${fromId}`,
          target:   `pos-${toId}`,
          type:     'aggregate',
          data: {
            count:        ms.length,
            onBoardCount,
            avgConfidence: avgConf,
            curvature,
            isExpanded:   false,
            onToggle:     () => togglePair(key),
          },
        })
      }
    })

    setNodes([...bandNodes, ...posNodes, ...moveNodes])
    setEdges(edgeList)
  }, [filteredPositions, filteredMoves, boardMoveIds, progressMap, expandedPairs, togglePair])

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
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Click pill to expand · Click move for detail</div>
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
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.08}
        maxZoom={2.5}
        style={{ background: 'var(--bg-page)' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border)" gap={28} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={n => {
            if (n.type === 'bandLabel') return 'transparent'
            return n.type === 'position' ? POSITION_COLOR : n.data?.isOnBoard ? MOVE_COLOR : UNDISCOVERED
          }}
          maskColor="rgba(0,0,0,0.05)"
          style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}
        />
      </ReactFlow>
    </div>
  )
}

function LegendItem({ color, label, square }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      {square
        ? <div style={{ width: 13, height: 13, borderRadius: 3, border: `2px solid ${color}`, flexShrink: 0 }} />
        : <div style={{ width: 8,  height: 8,  borderRadius: '50%', background: color, flexShrink: 0 }} />
      }
      <span>{label}</span>
    </div>
  )
}