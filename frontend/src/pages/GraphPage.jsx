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

// ── Node confidence glow ──────────────────────────────────────────────────────
// Encodes avg confidence of moves from this position into
// the node's background, border, and shadow.
function nodeStyle(avgConf, hasAnyOnBoard, isActive) {
  if (isActive) {
    return {
      background:  'var(--accent-glow-lg)',
      borderColor: 'var(--accent)',
      borderWidth: '1.5px',
      color:       'var(--accent)',
      shadow:      '0 0 0 4px var(--accent-glow-sm)',
    }
  }
  if (!avgConf && !hasAnyOnBoard) {
    return {
      background:  'var(--bg-subtle)',
      borderColor: 'var(--border)',
      borderWidth: '1px',
      color:       'var(--text-muted)',
      shadow:      'none',
    }
  }
  if (!avgConf && hasAnyOnBoard) {
    return {
      background:  'var(--move-color-bg)',
      borderColor: 'var(--move-color)',
      borderWidth: '1px',
      color:       'var(--move-color)',
      shadow:      '0 0 0 3px var(--move-color-bg)',
    }
  }
  const color = confidenceColor(avgConf)
  const bg    = confidenceBg(avgConf)
  return {
    background:  bg,
    borderColor: `${color}66`,
    borderWidth: '1px',
    color:       color,
    shadow:      `0 0 0 3px ${bg}`,
  }
}

