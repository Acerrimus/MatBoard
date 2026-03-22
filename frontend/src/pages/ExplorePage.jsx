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
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getGraph, getMyBoard, getMyProgress, getMove } from '../api'
import { confidenceColor } from '../components/MoveCard'
import MoveDetail from '../components/MoveDetail'

// ── Constants ─────────────────────────────────────────────────────────────────
const NODE_W         = 160
const NODE_H         = 48
const H_GAP          = 60
const POSITION_COLOR = '#DC2626'
const MOVE_COLOR     = '#3B82F6'
const UNDISCOVERED   = '#A1A1AA'

const BAND_Y = { standing: 0, transition: 500, ground: 1000 }
const BAND_LABEL = { standing: 'Standing', transition: 'Transitions', ground: 'Ground' }
const PHASE_ORDER = ['standing', 'transition', 'ground']

// ── Layout: Position Map ──────────────────────────────────────────────────────
function buildMapLayout(positions, moves) {
  const connectivity = {}
  positions.forEach(p => { connectivity[p.id] = 0 })
  moves.forEach(m => {
    if (connectivity[m.from_position_id] !== undefined) connectivity[m.from_position_id]++
    if (connectivity[m.to_position_id]   !== undefined) connectivity[m.to_position_id]++
  })

  const byPhase = { standing: [], transition: [], ground: [] }
  positions.forEach(p => {
    const ph = p.phase ?? 'ground'
    if (!byPhase[ph]) byPhase[ph] = []
    byPhase[ph].push(p)
  })
  PHASE_ORDER.forEach(phase => {
    byPhase[phase]?.sort((a, b) => {
      const d = (connectivity[b.id] ?? 0) - (connectivity[a.id] ?? 0)
      return d !== 0 ? d : a.name.localeCompare(b.name)
    })
  })

  const posXY = {}
  PHASE_ORDER.forEach(phase => {
    const ps     = byPhase[phase] ?? []
    const totalW = ps.length * NODE_W + (ps.length - 1) * H_GAP
    const startX = -totalW / 2
    const bandY  = BAND_Y[phase] ?? 0
    ps.forEach((p, i) => {
      posXY[p.id] = { x: startX + i * (NODE_W + H_GAP), y: bandY }
    })
  })

  return posXY
}

// ── Layout: Focus Mode ────────────────────────────────────────────────────────
function buildFocusLayout(focusPosition, moves, positions) {
  const myMoves = moves.filter(m => m.from_position_id === focusPosition.id)
  const destIds = [...new Set(myMoves.map(m => m.to_position_id))]
  const destPositions = destIds
    .map(id => positions.find(p => p.id === id))
    .filter(Boolean)

  const nodes = []
  const edges = []

  // Focus position — centred at top
  const focusX = 0
  const focusY = 0
  nodes.push({
    id:        `pos-${focusPosition.id}`,
    type:      'focusCenter',
    position:  { x: focusX - NODE_W / 2, y: focusY },
    data:      { name: focusPosition.name, slug: focusPosition.slug },
    draggable: false,
  })

  // Move nodes — row below focus position
  const MOVE_ROW_Y  = 160
  const MOVE_H_GAP  = 40
  const totalMovesW = myMoves.length * NODE_W + (myMoves.length - 1) * MOVE_H_GAP
  const moveStartX  = -totalMovesW / 2

  const moveXY = {}
  myMoves.forEach((m, i) => {
    const x = moveStartX + i * (NODE_W + MOVE_H_GAP)
    moveXY[m.id] = { x, y: MOVE_ROW_Y }
    nodes.push({
      id:        `move-${m.id}`,
      type:      'focusMove',
      position:  { x, y: MOVE_ROW_Y },
      data:      { move: m },
      draggable: false,
    })
    // Edge: focus → move
    edges.push({
      id:     `e-fm-${m.id}`,
      source: `pos-${focusPosition.id}`,
      target: `move-${m.id}`,
      type:   'straight',
      style:  { stroke: 'var(--border)', strokeWidth: 1.5 },
    })
  })

  // Destination position nodes — row below moves
  const DEST_ROW_Y  = 340
  const DEST_H_GAP  = 40
  const totalDestW  = destPositions.length * NODE_W + (destPositions.length - 1) * DEST_H_GAP
  const destStartX  = -totalDestW / 2

  destPositions.forEach((dest, i) => {
    const x = destStartX + i * (NODE_W + DEST_H_GAP)
    nodes.push({
      id:        `dest-${dest.id}`,
      type:      'focusDest',
      position:  { x, y: DEST_ROW_Y },
      data:      { position: dest },
      draggable: false,
    })

    // Edges: relevant moves → this dest
    const movesToDest = myMoves.filter(m => m.to_position_id === dest.id)
    movesToDest.forEach(m => {
      edges.push({
        id:     `e-md-${m.id}-${dest.id}`,
        source: `move-${m.id}`,
        target: `dest-${dest.id}`,
        type:   'straight',
        style:  { stroke: 'var(--border)', strokeWidth: 1.5 },
        markerEnd: { type: 'ArrowClosed', width: 10, height: 10, color: 'var(--border)' },
      })
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
          background: 'var(--bg-surface)',
          border: `2px solid ${POSITION_COLOR}`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 14px',
          cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-soft)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
      >
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13, fontWeight: 700,
          color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {data.name}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right}  style={{ opacity: 0 }} />
    </>
  )
}

// ── Map: Band label node ──────────────────────────────────────────────────────
function BandLabelNode({ data }) {
  return (
    <div style={{ pointerEvents: 'none', userSelect: 'none', width: 200 }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 10, fontWeight: 600,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--text-muted)', opacity: 0.6,
        marginBottom: 6,
      }}>
        {data.label}
      </div>
      <div style={{ width: 120, height: 1, background: 'var(--border)', opacity: 0.4 }} />
    </div>
  )
}

