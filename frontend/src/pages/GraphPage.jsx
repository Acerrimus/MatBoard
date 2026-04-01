import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
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
import { confidenceColor, confidenceBg } from '../components/MoveCard'

// ── Constants ─────────────────────────────────────────────────────────────────
const NODE_W = 152
const NODE_H = 44

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

  positions.forEach(p => g.setNode(p.id, { width: NODE_W, height: NODE_H }))

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
    posXY[p.id] = { x: node.x - NODE_W / 2, y: node.y - NODE_H / 2 }
  })
  return posXY
}

// ── Confidence glow for node background ───────────────────────────────────────
// Derived from the avg confidence of moves from this position.
// Strong → green tint, Weak → red tint, Unrated → neutral.
function nodeGlowStyle(avgConf, hasAnyOnBoard) {
  if (!avgConf && !hasAnyOnBoard) {
    return {
      background:  'rgba(255,255,255,0.03)',
      borderColor: 'rgba(255,255,255,0.1)',
      color:       'var(--text-muted)',
      glow:        'none',
    }
  }
  if (!avgConf && hasAnyOnBoard) {
    return {
      background:  'rgba(139,92,246,0.08)',
      borderColor: 'rgba(139,92,246,0.35)',
      color:       'var(--text-secondary)',
      glow:        '0 0 0 3px rgba(139,92,246,0.08)',
    }
  }
  const color = confidenceColor(avgConf)
  const bg    = confidenceBg(avgConf)
  return {
    background:  bg,
    borderColor: `${color}66`,
    color:       color,
    glow:        `0 0 0 3px ${bg}`,
  }
}

// ── Position node ─────────────────────────────────────────────────────────────
function MapPositionNode({ data }) {
  const { isActive, name, avgConf, hasAnyOnBoard, onClick } = data
  const glow = nodeGlowStyle(avgConf, hasAnyOnBoard)

  return (
    <>
      <Handle type="target" position={Position.Top}  style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />

      <div
        onClick={onClick}
        style={{
          width:          NODE_W,
          height:         NODE_H,
          background:     isActive
            ? 'rgba(220,38,38,0.16)'
            : glow.background,
          border:         isActive
            ? '1.5px solid rgba(220,38,38,0.8)'
            : `1px solid ${glow.borderColor}`,
          borderRadius:   22,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '0 16px',
          cursor:         'pointer',
          transition:     'all 0.15s ease',
          boxShadow:      isActive
            ? '0 0 0 4px rgba(220,38,38,0.12)'
            : glow.glow,
        }}
        onMouseEnter={e => {
          if (!isActive) {
            e.currentTarget.style.background   = 'rgba(220,38,38,0.1)'
            e.currentTarget.style.borderColor  = 'rgba(220,38,38,0.55)'
            e.currentTarget.style.boxShadow    = '0 0 0 3px rgba(220,38,38,0.08)'
          }
        }}
        onMouseLeave={e => {
          if (!isActive) {
            e.currentTarget.style.background   = glow.background
            e.currentTarget.style.borderColor  = glow.borderColor
            e.currentTarget.style.boxShadow    = glow.glow
          }
        }}
      >
        <span style={{
          fontFamily:    'var(--font-display)',
          fontSize:      11,
          fontWeight:    700,
          color:         isActive ? '#DC2626' : glow.color,
          overflow:      'hidden',
          textOverflow:  'ellipsis',
          whiteSpace:    'nowrap',
          pointerEvents: 'none',
          letterSpacing: '0.02em',
          transition:    'color 0.15s ease',
        }}>
          {name}
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
    sourceX, sourceY, targetX, targetY,
    curvature: data.curvature ?? 0.25,
  })

  const onBoard = data.onBoardCount ?? 0
  const color   = data.avgConfidence
    ? confidenceColor(data.avgConfidence)
    : onBoard > 0
    ? '#8B5CF6'
    : 'rgba(255,255,255,0.07)'

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke:      color,
        strokeWidth: onBoard > 0 ? 2 : 1,
        opacity:     onBoard > 0 ? 0.8 : 0.3,
        transition:  'stroke 0.2s ease',
      }}
    />
  )
}

const nodeTypes = { mapPosition: MapPositionNode }
const edgeTypes = { aggregate:  AggregateEdge  }

