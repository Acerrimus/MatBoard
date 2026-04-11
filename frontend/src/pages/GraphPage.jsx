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
  getSmoothStepPath,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getGraph, getMyBoard, getMyProgress } from '../api'
import { confidenceColor, confidenceBg } from '../components/MoveCard'

// ── Constants ─────────────────────────────────────────────────────────────────
const NODE_W = 170
const NODE_H = 80
const isMobile = window.innerWidth < 768

const STYLE_LABELS = {
  folkstyle: 'Folkstyle',
  freestyle: 'Freestyle',
  greco:     'Greco-Roman',
}

// ── Hand-positioned layout ────────────────────────────────────────────────────
const POSITION_COORDS = {
  'neutral':              { x: 460, y: 0 },
  'collar-tie':           { x: 0,   y: 140 },
  'inside-tie':           { x: 190, y: 140 },
  'underhook':            { x: 380, y: 140 },
  'double-underhooks':    { x: 570, y: 140 },
  'overhook':             { x: 760, y: 140 },
  '2-on-1':               { x: 950, y: 140 },
  'clinch-bodylock':      { x: 1140, y: 140 },
  'front-headlock':       { x: 120, y: 300 },
  'high-crotch':          { x: 380, y: 300 },
  'double-leg-shot':      { x: 640, y: 300 },
  'single-leg':           { x: 900, y: 300 },
  'back-control-standing': { x: 190, y: 460 },
  'back-control-top':      { x: 480, y: 460 },
  'scramble':              { x: 770, y: 460 },
  'referees-top':         { x: 60,  y: 590 },
  'referees-bottom':      { x: 260, y: 590 },
  'par-terre-top':        { x: 480, y: 590 },
  'par-terre-bottom':     { x: 700, y: 590 },
  'turtle':               { x: 920, y: 590 },
}

const TIER_BY_SLUG = {}
const TIER_DEFS = [
  { tier: 0, slugs: ['neutral'] },
  { tier: 1, slugs: ['collar-tie','inside-tie','underhook','double-underhooks','overhook','2-on-1','clinch-bodylock'] },
  { tier: 2, slugs: ['front-headlock','high-crotch','double-leg-shot','single-leg'] },
  { tier: 3, slugs: ['back-control-standing','back-control-top','scramble'] },
  { tier: 4, slugs: ['referees-top','referees-bottom','par-terre-top','par-terre-bottom','turtle'] },
]
TIER_DEFS.forEach(({ tier, slugs }) => slugs.forEach(s => { TIER_BY_SLUG[s] = tier }))

let fallbackX = 0
function getPositionCoords(slug) {
  if (POSITION_COORDS[slug]) return POSITION_COORDS[slug]
  fallbackX += 190
  return { x: fallbackX, y: 720 }
}

// ── Edge routing helper ───────────────────────────────────────────────────────
function getEdgeHandles(sourceCoord, targetCoord) {
  const dx = targetCoord.x - sourceCoord.x
  const dy = targetCoord.y - sourceCoord.y
  if (Math.abs(dy) > Math.abs(dx) * 0.4) {
    if (dy > 0) return { sourceHandle: 'bottom', targetHandle: 'top' }
    return { sourceHandle: 'top', targetHandle: 'bottom' }
  }
  if (dx > 0) return { sourceHandle: 'right', targetHandle: 'left' }
  return { sourceHandle: 'left', targetHandle: 'right' }
}

