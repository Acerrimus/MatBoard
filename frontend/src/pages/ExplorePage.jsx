import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getGraph, getMyBoard, getMyProgress, getMove } from '../api'
import { confidenceColor } from '../components/MoveCard'
import MoveDetail from '../components/MoveDetail'

// ── Constants ─────────────────────────────────────────────────────────────────
const POSITION_W = 140
const POSITION_H = 48
const MOVE_W     = 140
const MOVE_H     = 48
const H_GAP      = 60   // horizontal gap between nodes
const V_GAP      = 80   // vertical gap between rows
const MOVE_OFFSET = 30  // vertical offset for move nodes between levels

// ── Position node ─────────────────────────────────────────────────────────────
function PositionNode({ data }) {
  return (
    <>
      <Handle type="target" position={Position.Top}    style={{ opacity: 0 }} />
      <div style={{
        width: POSITION_W,
        height: POSITION_H,
        background: 'var(--bg-surface)',
        border: `2px solid var(--accent)`,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 12px',
        cursor: 'default',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-primary)',
          textAlign: 'center',
          lineHeight: 1.3,
          letterSpacing: '-0.2px',
        }}>
          {data.name}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  )
}

// ── Move node ─────────────────────────────────────────────────────────────────
function MoveNode({ data }) {
  const isOnBoard  = data.isOnBoard
  const confidence = data.confidence ?? null
  const dotColor   = confidence ? confidenceColor(confidence) : (isOnBoard ? '#7C3AED' : 'var(--border)')
  const borderColor = isOnBoard ? '#3B82F6' : 'var(--border)'
  const bgColor     = isOnBoard ? 'rgba(59,130,246,0.06)' : 'var(--bg-surface)'

  return (
    <>
      <Handle type="target" position={Position.Top}    style={{ opacity: 0 }} />
      <div
        onClick={data.onClick}
        style={{
          width: MOVE_W,
          height: MOVE_H,
          background: bgColor,
          border: `2px solid ${borderColor}`,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          cursor: 'pointer',
          transition: 'border-color 0.15s ease, background 0.15s ease',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 500,
          color: isOnBoard ? 'var(--text-primary)' : 'var(--text-muted)',
          lineHeight: 1.3,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginRight: 6,
        }}>
          {data.name}
        </span>
        {/* Confidence dot */}
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
          border: isOnBoard ? 'none' : '1px solid var(--border)',
        }} />
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  )
}

const nodeTypes = {
  position: PositionNode,
  move:     MoveNode,
}