// ── Map: Aggregate edge ───────────────────────────────────────────────────────
function AggregateEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
  const curvature = data.curvature ?? 0.25
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY, curvature })

  const onBoard = data.onBoardCount ?? 0
  const avg     = data.avgConfidence
  const color   = avg
    ? confidenceColor(avg)
    : onBoard > 0 ? '#7C3AED' : 'var(--border-strong)'

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: color,
        strokeWidth: onBoard > 0 ? 2.5 : 1.5,
        opacity: onBoard > 0 ? 0.85 : 0.25,
      }}
    />
  )
}

// ── Focus: Centre node ────────────────────────────────────────────────────────
function FocusCenterNode({ data }) {
  return (
    <>
      <div style={{
        width: NODE_W + 40, height: NODE_H + 12,
        background: 'var(--accent-soft)',
        border: `2.5px solid ${POSITION_COLOR}`,
        borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
        userSelect: 'none',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 15, fontWeight: 700,
          color: 'var(--accent)',
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
  return (
    <>
      <Handle type="target" position={Position.Top}    style={{ opacity: 0 }} />
      <div
        onClick={data.move.onClickDetail}
        style={{
          width: NODE_W, height: NODE_H,
          background: data.move.isOnBoard ? 'rgba(59,130,246,0.07)' : 'var(--bg-surface)',
          border: `2px solid ${data.move.isOnBoard ? MOVE_COLOR : UNDISCOVERED}`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center',
          padding: '0 10px', gap: 8,
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: 6, flexShrink: 0,
          background: data.move.isOnBoard ? 'rgba(59,130,246,0.1)' : 'var(--bg-subtle)',
          border: `1px solid ${data.move.isOnBoard ? 'rgba(59,130,246,0.25)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: data.move.confidence
              ? confidenceColor(data.move.confidence)
              : data.move.isOnBoard ? '#7C3AED' : 'var(--border)',
          }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11, fontWeight: 500,
          color: data.move.isOnBoard ? 'var(--text-primary)' : 'var(--text-muted)',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {data.move.name}
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
      <div
        onClick={data.position.onDrillDown}
        style={{
          width: NODE_W, height: NODE_H,
          background: 'var(--bg-surface)',
          border: `2px solid ${POSITION_COLOR}`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 14px',
          cursor: 'pointer',
          transition: 'background 0.15s',
          opacity: 0.8,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--accent-soft)'
          e.currentTarget.style.opacity = '1'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--bg-surface)'
          e.currentTarget.style.opacity = '0.8'
        }}
      >
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 12, fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {data.position.name} →
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  )
}

const nodeTypes = {
  mapPosition: MapPositionNode,
  bandLabel:   BandLabelNode,
  focusCenter: FocusCenterNode,
  focusMove:   FocusMoveNode,
  focusDest:   FocusDestNode,
}
const edgeTypes = { aggregate: AggregateEdge }

// ── Inner component (needs ReactFlow context) ─────────────────────────────────
function ExploreInner({
  rawPositions, rawMoves, boardMoveIds, setBoardMoveIds,
  progressMap, setProgressMap,
  activeSport, setActiveSport, sports,
  panelMove, setPanelMove,
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [focusTrail, setFocusTrail]      = useState([]) // array of position objects
  const { fitView }                      = useReactFlow()
  const isFirstLoad                      = useRef(true)

  const filteredMoves = useMemo(() => {
    if (activeSport === 'all') return rawMoves
    return rawMoves.filter(m => (m.sport ?? 'wrestling') === activeSport)
  }, [rawMoves, activeSport])

  const filteredPositions = useMemo(() => {
    if (activeSport === 'all') return rawPositions
    const ids = new Set(filteredMoves.flatMap(m => [m.from_position_id, m.to_position_id]))
    return rawPositions.filter(p => ids.has(p.id))
  }, [rawPositions, filteredMoves, activeSport])

  const focusPosition = focusTrail.length > 0 ? focusTrail[focusTrail.length - 1] : null

  // ── Enter focus ─────────────────────────────────────────────────────────────
  const enterFocus = useCallback((position) => {
    setFocusTrail(prev => [...prev, position])
  }, [])

  const exitFocus = useCallback((index) => {
    setFocusTrail(prev => prev.slice(0, index))
  }, [])

  // ── Move click ──────────────────────────────────────────────────────────────
  const handleMoveClick = useCallback(async (move) => {
    try {
      const full = await getMove(move.slug)
      setPanelMove(full)
    } catch {
      setPanelMove(move)
    }
  }, [setPanelMove])

  // ── Build graph ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!filteredPositions.length) return

    let newNodes = []
    let newEdges = []

    if (focusPosition) {
      // ── Focus mode ──────────────────────────────────────────────────────────
      const { nodes: fNodes, edges: fEdges } = buildFocusLayout(
        focusPosition, filteredMoves, filteredPositions
      )

      // Enrich move nodes with board/progress data and click handlers
      newNodes = fNodes.map(n => {
        if (n.type === 'focusMove') {
          const m = n.data.move
          return {
            ...n,
            data: {
              move: {
                ...m,
                isOnBoard:       boardMoveIds.has(m.id),
                confidence:      progressMap[m.id]?.confidence ?? null,
                onClickDetail:   () => handleMoveClick(m),
              },
            },
          }
        }
        if (n.type === 'focusDest') {
          const pos = n.data.position
          return {
            ...n,
            data: {
              position: {
                ...pos,
                onDrillDown: () => enterFocus(pos),
              },
            },
          }
        }
        return n
      })
      newEdges = fEdges

    } else {
      // ── Map mode ────────────────────────────────────────────────────────────
      const posXY = buildMapLayout(filteredPositions, filteredMoves)

      // Band labels
      PHASE_ORDER.forEach(phase => {
        newNodes.push({
          id:          `band-${phase}`,
          type:        'bandLabel',
          position:    { x: -700, y: (BAND_Y[phase] ?? 0) - 12 },
          data:        { label: BAND_LABEL[phase] },
          draggable:   false,
          selectable:  false,
          connectable: false,
        })
      })

      // Position nodes
      filteredPositions.forEach(p => {
        newNodes.push({
          id:        `pos-${p.id}`,
          type:      'mapPosition',
          position:  posXY[p.id] ?? { x: 0, y: 0 },
          data:      {
            name:    p.name,
            slug:    p.slug,
            onFocus: () => enterFocus(p),
          },
          draggable: false,
        })
      })

      // Aggregate edges
      const pairMoves = {}
      filteredMoves.forEach(m => {
        const key = `${m.from_position_id}__${m.to_position_id}`
        if (!pairMoves[key]) pairMoves[key] = []
        pairMoves[key].push(m)
      })

      Object.entries(pairMoves).forEach(([key, ms]) => {
        const [fromId, toId] = key.split('__')
        const reverseKey     = `${toId}__${fromId}`
        const hasReverse     = !!pairMoves[reverseKey]
        const curvature      = hasReverse ? 0.35 : 0.2

        const onBoardCount = ms.filter(m => boardMoveIds.has(m.id)).length
        const confs        = ms.map(m => progressMap[m.id]?.confidence).filter(Boolean)
        const avgConf      = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null

        newEdges.push({
          id:     `agg-${key}`,
          source: `pos-${fromId}`,
          target: `pos-${toId}`,
          type:   'aggregate',
          data:   { count: ms.length, onBoardCount, avgConfidence: avgConf, curvature },
        })
      })
    }

    setNodes(newNodes)
    setEdges(newEdges)

    // Fit view on mode change or first load, not on board/progress updates
    const shouldFit = isFirstLoad.current || focusTrail !== undefined
    setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 50)
    isFirstLoad.current = false

  }, [filteredPositions, filteredMoves, focusPosition, boardMoveIds, progressMap, enterFocus, handleMoveClick, fitView])

  const handleBoardChange = useCallback((moveId, added) => {
    setBoardMoveIds(prev => {
      const next = new Set(prev)
      added ? next.add(moveId) : next.delete(moveId)
      return next
    })
  }, [setBoardMoveIds])

  const handleProgressChange = useCallback((moveId, progressData) => {
    setProgressMap(prev => {
      const next = { ...prev }
      if (progressData === null) delete next[moveId]
      else next[moveId] = progressData
      return next
    })
  }, [setProgressMap])

  return (
    <div style={{ height: '100%', position: 'relative' }}>

      {/* Top bar: breadcrumb + sport filter */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '6px 12px', pointerEvents: 'all',
        maxWidth: '80vw', flexWrap: 'wrap',
      }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => exitFocus(0)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              color: focusTrail.length === 0 ? 'var(--accent)' : 'var(--text-muted)',
              fontFamily: 'var(--font-body)', padding: '0 4px',
            }}
          >
            All Positions
          </button>
          {focusTrail.map((pos, i) => (
            <span key={pos.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: 'var(--border-strong)', fontSize: 10 }}>›</span>
              <button
                onClick={() => exitFocus(i + 1)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  color: i === focusTrail.length - 1 ? 'var(--accent)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)', padding: '0 4px',
                }}
              >
                {pos.name}
              </button>
            </span>
          ))}
        </div>

        {/* Divider */}
        {sports.length > 1 && (
          <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />
        )}

        {/* Sport filter */}
        {sports.length > 1 && sports.map(s => (
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

      {/* Mode hint */}
      {!focusPosition && (
        <div style={{
          position: 'absolute', top: 68, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, fontSize: 11, color: 'var(--text-muted)',
          background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '4px 12px',
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          Click a position to explore its moves
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 80, left: 16, zIndex: 10,
        background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '10px 14px',
        display: 'flex', flexDirection: 'column', gap: 6,
        fontSize: 11, color: 'var(--text-secondary)', pointerEvents: 'none',
      }}>
        {focusPosition ? (
          <>
            <LegendItem square color={POSITION_COLOR} label="Position (click to drill down)" />
            <LegendItem square color={MOVE_COLOR}     label="Move (on board)" />
            <LegendItem square color={UNDISCOVERED}   label="Move (undiscovered)" />
            <div style={{ height: '0.5px', background: 'var(--border)', margin: '2px 0' }} />
            <LegendItem dot color="#22C55E" label="Confidence 4–5" />
            <LegendItem dot color="#F59E0B" label="Confidence 3" />
            <LegendItem dot color="#EF4444" label="Confidence 1–2" />
            <LegendItem dot color="#7C3AED" label="On board, unrated" />
          </>
        ) : (
          <>
            <LegendItem square color={POSITION_COLOR} label="Position (click to explore)" />
            <div style={{ height: '0.5px', background: 'var(--border)', margin: '2px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Edge colour = avg confidence</div>
              <LegendItem dot color="#22C55E" label="Strong (4–5)" />
              <LegendItem dot color="#F59E0B" label="Developing (3)" />
              <LegendItem dot color="#EF4444" label="Weak (1–2)" />
              <LegendItem dot color="#7C3AED" label="On board, unrated" />
              <LegendItem dot color="var(--border-strong)" label="Not explored" />
            </div>
          </>
        )}
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
            if (n.type === 'mapPosition' || n.type === 'focusCenter' || n.type === 'focusDest') return POSITION_COLOR
            return n.data?.move?.isOnBoard ? MOVE_COLOR : UNDISCOVERED
          }}
          maskColor="rgba(0,0,0,0.05)"
          style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}
        />
      </ReactFlow>
    </div>
  )
}

// ── Page (wrapper provides ReactFlow context) ─────────────────────────────────
export default function ExplorePage() {
  const [rawPositions, setRawPositions] = useState([])
  const [rawMoves, setRawMoves]         = useState([])
  const [boardMoveIds, setBoardMoveIds] = useState(new Set())
  const [progressMap, setProgressMap]   = useState({})
  const [activeSport, setActiveSport]   = useState('all')
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

  const sports = useMemo(() => {
    const set = new Set(rawMoves.map(m => m.sport ?? 'wrestling'))
    return set.size > 1 ? ['all', ...Array.from(set)] : []
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
    <ReactFlowProvider>
      <ExploreInner
        rawPositions={rawPositions}
        rawMoves={rawMoves}
        boardMoveIds={boardMoveIds}
        setBoardMoveIds={setBoardMoveIds}
        progressMap={progressMap}
        setProgressMap={setProgressMap}
        activeSport={activeSport}
        setActiveSport={setActiveSport}
        sports={sports}
        panelMove={panelMove}
        setPanelMove={setPanelMove}
      />
    </ReactFlowProvider>
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