// ── Node component ────────────────────────────────────────────────────────────
function PositionNode({ data }) {
  const {
    name, isActive, isConnected, avgConf, hasAnyOnBoard,
    moveCount, onBoardCount, onClick, onHover, onHoverEnd,
  } = data

  // Left accent stripe colour
  const accentColor = avgConf
    ? confidenceColor(avgConf)
    : hasAnyOnBoard
      ? 'var(--move-color)'
      : 'var(--border)'

  // Visual states
  const isHighlighted = isActive || isConnected
  const borderColor = isActive
    ? 'var(--accent)'
    : isConnected
      ? accentColor
      : 'var(--border)'
  const shadow = isActive
    ? '0 0 0 3px var(--accent-glow-sm), 0 8px 24px rgba(220,38,38,0.12)'
    : isConnected
      ? `0 0 0 2px ${accentColor}22, 0 4px 16px rgba(0,0,0,0.15)`
      : 'none'

  const statLine = avgConf
    ? `${moveCount} move${moveCount !== 1 ? 's' : ''} · avg ${avgConf.toFixed(1)}`
    : `${moveCount} move${moveCount !== 1 ? 's' : ''}${onBoardCount > 0 ? ` · ${onBoardCount} in kit` : ''}`

  return (
    <>
      <Handle type="target" position={Position.Top}    id="top"    style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left}   id="left"   style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right}  id="right"  style={{ opacity: 0 }} />
      <div
        onClick={onClick}
        onMouseEnter={onHover}
        onMouseLeave={onHoverEnd}
        style={{
          width:         NODE_W,
          height:        NODE_H,
          background:    'var(--bg-surface)',
          border:        `1.5px solid ${borderColor}`,
          borderLeft:    `4px solid ${accentColor}`,
          borderRadius:  'var(--radius-lg)',
          display:       'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding:       '0 14px',
          cursor:        'pointer',
          transition:    'all 0.15s ease',
          boxShadow:     shadow,
          overflow:      'hidden',
          opacity:       1,
        }}
      >
        <div style={{
          display:     'flex',
          alignItems:  'center',
          gap:         8,
          marginBottom: 4,
        }}>
          {avgConf && (
            <div style={{
              width:        8,
              height:       8,
              borderRadius: '50%',
              background:   confidenceColor(avgConf),
              flexShrink:   0,
            }} />
          )}
          <span style={{
            fontFamily:    'var(--font-display)',
            fontSize:      12,
            fontWeight:    700,
            color:         isHighlighted ? 'var(--text-primary)' : 'var(--text-secondary)',
            overflow:      'hidden',
            textOverflow:  'ellipsis',
            whiteSpace:    'nowrap',
            letterSpacing: '-0.01em',
            lineHeight:    1.2,
          }}>
            {name}
          </span>
        </div>
        <span style={{
          fontSize:      10,
          fontWeight:    500,
          color:         'var(--text-muted)',
          letterSpacing: '0.01em',
          lineHeight:    1,
          overflow:      'hidden',
          textOverflow:  'ellipsis',
          whiteSpace:    'nowrap',
        }}>
          {statLine}
        </span>
      </div>
      <Handle type="source" position={Position.Top}    id="top"    style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left}   id="left"   style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right}  id="right"  style={{ opacity: 0 }} />
    </>
  )
}

// ── Edge component ────────────────────────────────────────────────────────────
function ConfidenceEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }) {
  const useSmoothStep = data.tierSpan >= 2

  const [edgePath] = useSmoothStep
    ? getSmoothStepPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
        borderRadius: 16,
        offset: 20,
      })
    : getBezierPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
        curvature: data.curvature ?? 0.25,
      })

  const onBoard = data.onBoardCount ?? 0
  const rated   = data.avgConfidence != null
  const visible = data.isVisible

  let color, width
  if (rated) {
    color = confidenceColor(data.avgConfidence)
    width = 2.5
  } else if (onBoard > 0) {
    color = 'var(--move-color)'
    width = 1.5
  } else {
    color = 'var(--text-muted)'
    width = 1
  }

  return (
    <>
      <defs>
        <marker
          id={`arrow-${id}`}
          viewBox="0 0 10 8"
          refX="8"
          refY="4"
          markerWidth="8"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 4 L 0 8 z" fill={color} opacity={visible ? 0.8 : 0} />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke:      color,
          strokeWidth: width,
          opacity:     visible ? 0.7 : 0,
          transition:  'opacity 0.25s ease',
          markerEnd:   `url(#arrow-${id})`,
        }}
      />
    </>
  )
}

const nodeTypes = { positionNode: PositionNode }
const edgeTypes = { confidenceEdge: ConfidenceEdge }

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

  const popupW = 228
  const safeX  = Math.min(Math.max(screenPos.x, 8), window.innerWidth - popupW - 8)
  const safeY  = Math.min(screenPos.y, window.innerHeight - 280)

  return (
    <div
      ref={popupRef}
      style={{
        position:     'fixed',
        left:         safeX,
        top:          safeY,
        zIndex:       30,
        width:        popupW,
        border:       '0.5px solid var(--border)',
        borderTopWidth: 3,
        borderTopColor: confColor,
        borderRadius: 'var(--radius-lg)',
        background:   'var(--bg-surface)',
        boxShadow:    '0 16px 48px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.2)',
        overflow:     'hidden',
        animation:    'popupIn 0.14s ease',
        pointerEvents: 'all',
      }}
    >
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

      <div style={{
        padding: '10px 16px',
        display: 'grid',
        gridTemplateColumns: stats.onBoardCount > 0 ? '1fr 1fr' : '1fr',
        gap: 8,
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
          }}>{stats.moveCount}</div>
          <div style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color:         'var(--text-muted)',
            marginTop:     4,
          }}>{stats.moveCount === 1 ? 'move' : 'moves'}</div>
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
            }}>{stats.onBoardCount}</div>
            <div style={{
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color:         'var(--text-muted)',
              marginTop:     4,
            }}>in my kit</div>
          </div>
        )}
      </div>

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