// ── Position node ─────────────────────────────────────────────────────────────
function MapPositionNode({ data }) {
  const { name, isActive, avgConf, hasAnyOnBoard, onClick } = data
  const s = nodeStyle(avgConf, hasAnyOnBoard, isActive)

  return (
    <>
      <Handle type="target" position={Position.Top}  style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div
        onClick={onClick}
        style={{
          width:          NODE_W,
          height:         NODE_H,
          background:     s.background,
          border:         `${s.borderWidth} solid ${s.borderColor}`,
          borderRadius:   22,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '0 16px',
          cursor:         'pointer',
          transition:     'all 0.15s ease',
          boxShadow:      s.shadow,
        }}
        onMouseEnter={e => {
          if (!isActive) {
            e.currentTarget.style.background  = 'rgba(220,38,38,0.1)'
            e.currentTarget.style.borderColor = 'rgba(220,38,38,0.55)'
            e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(220,38,38,0.08)'
          }
        }}
        onMouseLeave={e => {
          if (!isActive) {
            e.currentTarget.style.background  = s.background
            e.currentTarget.style.borderColor = s.borderColor
            e.currentTarget.style.boxShadow   = s.shadow
          }
        }}
      >
        <span style={{
          fontFamily:    'var(--font-display)',
          fontSize:      11,
          fontWeight:    700,
          color:         s.color,
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
  const color = data.avgConfidence
    ? confidenceColor(data.avgConfidence)
    : onBoard > 0
    ? 'var(--move-color)'
    : 'var(--edge-unexplored)'

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

  // Keep popup inside viewport
  const popupW = 228
  const safeX  = Math.min(
    Math.max(screenPos.x, 8),
    window.innerWidth - popupW - 8,
  )
  const safeY  = Math.min(screenPos.y, window.innerHeight - 280)

  return (
    <div
      ref={popupRef}
      style={{
        position:  'fixed',
        left:      safeX,
        top:       safeY,
        zIndex:    30,
        width:     popupW,
        // Top border colour-codes confidence state before you read anything
        borderTop: `3px solid ${confColor}`,
        border:    '0.5px solid var(--border)',
        borderTopWidth:  3,
        borderTopColor:  confColor,
        borderRadius:    'var(--radius-lg)',
        background:      'var(--bg-surface)',
        boxShadow:       '0 16px 48px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.2)',
        overflow:        'hidden',
        animation:       'popupIn 0.14s ease',
        pointerEvents:   'all',
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
            Your avg:{' '}
            <span style={{ color: confColor, fontWeight: 700, marginLeft: 2 }}>
              {confLabel}
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
          padding:      '0 16px 10px',
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
            width:         '100%',
            padding:       '10px 14px',
            background:    'var(--accent)',
            border:        'none',
            borderRadius:  'var(--radius-md)',
            fontSize:      12,
            fontWeight:    700,
            color:         '#fff',
            cursor:        'pointer',
            fontFamily:    'var(--font-body)',
            boxShadow:     '0 2px 8px rgba(220,38,38,0.3)',
            transition:    'opacity 0.12s ease',
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

// ── Canvas overlays ───────────────────────────────────────────────────────────
// Style toggle + Explore shortcut float on the canvas.
// No top bar — the sidebar owns the shell chrome.

function StyleToggleOverlay({ styles, activeStyle, onChange }) {
  if (!styles.length) return null
  return (
    <div style={{
      position:       'absolute',
      top:            16,
      left:           '50%',
      transform:      'translateX(-50%)',
      zIndex:         10,
      display:        'inline-flex',
      background:     'var(--bg-surface)',
      border:         '0.5px solid var(--border)',
      borderRadius:   'var(--radius-lg)',
      padding:        3,
      gap:            2,
      boxShadow:      'var(--shadow-md)',
      pointerEvents:  'all',
    }}>
      {['all', ...styles].map(s => {
        const active = activeStyle === s
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            style={{
              padding:      '5px 13px',
              background:   active ? 'var(--accent)' : 'transparent',
              border:       'none',
              borderRadius: 'var(--radius-md)',
              fontSize:     11,
              fontWeight:   active ? 700 : 500,
              color:        active ? '#fff' : 'var(--text-muted)',
              cursor:       'pointer',
              fontFamily:   'var(--font-body)',
              transition:   'all 0.12s ease',
              whiteSpace:   'nowrap',
            }}
          >
            {s === 'all' ? 'All' : STYLE_LABELS[s] ?? s}
          </button>
        )
      })}
    </div>
  )
}

function ExploreShortcut({ onClick }) {
  return (
    <div style={{
      position:     'absolute',
      top:          16,
      right:        16,
      zIndex:       10,
      pointerEvents: 'all',
    }}>
      <button
        onClick={onClick}
        style={{
          background:   'var(--bg-surface)',
          border:       '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding:      '6px 13px',
          fontSize:     11,
          fontWeight:   600,
          color:        'var(--text-muted)',
          cursor:       'pointer',
          fontFamily:   'var(--font-body)',
          boxShadow:    'var(--shadow-sm)',
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

// ── Legend ────────────────────────────────────────────────────────────────────
// Collapsed by default. Auto-shows for 3s on first mount then collapses.
function Legend() {
  const [open, setOpen] = useState(false)
  const shownRef        = useRef(false)
  const timerRef        = useRef(null)

  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true
    setOpen(true)
    timerRef.current = setTimeout(() => setOpen(false), 3000)
    return () => clearTimeout(timerRef.current)
  }, [])

  const items = [
    { color: '#22C55E',               label: 'Strong (4–5)'       },
    { color: 'var(--comp-ready)',     label: 'Developing (3)'     },
    { color: '#EF4444',               label: 'Needs work (1–2)'   },
    { color: '#8B5CF6',               label: 'In kit, unrated'    },
    { color: 'rgba(255,255,255,0.15)', label: 'Not explored'      },
  ]

  return (
    <div style={{
      position:     'absolute',
      bottom:       56,
      left:         16,
      zIndex:       10,
      pointerEvents:'all',
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
          minWidth:     160,
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
                  border:       color.includes('0.15')
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
          setOpen(p => !p)
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
      const pMoves   = filteredMoves.filter(m => m.from_position_id === p.id)
      const onBoard  = pMoves.filter(m => boardMoveIds.has(m.id))
      const confs    = pMoves
        .map(m => progressMap[m.id]?.confidence)
        .filter(Boolean)
      const avgConf  = confs.length
        ? confs.reduce((a, b) => a + b, 0) / confs.length
        : null
      const bestMove = pMoves
        .filter(m => progressMap[m.id]?.confidence)
        .sort((a, b) =>
          (progressMap[b.id]?.confidence ?? 0) -
          (progressMap[a.id]?.confidence ?? 0)
        )[0]
      stats[p.id] = {
        moveCount:     pMoves.length,
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
    const rect      = nodeEl?.getBoundingClientRect?.()
    const screenPos = rect
      ? { x: rect.left + rect.width / 2 - 114, y: rect.bottom + 10 }
      : { x: window.innerWidth / 2 - 114,       y: window.innerHeight / 2 }

    setActivePopup({
      position,
      stats: positionStats[position.id] ?? {
        moveCount:     0,
        onBoardCount:  0,
        avgConfidence: null,
        bestMove:      null,
        hasAnyOnBoard: false,
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
      const ps = positionStats[p.id] ?? {}
      newNodes.push({
        id:        `pos-${p.id}`,
        type:      'mapPosition',
        position:  posXY[p.id] ?? { x: 0, y: 0 },
        draggable: false,
        zIndex:    1,
        data: {
          name:          p.name,
          isActive:      activePopup?.position.id === p.id,
          avgConf:       ps.avgConfidence ?? null,
          hasAnyOnBoard: ps.hasAnyOnBoard ?? false,
          onClick:       (e) => handleNodeClick(p, e?.currentTarget),
        },
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
        zIndex: 0,         
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
    filteredPositions,
    filteredMoves,
    boardMoveIds,
    progressMap,
    activePopup,
    handleNodeClick,
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
    // This wrapper fills the available space inside main-content.
    // overflow: hidden is critical — without it ReactFlow bleeds out.
    <div style={{
      position: 'relative',
      width:    '100%',
      height:   '100%',
      overflow: 'hidden',
    }}>

      {/* Style toggle — floats top-centre on canvas */}
      <StyleToggleOverlay
        styles={styles}
        activeStyle={activeStyle}
        onChange={(s) => {
          setActiveStyle(s)
          setActivePopup(null)
        }}
      />

      {/* Explore shortcut — floats top-right */}
      <ExploreShortcut onClick={() => navigate('/explore')} />

      {/* Legend — floats bottom-left, collapsed by default
      <Legend /> */}

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
        style={{
          background: 'var(--bg-page)',
          width:      '100%',
          height:     '100%',
        }}
        proOptions={{ hideAttribution: true }}
        nodesFocusable={false}
        nodesConnectable={false}
        onNodeClick={(event, node) => {
          if (node.data?.onClick) node.data.onClick(event)
        }}
        onPaneClick={() => setActivePopup(null)}
      >
        <Background
          color="var(--border)"
          gap={32}
          size={0.6}
          style={{ opacity: 0.4 }}
        />
        <Controls
          showInteractive={false}
          style={{
            background:   'var(--bg-surface)',
            border:       '0.5px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow:    'var(--shadow-sm)',
            overflow:     'hidden',
          }}
        />
      </ReactFlow>

      <style>{`
        @keyframes popupIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes legendIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .react-flow__controls-button {
          background:    var(--bg-surface) !important;
          border-bottom: 0.5px solid var(--border) !important;
          fill:          var(--text-muted) !important;
          transition:    fill 0.12s ease, background 0.12s ease !important;
        }
        .react-flow__controls-button:hover {
          background: var(--bg-subtle)   !important;
          fill:       var(--text-primary) !important;
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

  // Loading state — spinner in accent colour
  if (loading) return (
    <div style={{
      width:          '100%',
      height:         '100%',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            12,
    }}>
      <div style={{
        width:          32,
        height:         32,
        borderRadius:   '50%',
        border:         '2.5px solid var(--border)',
        borderTopColor: 'var(--accent)',
        animation:      'graphSpin 0.7s linear infinite',
      }} />
      <span style={{
        fontSize:  12,
        fontWeight: 500,
        color:     'var(--text-muted)',
      }}>
        Loading graph...
      </span>
      <style>{`
        @keyframes graphSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )

  if (error) return (
    <div style={{
      width:          '100%',
      height:         '100%',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        24,
      textAlign:      'center',
    }}>
      <span style={{
        fontSize:   13,
        fontWeight: 600,
        color:      'var(--accent)',
      }}>
        {error}
      </span>
    </div>
  )

  return (
    // Fills main-content exactly. overflow: hidden prevents
    // ReactFlow from causing a scrollbar on the shell.
    <div style={{
      width:    '100%',
      height:   '100%',
      overflow: 'hidden',
    }}>
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
    </div>
  )
}