// ── Layout algorithm ──────────────────────────────────────────────────────────
function computeLayout(positions, moves) {
  // Build adjacency: which positions are reachable from each position via a move
  const posById = Object.fromEntries(positions.map(p => [p.id, p]))

  // BFS from neutral to assign depth levels to positions
  const neutral = positions.find(p => p.slug === 'neutral') ?? positions[0]
  const depthMap = {}   // posId → depth
  const queue    = [neutral.id]
  depthMap[neutral.id] = 0

  // Build position → next positions map
  const posToPos = {}
  moves.forEach(m => {
    if (!posToPos[m.from_position_id]) posToPos[m.from_position_id] = new Set()
    posToPos[m.from_position_id].add(m.to_position_id)
  })

  while (queue.length) {
    const current = queue.shift()
    const neighbors = posToPos[current] ?? new Set()
    neighbors.forEach(nid => {
      if (depthMap[nid] === undefined) {
        depthMap[nid] = depthMap[current] + 1
        queue.push(nid)
      }
    })
  }

  // Assign any unreached positions to depth = max + 1
  const maxDepth = Math.max(0, ...Object.values(depthMap))
  positions.forEach(p => {
    if (depthMap[p.id] === undefined) depthMap[p.id] = maxDepth + 1
  })

  // Group positions by depth
  const byDepth = {}
  positions.forEach(p => {
    const d = depthMap[p.id]
    if (!byDepth[d]) byDepth[d] = []
    byDepth[d].push(p)
  })

  // Assign x/y to position nodes
  const posXY = {}
  Object.entries(byDepth).forEach(([depth, ps]) => {
    const d      = parseInt(depth)
    const total  = ps.length
    const totalW = total * POSITION_W + (total - 1) * H_GAP
    ps.forEach((p, i) => {
      posXY[p.id] = {
        x: i * (POSITION_W + H_GAP) - totalW / 2 + POSITION_W / 2,
        y: d * (POSITION_H + V_GAP * 2),
      }
    })
  })

  // Assign x/y to move nodes — midpoint between from and to positions, offset down
  const moveXY = {}
  moves.forEach(m => {
    const from = posXY[m.from_position_id]
    const to   = posXY[m.to_position_id]
    if (!from || !to) {
      // fallback if position not found
      moveXY[m.id] = { x: 0, y: 0 }
      return
    }
    moveXY[m.id] = {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2 - MOVE_H / 2,
    }
  })

  return { posXY, moveXY }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading]            = useState(true)
  const [error, setError]                = useState(null)

  const [boardMoveIds, setBoardMoveIds] = useState(new Set())
  const [progressMap, setProgressMap]   = useState({})

  const [selectedMove, setSelectedMove] = useState(null)
  const [panelMove, setPanelMove]       = useState(null) // full move with positions

  // ── Load graph data ─────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([getGraph(), getMyBoard(), getMyProgress()])
      .then(([graphData, boardData, progressData]) => {
        const boardIds = new Set(boardData.map(i => i.move.id))
        const pm = {}
        progressData.forEach(p => { pm[p.move_id] = p })

        setBoardMoveIds(boardIds)
        setProgressMap(pm)

        buildGraph(graphData.positions, graphData.moves, boardIds, pm)
      })
      .catch(() => setError('Could not load graph.'))
      .finally(() => setLoading(false))
  }, [])

  // ── Build nodes + edges ─────────────────────────────────────────────────────
  const buildGraph = useCallback((positions, moves, boardIds, pm) => {
    const { posXY, moveXY } = computeLayout(positions, moves)

    const posNodes = positions.map(p => ({
      id:       `pos-${p.id}`,
      type:     'position',
      position: posXY[p.id] ?? { x: 0, y: 0 },
      data:     { name: p.name, slug: p.slug },
      draggable: true,
    }))

    const moveNodes = moves.map(m => ({
      id:       `move-${m.id}`,
      type:     'move',
      position: moveXY[m.id] ?? { x: 0, y: 0 },
      data:     {
        name:             m.name,
        slug:             m.slug,
        from_position_id: m.from_position_id,
        to_position_id:   m.to_position_id,
        isOnBoard:        boardIds.has(m.id),
        confidence:       pm[m.id]?.confidence ?? null,
        onClick:          () => handleMoveClick(m),
      },
      draggable: true,
    }))

    const edgeStyle = {
      stroke: 'var(--border-strong)',
      strokeWidth: 1.5,
    }

    const edgeList = moves.flatMap(m => [
      {
        id:           `e-from-${m.id}`,
        source:       `pos-${m.from_position_id}`,
        target:       `move-${m.id}`,
        style:        edgeStyle,
        animated:     false,
      },
      {
        id:           `e-to-${m.id}`,
        source:       `move-${m.id}`,
        target:       `pos-${m.to_position_id}`,
        style:        edgeStyle,
        animated:     false,
      },
    ])

    setNodes([...posNodes, ...moveNodes])
    setEdges(edgeList)
  }, [])

  // ── Move click ──────────────────────────────────────────────────────────────
  const handleMoveClick = async (move) => {
    try {
      const full = await getMove(move.slug)
      setPanelMove(full)
    } catch {
      setPanelMove(move)
    }
  }

  // ── Board/progress callbacks ────────────────────────────────────────────────
  const handleBoardChange = useCallback((moveId, added) => {
    setBoardMoveIds(prev => {
      const next = new Set(prev)
      added ? next.add(moveId) : next.delete(moveId)
      return next
    })
    setNodes(nds => nds.map(n => {
      if (n.id !== `move-${moveId}`) return n
      return {
        ...n,
        data: { ...n.data, isOnBoard: added },
      }
    }))
  }, [setNodes])

  const handleProgressChange = useCallback((moveId, progressData) => {
    setProgressMap(prev => {
      const next = { ...prev }
      if (progressData === null) delete next[moveId]
      else next[moveId] = progressData
      return next
    })
    setNodes(nds => nds.map(n => {
      if (n.id !== `move-${moveId}`) return n
      return {
        ...n,
        data: { ...n.data, confidence: progressData?.confidence ?? null },
      }
    }))
  }, [setNodes])

  // ── Navigate to position (from MoveDetail "to" link) ───────────────────────
  const handleNavigateToPosition = useCallback((pos) => {
    // Just close the panel — user can see the position on the graph
    setPanelMove(null)
  }, [])

  if (loading) return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-muted)',
      fontSize: 13,
    }}>
      Loading graph...
    </div>
  )

  if (error) return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--accent)',
      fontSize: 13,
    }}>
      {error}
    </div>
  )

  return (
    <div style={{ height: '100%', position: 'relative' }}>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        fontSize: 11,
        color: 'var(--text-secondary)',
        pointerEvents: 'none',
      }}>
        <LegendItem color="var(--accent)"  label="Position"         border />
        <LegendItem color="#3B82F6"        label="Move (on board)"  border />
        <LegendItem color="var(--border)"  label="Move (undiscovered)" border />
        <div style={{ height: '0.5px', background: 'var(--border)', margin: '2px 0' }} />
        <LegendItem color="#22C55E" label="Confidence 4-5" dot />
        <LegendItem color="#F59E0B" label="Confidence 3"   dot />
        <LegendItem color="#EF4444" label="Confidence 1-2" dot />
        <LegendItem color="#7C3AED" label="On board, unrated" dot />
      </div>

      {/* MoveDetail panel */}
      {panelMove && (
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 420,
          maxHeight: 'calc(100% - 32px)',
          overflowY: 'auto',
          zIndex: 10,
        }}>
          <MoveDetail
            move={panelMove}
            onNavigate={handleNavigateToPosition}
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
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        style={{ background: 'var(--bg-page)' }}
      >
        <Background color="var(--border)" gap={24} size={1} />
        <Controls style={{
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)',
        }} />
      </ReactFlow>
    </div>
  )
}

function LegendItem({ color, label, border, dot }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      {dot ? (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: color, flexShrink: 0,
        }} />
      ) : (
        <div style={{
          width: 14, height: 14,
          borderRadius: 3,
          border: `2px solid ${color}`,
          background: 'transparent',
          flexShrink: 0,
        }} />
      )}
      <span>{label}</span>
    </div>
  )
}