// ── Style toggle overlay ──────────────────────────────────────────────────────
function StyleToggleOverlay({ styles, activeStyle, onChange }) {
  if (!styles.length) return null
  return (
    <div style={{
      position:      'absolute',
      top:           16,
      left:          '50%',
      transform:     'translateX(-50%)',
      zIndex:        10,
      display:       'inline-flex',
      background:    'var(--bg-surface)',
      border:        '0.5px solid var(--border)',
      borderRadius:  'var(--radius-lg)',
      padding:       3,
      gap:           2,
      boxShadow:     'var(--shadow-md)',
      pointerEvents: 'all',
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

// ── Mobile fallback ───────────────────────────────────────────────────────────
function MobileFallback() {
  const navigate = useNavigate()
  return (
    <div style={{
      width:          '100%',
      height:         '100%',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '2rem',
      textAlign:      'center',
      gap:            '1.25rem',
    }}>
      <div style={{
        width:        56,
        height:       56,
        borderRadius: 'var(--radius-lg)',
        background:   'var(--bg-subtle)',
        border:       '0.5px solid var(--border)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        fontSize:     24,
      }}>🗺️</div>
      <div>
        <div style={{
          fontFamily:    'var(--font-display)',
          fontSize:      '1.125rem',
          fontWeight:    700,
          color:         'var(--text-primary)',
          marginBottom:  8,
          letterSpacing: '-0.3px',
        }}>
          Graph view is built for desktop
        </div>
        <div style={{
          fontSize:   '0.8125rem',
          color:      'var(--text-muted)',
          lineHeight: 1.6,
          maxWidth:   320,
        }}>
          The technique graph needs a bigger screen to be useful. Explore your positions and moves below instead.
        </div>
      </div>
      <button
        onClick={() => navigate('/explore')}
        style={{
          padding:       '0.625rem 1.5rem',
          background:    'var(--accent)',
          border:        'none',
          borderRadius:  'var(--radius-md)',
          fontSize:      '0.8125rem',
          fontWeight:    700,
          color:         '#fff',
          cursor:        'pointer',
          fontFamily:    'var(--font-body)',
          boxShadow:     '0 2px 8px rgba(220,38,38,0.3)',
          transition:    'opacity 0.12s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        Explore positions →
      </button>
    </div>
  )
}

// ── Graph inner (desktop only) ────────────────────────────────────────────────
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
  const [hoveredPosId, setHoveredPosId]  = useState(null)

  const activePopupRef = useRef(null)
  useEffect(() => {
    activePopupRef.current = activePopup
  }, [activePopup])

  // The "focus" node is whichever is hovered or has the popup open
  const focusPosId = hoveredPosId || activePopup?.position.id || null

  // ── Slug-to-id lookup ──────────────────────────────────────────────────────
  const posIdToSlug = useMemo(() => {
    const map = {}
    rawPositions.forEach(p => { map[p.id] = p.slug })
    return map
  }, [rawPositions])

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

  // ── Aggregated edge data (stable between renders) ──────────────────────────
  const pairData = useMemo(() => {
    const pairs = {}
    filteredMoves.forEach(m => {
      const key = `${m.from_position_id}__${m.to_position_id}`
      if (!pairs[key]) pairs[key] = []
      pairs[key].push(m)
    })
    return pairs
  }, [filteredMoves])

  // ── Connected position IDs for the focus node ──────────────────────────────
  const connectedPosIds = useMemo(() => {
    if (!focusPosId) return new Set()
    const ids = new Set()
    Object.keys(pairData).forEach(key => {
      const [fromId, toId] = key.split('__')
      if (fromId === focusPosId) ids.add(toId)
      if (toId === focusPosId) ids.add(fromId)
    })
    return ids
  }, [focusPosId, pairData])

  // ── Node click ─────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((position, nodeEl) => {
    const current = activePopupRef.current
    if (current?.position.id === position.id) {
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
        moveCount: 0, onBoardCount: 0, avgConfidence: null,
        bestMove: null, hasAnyOnBoard: false,
      },
      screenPos,
    })
  }, [positionStats])

  // ── Build nodes + edges ────────────────────────────────────────────────────
  useEffect(() => {
    if (!filteredPositions.length) return

    const newNodes = filteredPositions.map(p => {
      const ps    = positionStats[p.id] ?? {}
      const coord = getPositionCoords(p.slug)
      return {
        id:        `pos-${p.id}`,
        type:      'positionNode',
        position:  coord,
        draggable: false,
        zIndex:    1,
        data: {
          name:          p.name,
          isActive:      false,
          isConnected:   false,
          avgConf:       ps.avgConfidence ?? null,
          hasAnyOnBoard: ps.hasAnyOnBoard ?? false,
          moveCount:     ps.moveCount ?? 0,
          onBoardCount:  ps.onBoardCount ?? 0,
          onClick:       (e) => handleNodeClick(p, e?.currentTarget),
          onHover:       () => setHoveredPosId(p.id),
          onHoverEnd:    () => setHoveredPosId(prev => prev === p.id ? null : prev),
        },
      }
    })

    const newEdges = Object.entries(pairData).map(([key, ms]) => {
      const [fromId, toId] = key.split('__')
      const fromSlug       = posIdToSlug[fromId]
      const toSlug         = posIdToSlug[toId]
      const hasReverse     = !!pairData[`${toId}__${fromId}`]
      const onBoardCount   = ms.filter(m => boardMoveIds.has(m.id)).length
      const confs          = ms
        .map(m => progressMap[m.id]?.confidence)
        .filter(Boolean)
      const avgConf        = confs.length
        ? confs.reduce((a, b) => a + b, 0) / confs.length
        : null

      const sourceCoord = getPositionCoords(fromSlug)
      const targetCoord = getPositionCoords(toSlug)
      const { sourceHandle, targetHandle } = getEdgeHandles(sourceCoord, targetCoord)

      const fromTier = TIER_BY_SLUG[fromSlug] ?? 0
      const toTier   = TIER_BY_SLUG[toSlug] ?? 0
      const tierSpan = Math.abs(fromTier - toTier)

      return {
        id:           `edge-${key}`,
        source:       `pos-${fromId}`,
        target:       `pos-${toId}`,
        sourceHandle: sourceHandle,
        targetHandle: targetHandle,
        type:         'confidenceEdge',
        zIndex:       0,
        data: {
          count:         ms.length,
          onBoardCount,
          avgConfidence: avgConf,
          curvature:     hasReverse ? 0.35 : 0.2,
          tierSpan,
          isVisible:     false,
        },
      }
    })

    setNodes(newNodes)
    setEdges(newEdges)
    fitQueued.current = true
  }, [filteredPositions, filteredMoves, boardMoveIds, progressMap, positionStats, posIdToSlug, pairData, handleNodeClick])

  // ── Update node highlight + edge visibility when focus changes ─────────────
  useEffect(() => {
    setNodes(prev =>
      prev.map(n => {
        const posId      = n.id.replace('pos-', '')
        const isActive   = activePopup?.position.id === posId || hoveredPosId === posId
        const isConnected = !isActive && connectedPosIds.has(posId)
        if (n.data.isActive === isActive && n.data.isConnected === isConnected) return n
        return { ...n, data: { ...n.data, isActive, isConnected } }
      })
    )

    setEdges(prev =>
      prev.map(e => {
        const [fromId, toId] = e.id.replace('edge-', '').split('__')
        const isVisible = focusPosId ? (fromId === focusPosId || toId === focusPosId) : false
        if (e.data.isVisible === isVisible) return e
        return { ...e, data: { ...e.data, isVisible } }
      })
    )
  }, [focusPosId, activePopup, hoveredPosId, connectedPosIds, setNodes, setEdges])

  // ── Fit view after nodes settle ────────────────────────────────────────────
  useEffect(() => {
    if (!fitQueued.current) return
    const t = setTimeout(() => {
      fitView({ padding: 0.15, duration: 400 })
      fitQueued.current = false
    }, 50)
    return () => clearTimeout(t)
  }, [nodes, fitView])

  // ── Close popup on style change ────────────────────────────────────────────
  useEffect(() => { setActivePopup(null) }, [activeStyle])

  return (
    <div style={{
      position: 'relative',
      width:    '100%',
      height:   '100%',
      overflow: 'hidden',
    }}>
      <StyleToggleOverlay
        styles={styles}
        activeStyle={activeStyle}
        onChange={(s) => {
          setActiveStyle(s)
          setActivePopup(null)
          setHoveredPosId(null)
        }}
      />

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
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
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
        onPaneClick={() => { setActivePopup(null); setHoveredPosId(null) }}
      >
        <Background
          color="var(--border)"
          gap={32}
          size={0.6}
          style={{ opacity: 0.3 }}
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
    if (isMobile) { setLoading(false); return }
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

  if (isMobile) return <MobileFallback />

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
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
        Loading graph...
      </span>
      <style>{`@keyframes graphSpin { to { transform: rotate(360deg); } }`}</style>
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
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
        {error}
      </span>
    </div>
  )

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
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