// ── Position popup ────────────────────────────────────────────────────────────
// Anchored just below the clicked node.
// Strong shadow, confidence-colour top border, clean stats.
// Single CTA: Explore from here.
function PositionPopup({ position, stats, screenPos, onExplore, onClose }) {
  const popupRef = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const avgConf   = stats.avgConfidence
  const confColor = avgConf ? confidenceColor(avgConf) : 'var(--border)'
  const confLabel = avgConf
    ? avgConf >= 4 ? 'Strong'
      : avgConf >= 3 ? 'Developing'
      : 'Needs work'
    : null

  // Keep popup inside viewport horizontally
  const popupW  = 228
  const safeX   = Math.min(
    Math.max(screenPos.x, 8),
    window.innerWidth - popupW - 8,
  )

  return (
    <div
      ref={popupRef}
      style={{
        position:   'fixed',
        left:       safeX,
        top:        screenPos.y,
        zIndex:     30,
        width:      popupW,
        background: 'var(--bg-surface)',
        // Top border encodes confidence state at a glance
        borderTop:  `3px solid ${confColor}`,
        border:     `0.5px solid var(--border)`,
        borderTopWidth: 3,
        borderTopColor: confColor,
        borderRadius:   'var(--radius-lg)',
        boxShadow:  '0 16px 48px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.2)',
        overflow:   'hidden',
        animation:  'popupIn 0.14s ease',
        pointerEvents: 'all',
      }}
    >

      {/* Header */}
      <div style={{
        padding:      '14px 16px 12px',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <div style={{
          fontFamily:    'var(--font-display)',
          fontSize:      15,
          fontWeight:    700,
          color:         'var(--text-primary)',
          letterSpacing: '-0.2px',
          lineHeight:    1.2,
          marginBottom:  confLabel ? 6 : 0,
        }}>
          {position.name}
        </div>

        {/* Confidence label */}
        {confLabel && (
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        6,
            fontSize:   11,
            color:      'var(--text-secondary)',
          }}>
            <div style={{
              width:        6,
              height:       6,
              borderRadius: '50%',
              background:   confColor,
              flexShrink:   0,
            }} />
            <span>
              Your avg:{' '}
              <span style={{ color: confColor, fontWeight: 700 }}>
                {confLabel}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{
        padding: '10px 16px',
        display: 'grid',
        gridTemplateColumns: stats.onBoardCount > 0 ? '1fr 1fr' : '1fr',
        gap:     8,
      }}>
        <div style={{
          background:   'var(--bg-subtle)',
          border:       '0.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding:      '8px 10px',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize:   20,
            fontWeight: 700,
            color:      'var(--text-primary)',
            lineHeight: 1,
          }}>
            {stats.moveCount}
          </div>
          <div style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color:         'var(--text-muted)',
            marginTop:     4,
          }}>
            {stats.moveCount === 1 ? 'move' : 'moves'}
          </div>
        </div>

        {stats.onBoardCount > 0 && (
          <div style={{
            background:   'var(--bg-subtle)',
            border:       '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding:      '8px 10px',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize:   20,
              fontWeight: 700,
              color:      'var(--text-primary)',
              lineHeight: 1,
            }}>
              {stats.onBoardCount}
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
      </div>

      {/* Best technique */}
      {stats.bestMove && (
        <div style={{
          padding:      '0 16px 12px',
          fontSize:     11,
          color:        'var(--text-muted)',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}>
          Best:{' '}
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            {stats.bestMove}
          </span>
        </div>
      )}

      {/* CTA */}
      <div style={{ padding: '0 12px 12px' }}>
        <button
          onClick={onExplore}
          style={{
            width:        '100%',
            padding:      '10px 14px',
            background:   'var(--accent)',
            border:       'none',
            borderRadius: 'var(--radius-md)',
            fontSize:     12,
            fontWeight:   700,
            color:        '#fff',
            cursor:       'pointer',
            fontFamily:   'var(--font-body)',
            boxShadow:    '0 2px 8px rgba(220,38,38,0.3)',
            transition:   'opacity 0.12s ease',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Explore from here →
        </button>
      </div>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────
// Collapsed by default into a ? button.
// Auto-shows for 3 seconds on first visit, then collapses.
function Legend() {
  const [open, setOpen]           = useState(false)
  const shownRef                  = useRef(false)
  const timerRef                  = useRef(null)

  // Auto-show once on mount, then collapse
  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true
    setOpen(true)
    timerRef.current = setTimeout(() => setOpen(false), 3000)
    return () => clearTimeout(timerRef.current)
  }, [])

  const items = [
    { color: '#22C55E',              dot: true, label: 'Strong (4–5)'         },
    { color: 'var(--comp-ready)',    dot: true, label: 'Developing (3)'       },
    { color: '#EF4444',              dot: true, label: 'Needs work (1–2)'     },
    { color: '#8B5CF6',              dot: true, label: 'On kit, unrated'      },
    { color: 'rgba(255,255,255,0.2)', dot: true, label: 'Not explored'        },
  ]

  return (
    <div style={{
      position:    'absolute',
      bottom:      80,
      left:        16,
      zIndex:      10,
      pointerEvents: 'all',
    }}>
      {open && (
        <div style={{
          background:   'var(--bg-surface)',
          border:       '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding:      '12px 14px',
          marginBottom: 8,
          boxShadow:    'var(--shadow-md)',
          animation:    'legendIn 0.15s ease',
        }}>
          <div style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         'var(--text-muted)',
            marginBottom:  10,
          }}>
            Edge colour
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {items.map(({ color, label }) => (
              <div key={label} style={{
                display:    'flex',
                alignItems: 'center',
                gap:        8,
                fontSize:   11,
                color:      'var(--text-secondary)',
              }}>
                <div style={{
                  width:        7,
                  height:       7,
                  borderRadius: '50%',
                  background:   color,
                  flexShrink:   0,
                  border:       color === 'rgba(255,255,255,0.2)'
                    ? '1px solid var(--border-strong)'
                    : 'none',
                }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => {
          clearTimeout(timerRef.current)
          setOpen(prev => !prev)
        }}
        style={{
          width:          28,
          height:         28,
          borderRadius:   '50%',
          background:     open ? 'var(--accent-soft)' : 'var(--bg-surface)',
          border:         `0.5px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          color:          open ? 'var(--accent)' : 'var(--text-muted)',
          fontSize:       11,
          fontWeight:     700,
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontFamily:     'var(--font-display)',
          transition:     'all 0.12s ease',
          boxShadow:      'var(--shadow-sm)',
        }}
      >
        ?
      </button>
    </div>
  )
}

// ── Top bar ───────────────────────────────────────────────────────────────────
// One clean bar: left = back link, centre = style toggle, right = Explore link.
function TopBar({ styles, activeStyle, onStyleChange, onExplore }) {
  return (
    <div style={{
      position:       'absolute',
      top:            0,
      left:           0,
      right:          0,
      zIndex:         10,
      height:         52,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '0 16px',
      background:     'var(--bg-surface)',
      borderBottom:   '0.5px solid var(--border)',
      boxShadow:      '0 1px 4px rgba(0,0,0,0.1)',
      pointerEvents:  'all',
    }}>

      {/* Left: app name / back */}
      <div style={{
        fontFamily:    'var(--font-display)',
        fontSize:      13,
        fontWeight:    700,
        color:         'var(--accent)',
        letterSpacing: '-0.2px',
        userSelect:    'none',
      }}>
        Matboard
      </div>

      {/* Centre: style toggle — only shown when multiple styles exist */}
      {styles.length > 0 && (
        <div style={{
          position:       'absolute',
          left:           '50%',
          transform:      'translateX(-50%)',
          display:        'inline-flex',
          background:     'var(--bg-subtle)',
          border:         '0.5px solid var(--border)',
          borderRadius:   'var(--radius-lg)',
          padding:        3,
          gap:            2,
        }}>
          {['all', ...styles].map(s => {
            const active = activeStyle === s
            return (
              <button
                key={s}
                onClick={() => onStyleChange(s)}
                style={{
                  padding:      '5px 12px',
                  background:   active ? 'var(--bg-surface)' : 'transparent',
                  border:       active ? '0.5px solid var(--border)' : 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize:     11,
                  fontWeight:   active ? 700 : 500,
                  color:        active ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor:       'pointer',
                  fontFamily:   'var(--font-body)',
                  transition:   'all 0.12s ease',
                  whiteSpace:   'nowrap',
                  boxShadow:    active ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {s === 'all' ? 'All' : STYLE_LABELS[s] ?? s}
              </button>
            )
          })}
        </div>
      )}

      {/* Right: jump to Explore */}
      <button
        onClick={onExplore}
        style={{
          background:   'var(--bg-subtle)',
          border:       '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding:      '5px 12px',
          fontSize:     11,
          fontWeight:   600,
          color:        'var(--text-muted)',
          cursor:       'pointer',
          fontFamily:   'var(--font-body)',
          transition:   'all 0.12s ease',
          whiteSpace:   'nowrap',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color       = 'var(--text-primary)'
          e.currentTarget.style.borderColor = 'var(--border-strong)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color       = 'var(--text-muted)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }}
      >
        Explore →
      </button>
    </div>
  )
}

// ── Graph inner ───────────────────────────────────────────────────────────────
function GraphInner({
  rawPositions,
  rawMoves,
  boardMoveIds,
  progressMap,
  activeStyle,
  setActiveStyle,
  styles,
}) {
  const navigate                         = useNavigate()
  const { fitView }                      = useReactFlow()
  const fitQueued                        = useRef(false)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [activePopup, setActivePopup]    = useState(null)
  // { position, stats, screenPos }

  // ── Style filtering ────────────────────────────────────────────────────────
  const filteredMoves = useMemo(() => {
    if (activeStyle === 'all') return rawMoves
    return rawMoves.filter(m =>
      Array.isArray(m.styles) && m.styles.includes(activeStyle)
    )
  }, [rawMoves, activeStyle])

  const filteredPositions = useMemo(() => {
    if (activeStyle === 'all') return rawPositions
    const ids = new Set(
      filteredMoves.flatMap(m => [m.from_position_id, m.to_position_id])
    )
    return rawPositions.filter(p => ids.has(p.id))
  }, [rawPositions, filteredMoves, activeStyle])

  // ── Per-position stats ─────────────────────────────────────────────────────
  const positionStats = useMemo(() => {
    const stats = {}
    filteredPositions.forEach(p => {
      const moves      = filteredMoves.filter(m => m.from_position_id === p.id)
      const onBoard    = moves.filter(m => boardMoveIds.has(m.id))
      const confs      = moves
        .map(m => progressMap[m.id]?.confidence)
        .filter(Boolean)
      const avgConf    = confs.length
        ? confs.reduce((a, b) => a + b, 0) / confs.length
        : null
      const bestMove   = moves
        .filter(m => progressMap[m.id]?.confidence)
        .sort((a, b) =>
          (progressMap[b.id]?.confidence ?? 0) -
          (progressMap[a.id]?.confidence ?? 0)
        )[0]
      stats[p.id] = {
        moveCount:     moves.length,
        onBoardCount:  onBoard.length,
        avgConfidence: avgConf,
        bestMove:      bestMove?.name ?? null,
        hasAnyOnBoard: onBoard.length > 0,
      }
    })
    return stats
  }, [filteredPositions, filteredMoves, boardMoveIds, progressMap])

  // ── Node click ─────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((position, nodeEl) => {
    if (activePopup?.position.id === position.id) {
      setActivePopup(null)
      return
    }
    const rect     = nodeEl?.getBoundingClientRect?.()
    const screenPos = rect
      ? { x: rect.left + rect.width / 2 - 114, y: rect.bottom + 10 }
      : { x: window.innerWidth / 2 - 114,       y: window.innerHeight / 2 }

    setActivePopup({
      position,
      stats:     positionStats[position.id] ?? {
        moveCount: 0, onBoardCount: 0, avgConfidence: null,
        bestMove: null, hasAnyOnBoard: false,
      },
      screenPos,
    })
  }, [activePopup, positionStats])

  // ── Build nodes + edges ────────────────────────────────────────────────────
  useEffect(() => {
    if (!filteredPositions.length) return

    const posXY    = buildDagreLayout(filteredPositions, filteredMoves)
    const newNodes = []
    const newEdges = []

    filteredPositions.forEach(p => {
      const pStats = positionStats[p.id] ?? {}
      newNodes.push({
        id:        `pos-${p.id}`,
        type:      'mapPosition',
        position:  posXY[p.id] ?? { x: 0, y: 0 },
        draggable: false,
        data: {
          name:          p.name,
          isActive:      activePopup?.position.id === p.id,
          avgConf:       pStats.avgConfidence ?? null,
          hasAnyOnBoard: pStats.hasAnyOnBoard ?? false,
          onClick:       (e) => handleNodeClick(p, e?.currentTarget),
        },
      })
    })

    // Group moves by position pair for aggregate edges
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
      const confs          = ms
        .map(m => progressMap[m.id]?.confidence)
        .filter(Boolean)
      const avgConf        = confs.length
        ? confs.reduce((a, b) => a + b, 0) / confs.length
        : null

      newEdges.push({
        id:     `agg-${key}`,
        source: `pos-${fromId}`,
        target: `pos-${toId}`,
        type:   'aggregate',
        data: {
          count:         ms.length,
          onBoardCount,
          avgConfidence: avgConf,
          curvature:     hasReverse ? 0.35 : 0.2,
        },
      })
    })

    setNodes(newNodes)
    setEdges(newEdges)
    fitQueued.current = true
  }, [
    filteredPositions, filteredMoves,
    boardMoveIds, progressMap,
    activePopup, handleNodeClick,
    positionStats,
  ])

  // ── Fit view after nodes settle ────────────────────────────────────────────
  useEffect(() => {
    if (!fitQueued.current) return
    const t = setTimeout(() => {
      fitView({ padding: 0.28, duration: 400 })
      fitQueued.current = false
    }, 50)
    return () => clearTimeout(t)
  }, [nodes, fitView])

  // ── Close popup on style change ────────────────────────────────────────────
  useEffect(() => { setActivePopup(null) }, [activeStyle])

  return (
    <div style={{
      height:   '100dvh',
      position: 'relative',
      // Push canvas below the top bar
      paddingTop: 52,
      boxSizing: 'border-box',
    }}>

      {/* Top bar */}
      <TopBar
        styles={styles}
        activeStyle={activeStyle}
        onStyleChange={setActiveStyle}
        onExplore={() => navigate('/explore')}
      />

      {/* ReactFlow canvas */}
      <div style={{ height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.28 }}
          minZoom={0.06}
          maxZoom={2.5}
          style={{ background: 'var(--bg-page)' }}
          proOptions={{ hideAttribution: true }}
          nodesFocusable={false}
          nodesConnectable={false}
          onNodeClick={(event, node) => {
            if (node.data?.onClick) node.data.onClick(event)
          }}
          // Close popup when clicking canvas background
          onPaneClick={() => setActivePopup(null)}
        >
          <Background
            color="var(--border)"
            gap={32}
            size={0.6}
            style={{ opacity: 0.5 }}
          />
          <Controls
            showInteractive={false}
            style={{
              background:   'var(--bg-surface)',
              border:       '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow:    'var(--shadow-sm)',
            }}
          />
        </ReactFlow>
      </div>

      {/* Legend — collapsed by default */}
      <Legend />

      {/* Position popup */}
      {activePopup && (
        <PositionPopup
          position={activePopup.position}
          stats={activePopup.stats}
          screenPos={activePopup.screenPos}
          onExplore={() => {
            navigate(`/explore?position=${activePopup.position.slug}`)
            setActivePopup(null)
          }}
          onClose={() => setActivePopup(null)}
        />
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes popupIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes legendIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        /* Override ReactFlow control button styles to match design system */
        .react-flow__controls-button {
          background: var(--bg-surface) !important;
          border-bottom: 0.5px solid var(--border) !important;
          fill: var(--text-muted) !important;
          transition: fill 0.12s ease !important;
        }
        .react-flow__controls-button:hover {
          background: var(--bg-subtle) !important;
          fill: var(--text-primary) !important;
        }
      `}</style>
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
        setBoardMoveIds(new Set(boardData.map(i => i.move.id)))
        const pm = {}
        progressData.forEach(p => { pm[p.move_id] = p })
        setRawPositions(graphData.positions)
        setRawMoves(graphData.moves)
        setProgressMap(pm)
      })
      .catch(() => setError('Could not load graph. Check your connection.'))
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
      height:         '100%',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            12,
      color:          'var(--text-muted)',
    }}>
      <div style={{
        width:        32,
        height:       32,
        borderRadius: '50%',
        border:       '2.5px solid var(--border)',
        borderTopColor: 'var(--accent)',
        animation:    'graphSpin 0.7s linear infinite',
      }} />
      <span style={{ fontSize: 12, fontWeight: 500 }}>
        Loading graph...
      </span>
      <style>{`
        @keyframes graphSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )

  if (error) return (
    <div style={{
      height:         '100%',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            8,
      padding:        24,
      textAlign:      'center',
    }}>
      <div style={{
        fontSize:   13,
        fontWeight: 600,
        color:      'var(--accent)',
      }}>
        {error}
      </div>
    </div>
  )

  return (
    <ReactFlowProvider>
      <GraphInner
        rawPositions={rawPositions}
        rawMoves={rawMoves}
        boardMoveIds={boardMoveIds}
        progressMap={progressMap}
        activeStyle={activeStyle}
        setActiveStyle={setActiveStyle}
        styles={styles}
      />
    </ReactFlowProvider>
  )
}