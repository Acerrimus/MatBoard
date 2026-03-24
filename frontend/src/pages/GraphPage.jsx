import { useState, useEffect, useCallback } from 'react'
import { getMovesFromPosition, getMove, getMyBoard, getMyProgress } from '../api'
import MoveCard, { Chip } from '../components/MoveCard'
import MoveDetail from '../components/MoveDetail'

const STARTING_POSITION = 'neutral'

function Breadcrumb({ trail, onNavigateTo }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 12, color: 'var(--text-muted)',
      marginBottom: 22, flexWrap: 'wrap',
    }}>
      {trail.map((crumb, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span style={{ color: 'var(--border-strong)' }}>›</span>}
          {i < trail.length - 1 ? (
            <button
              onClick={() => onNavigateTo(i)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: 'var(--text-muted)',
                padding: 0, fontFamily: 'var(--font-body)',
              }}
            >{crumb.name}</button>
          ) : (
            <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{crumb.name}</span>
          )}
        </span>
      ))}
    </div>
  )
}

function PositionNode({ position, movesCount }) {
  if (!position) return null
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderLeft: '3px solid var(--accent)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px 28px',
      marginBottom: 20,
    }}>
      <div style={{ marginBottom: 10 }}><Chip type="position">Position</Chip></div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 36,
        fontWeight: 700,
        letterSpacing: '-0.5px',
        color: 'var(--text-primary)',
        marginBottom: 8,
      }}>
        {position.name}
      </div>
      {position.description && (
        <p style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: 16,
        }}>
          {position.description}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatPill label="Moves available" value={movesCount} />
      </div>
    </div>
  )
}

function StatPill({ label, value }) {
  return (
    <div style={{
      background: 'var(--stat-bg)',
      border: '0.5px solid var(--stat-border)',
      borderRadius: 'var(--radius-sm)',
      padding: '7px 14px',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1,
      }}>{value}</div>
      <div style={{
        fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 3,
      }}>{label}</div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 68,
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          animation: 'pulse 1.4s ease infinite',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
    </div>
  )
}

export default function GraphPage() {
  const [position, setPosition]           = useState(null)
  const [moves, setMoves]                 = useState([])
  const [selectedMove, setSelectedMove]   = useState(null)
  const [trail, setTrail]                 = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [boardMoveIds, setBoardMoveIds]   = useState(new Set())
  const [progressMap, setProgressMap]     = useState({})
  const [boardLoading, setBoardLoading]   = useState(true)

  useEffect(() => {
    Promise.all([getMyBoard(), getMyProgress()])
      .then(([boardData, progressData]) => {
        setBoardMoveIds(new Set(boardData.map(item => item.move.id)))
        const pm = {}
        progressData.forEach(p => { pm[p.move_id] = p })
        setProgressMap(pm)
      })
      .catch(() => {})
      .finally(() => setBoardLoading(false))
  }, [])

  const loadPosition = useCallback(async (slug, newTrail) => {
    setLoading(true)
    setSelectedMove(null)
    setError(null)
    try {
      const data = await getMovesFromPosition(slug)
      setPosition(data.position)
      setMoves(data.moves)
      setTrail(newTrail ?? [{ name: data.position.name, slug }])
    } catch {
      setError('Could not load position. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPosition(STARTING_POSITION) }, [loadPosition])

  const handleMoveClick = async (move) => {
    try {
      const full = await getMove(move.slug)
      setSelectedMove(full)
    } catch {
      setSelectedMove(move)
    }
  }

  const handleNavigateToPosition = (pos) => {
    if (!pos?.slug) return
    loadPosition(pos.slug, [...trail, { name: pos.name, slug: pos.slug }])
  }

  const handleBreadcrumbNav = (index) => {
    const crumb = trail[index]
    loadPosition(crumb.slug, trail.slice(0, index + 1))
  }

  const handleBoardChange = (moveId, added) => {
    setBoardMoveIds(prev => {
      const next = new Set(prev)
      added ? next.add(moveId) : next.delete(moveId)
      return next
    })
  }

  const handleProgressChange = (moveId, progressData) => {
    setProgressMap(prev => {
      const next = { ...prev }
      if (progressData === null) delete next[moveId]
      else next[moveId] = progressData
      return next
    })
  }

  const selectedMoveId = selectedMove?.id

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: 'clamp(12px, 3vw, 28px) clamp(12px, 4vw, 20px)' }}>

      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
        }}>Technique Graph</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
          letterSpacing: '-0.5px', color: 'var(--text-primary)',
        }}>Explore the Graph</h1>
      </div>

      {trail.length > 0 && (
        <Breadcrumb trail={trail} onNavigateTo={handleBreadcrumbNav} />
      )}

      {error && (
        <div style={{
          background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px',
          fontSize: 13, color: 'var(--accent)', marginBottom: 16,
        }}>{error}</div>
      )}

      {!loading && position && (
        <PositionNode position={position} movesCount={moves.length} />
      )}

      {selectedMove && (
        <MoveDetail
          move={selectedMove}
          onNavigate={handleNavigateToPosition}
          onBack={() => setSelectedMove(null)}
          isOnBoard={boardMoveIds.has(selectedMoveId)}
          progress={progressMap[selectedMoveId] ?? null}
          onBoardChange={handleBoardChange}
          onProgressChange={handleProgressChange}
        />
      )}

      {!selectedMove && (
        <>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            margin: '20px 0 12px',
          }}>
            {loading ? 'Loading...'
              : moves.length === 0 ? 'No moves mapped yet'
              : `${moves.length} move${moves.length !== 1 ? 's' : ''} from here`}
          </div>

          {loading ? <LoadingState /> : (
            moves.map(move => (
              <MoveCard
                key={move.id}
                move={move}
                onClick={handleMoveClick}
                isOnBoard={boardMoveIds.has(move.id)}
              />
            ))
          )}
        </>
      )}

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}