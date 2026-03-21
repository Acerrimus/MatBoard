import { useState } from 'react'
import { Chip } from './MoveCard'
import { addToBoard, removeFromBoard, upsertProgress, deleteProgress } from '../api'

// ── Confidence colours ────────────────────────────────────────────────────────
export function confidenceColor(confidence) {
  if (!confidence) return 'var(--border)'
  if (confidence <= 2) return '#EF4444'
  if (confidence === 3) return '#F59E0B'
  return '#22C55E'
}

export function confidenceBg(confidence) {
  if (!confidence) return 'transparent'
  if (confidence <= 2) return 'rgba(239,68,68,0.08)'
  if (confidence === 3) return 'rgba(245,158,11,0.08)'
  return 'rgba(34,197,94,0.08)'
}

// ── Risk dots ─────────────────────────────────────────────────────────────────
function RiskDots({ value }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: i <= value ? 'var(--accent)' : 'var(--border)',
          transition: 'background var(--transition)',
        }} />
      ))}
    </div>
  )
}

// ── Confidence selector ───────────────────────────────────────────────────────
function ConfidenceSelector({ value, onChange }) {
  const labels = ['', 'Beginner', 'Developing', 'Competent', 'Proficient', 'Expert']
  return (
    <div>
      <div style={{
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: 8,
      }}>
        Confidence
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            onClick={() => onChange(i)}
            title={labels[i]}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: `1.5px solid ${i === value ? confidenceColor(i) : 'var(--border)'}`,
              background: i === value ? confidenceBg(i) : 'var(--bg-subtle)',
              color: i === value ? confidenceColor(i) : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all var(--transition)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {i}
          </button>
        ))}
      </div>
      {value && (
        <div style={{
          fontSize: 11,
          color: confidenceColor(value),
          marginTop: 6,
          fontWeight: 500,
        }}>
          {labels[value]}
        </div>
      )}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, children }) {
  return (
    <div style={{
      background: 'var(--stat-bg)',
      border: '0.5px solid var(--stat-border)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 90,
    }}>
      <div style={{
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MoveDetail({
  move,
  onNavigate,
  onBack,
  isOnBoard,
  progress,
  onBoardChange,
  onProgressChange,
}) {
  const [boardLoading, setBoardLoading]     = useState(false)
  const [progressLoading, setProgressLoading] = useState(false)

  if (!move) return null

  const videoId = move.youtube_url
    ? move.youtube_url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1]
    : null

  const confidence  = progress?.confidence   ?? null
  const isFavourite = progress?.is_favourite ?? false

  // ── Board toggle ────────────────────────────────────────────────────────────
  const handleBoardToggle = async () => {
    setBoardLoading(true)
    try {
      if (isOnBoard) {
        await removeFromBoard(move.id)
        onBoardChange(move.id, false)
      } else {
        await addToBoard(move.id)
        onBoardChange(move.id, true)
      }
    } catch (e) {
      console.error('Board toggle failed:', e)
    } finally {
      setBoardLoading(false)
    }
  }

  // ── Favourite toggle ────────────────────────────────────────────────────────
  const handleFavouriteToggle = async () => {
    setProgressLoading(true)
    try {
      if (!confidence && isFavourite) {
        // No confidence set — if unfavouriting with no confidence, delete the row
        await deleteProgress(move.id)
        onProgressChange(move.id, null)
      } else {
        const updated = await upsertProgress(
          move.id,
          confidence ?? 1,
          !isFavourite
        )
        onProgressChange(move.id, updated)
      }
    } catch (e) {
      console.error('Favourite toggle failed:', e)
    } finally {
      setProgressLoading(false)
    }
  }

  // ── Confidence change ───────────────────────────────────────────────────────
  const handleConfidenceChange = async (value) => {
    setProgressLoading(true)
    try {
      if (value === confidence) {
        // Clicking the same value — clear the rating
        if (!isFavourite) {
          await deleteProgress(move.id)
          onProgressChange(move.id, null)
        } else {
          const updated = await upsertProgress(move.id, null, isFavourite)
          onProgressChange(move.id, updated)
        }
      } else {
        const updated = await upsertProgress(move.id, value, isFavourite)
        onProgressChange(move.id, updated)
      }
    } catch (e) {
      console.error('Confidence change failed:', e)
    } finally {
      setProgressLoading(false)
    }
  }

  const borderColor = isOnBoard ? confidenceColor(confidence) : 'var(--border)'
  const bgColor     = isOnBoard ? confidenceBg(confidence)    : 'transparent'

  return (
    <div style={{
      background: `var(--bg-surface)`,
      border: `1.5px solid ${borderColor}`,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: 16,
      animation: 'slideIn 0.18s ease',
      transition: 'border-color 0.2s ease',
    }}>

      {/* Confidence tint strip */}
      {isOnBoard && confidence && (
        <div style={{
          height: 3,
          background: confidenceColor(confidence),
          opacity: 0.7,
        }} />
      )}

      {/* Header */}
      <div style={{
        padding: '18px 20px 16px',
        borderBottom: '0.5px solid var(--border)',
        background: bgColor,
        transition: 'background 0.2s ease',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 8 }}><Chip type="move">move</Chip></div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.4px',
              color: 'var(--text-primary)',
              marginBottom: 6,
            }}>
              {move.name}
            </div>
            {move.description && (
              <p style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                maxWidth: 480,
              }}>
                {move.description}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>

            {/* Close */}
            <button
              onClick={onBack}
              style={{
                background: 'var(--bg-subtle)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '5px 10px',
                fontSize: 12,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              ✕ close
            </button>

            {/* Add to board */}
            <button
              onClick={handleBoardToggle}
              disabled={boardLoading}
              style={{
                background: isOnBoard ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                border: `0.5px solid ${isOnBoard ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: 600,
                color: isOnBoard ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: boardLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)',
                opacity: boardLoading ? 0.6 : 1,
                transition: 'all var(--transition)',
                whiteSpace: 'nowrap',
              }}
            >
              {isOnBoard ? '✓ On board' : '+ Add to board'}
            </button>

            {/* Favourite — only shown if on board */}
            {isOnBoard && (
              <button
                onClick={handleFavouriteToggle}
                disabled={progressLoading}
                title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                style={{
                  background: isFavourite ? '#FEF9C3' : 'var(--bg-subtle)',
                  border: `0.5px solid ${isFavourite ? '#FDE047' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '5px 10px',
                  fontSize: 14,
                  cursor: progressLoading ? 'not-allowed' : 'pointer',
                  opacity: progressLoading ? 0.6 : 1,
                  transition: 'all var(--transition)',
                }}
              >
                {isFavourite ? '★' : '☆'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video embed */}
      {videoId ? (
        <div style={{ position: 'relative', paddingBottom: '40%', background: '#000' }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={move.name}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%', height: '100%',
              border: 'none',
            }}
          />
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-subtle)',
          borderBottom: '0.5px solid var(--border)',
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ fontSize: 20 }}>▷</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No video attached yet</div>
        </div>
      )}

      {/* Stats + confidence */}
      <div style={{
        padding: '14px 20px',
        display: 'flex',
        gap: 12,
        borderBottom: '0.5px solid var(--border)',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
      }}>
        <StatCard label="Scoring value">
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--success)',
          }}>
            {move.scoring_value ?? 0}pts
          </span>
        </StatCard>

        <StatCard label="Risk rating">
          <RiskDots value={move.risk_rating ?? 0} />
        </StatCard>

        <StatCard label="From">
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {move.from_position?.name ?? '—'}
          </span>
        </StatCard>

        <StatCard label="To">
          <button
            onClick={() => onNavigate(move.to_position)}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--accent)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'var(--font-body)',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textUnderlineOffset: 3,
            }}
          >
            {move.to_position?.name ?? '—'} →
          </button>
        </StatCard>

        {/* Confidence selector — only shown if on board */}
        {isOnBoard && (
          <div style={{ marginLeft: 'auto' }}>
            <ConfidenceSelector
              value={confidence}
              onChange={handleConfidenceChange}
            />
          </div>
        )}
      </div>

      {/* Coaching cues */}
      <div style={{ padding: '14px 20px' }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 8,
        }}>
          Coaching cues
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No coaching cues added yet.
        </div>
      </div>
    </div>
  )
}