import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { Chip, confidenceColor, confidenceBg } from './MoveCard'
import { addToBoard, removeFromBoard, upsertProgress, deleteProgress } from '../api'

// ── Risk dots ─────────────────────────────────────────────────────────────────
function RiskDots({ value }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
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
        fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8,
      }}>
        My Confidence
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            onClick={() => onChange(i)}
            title={labels[i]}
            style={{
              width: 40, height: 40,
              borderRadius: 'var(--radius-sm)',
              border: `1.5px solid ${i === value ? confidenceColor(i) : 'var(--border)'}`,
              background: i === value ? confidenceBg(i) : 'var(--bg-subtle)',
              color: i === value ? confidenceColor(i) : 'var(--text-muted)',
              fontSize: 14, fontWeight: 700,
              cursor: 'pointer',
              transition: 'all var(--transition)',
              fontFamily: 'var(--font-display)',
              // Larger tap target on mobile
              touchAction: 'manipulation',
            }}
          >
            {i}
          </button>
        ))}
      </div>
      {value && (
        <div style={{
          fontSize: 11, color: confidenceColor(value),
          marginTop: 6, fontWeight: 500,
        }}>
          {labels[value]}
        </div>
      )}
    </div>
  )
}

// ── Stat row item ─────────────────────────────────────────────────────────────
function StatItem({ label, children }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 3,
      padding: '10px 14px',
      background: 'var(--stat-bg)',
      border: '0.5px solid var(--stat-border)',
      borderRadius: 'var(--radius-sm)',
      flex: 1,
      minWidth: '5rem',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
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
  const { user } = useAuth()

  const [boardLoading, setBoardLoading]           = useState(false)
  const [progressLoading, setProgressLoading]     = useState(false)
  const [clubId, setClubId]                       = useState(null)
  const [comments, setComments]                   = useState([])
  const [newComment, setNewComment]               = useState('')
  const [commentsLoading, setCommentsLoading]     = useState(true)
  const [commentPosting, setCommentPosting]       = useState(false)
  const [showComments, setShowComments]           = useState(false)

  // ── Load club + comments ──────────────────────────────────────────────────
  // Must be before early return — Rules of Hooks
  useEffect(() => {
    if (!user || !move?.id) return

    async function loadComments() {
      setCommentsLoading(true)

      const { data: membership } = await supabase
        .from('club_memberships')
        .select('club_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (!membership) {
        setCommentsLoading(false)
        return
      }

      setClubId(membership.club_id)

      // profiles!user_id — explicit FK hint required because move_comments
      // has both user_id and athlete_id pointing to profiles
      const { data } = await supabase
        .from('move_comments')
        .select(`
          id,
          comment,
          created_at,
          profiles!user_id(display_name)
        `)
        .eq('club_id', membership.club_id)
        .eq('move_id', move.id)
        .order('created_at', { ascending: false })

      setComments(data || [])
      setCommentsLoading(false)
    }

    loadComments()
  }, [move?.id, user])

  // ── Early return after all hooks ──────────────────────────────────────────
  if (!move) return null

  const videoId = move.youtube_url
    ? move.youtube_url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1]
    : null

  const confidence  = progress?.confidence   ?? null
  const isFavourite = progress?.is_favourite ?? false

  // ── Add comment ───────────────────────────────────────────────────────────
  async function handleAddComment() {
    if (!newComment.trim() || !clubId || commentPosting) return
    setCommentPosting(true)

    await supabase.from('move_comments').insert({
      club_id: clubId,
      move_id: move.id,
      user_id: user.id,
      comment: newComment.trim(),
    })

    setNewComment('')

    const { data } = await supabase
      .from('move_comments')
      .select(`
        id,
        comment,
        created_at,
        profiles!user_id(display_name)
      `)
      .eq('club_id', clubId)
      .eq('move_id', move.id)
      .order('created_at', { ascending: false })

    setComments(data || [])
    setCommentPosting(false)
  }

  // ── Board toggle ──────────────────────────────────────────────────────────
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

  // ── Favourite toggle ──────────────────────────────────────────────────────
  const handleFavouriteToggle = async () => {
    if (progressLoading) return
    setProgressLoading(true)
    try {
      const newFavourite = !isFavourite
      if (!newFavourite && confidence === null) {
        await deleteProgress(move.id)
        onProgressChange(move.id, null)
      } else {
        const updated = await upsertProgress(move.id, confidence ?? null, newFavourite)
        onProgressChange(move.id, updated)
      }
    } catch (e) {
      console.error('Favourite toggle failed:', e)
    } finally {
      setProgressLoading(false)
    }
  }

  // ── Confidence change ─────────────────────────────────────────────────────
  const handleConfidenceChange = async (value) => {
    if (progressLoading) return
    setProgressLoading(true)
    try {
      if (value === confidence) {
        if (isFavourite) {
          const updated = await upsertProgress(move.id, null, true)
          onProgressChange(move.id, updated)
        } else {
          await deleteProgress(move.id)
          onProgressChange(move.id, null)
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

  const borderColor = confidence ? confidenceColor(confidence) : 'var(--border)'
  const bgColor     = confidence ? confidenceBg(confidence)    : 'transparent'

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1.5px solid ${isOnBoard && confidence ? borderColor : 'var(--border)'}`,
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

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '0.5px solid var(--border)',
        background: isOnBoard && confidence ? bgColor : 'transparent',
        transition: 'background 0.2s ease',
      }}>

        {/* Top row: chip + close button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <Chip type="move">move</Chip>

          <button
            onClick={onBack}
            style={{
              background: 'var(--bg-subtle)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: 12,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              // Larger tap area on mobile
              minHeight: '2.25rem',
              touchAction: 'manipulation',
            }}
          >
            ✕ close
          </button>
        </div>

        {/* Move name */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.4px',
          color: 'var(--text-primary)',
          marginBottom: 6,
          lineHeight: 1.2,
        }}>
          {move.name}
        </div>

        {move.description && (
          <p style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            margin: '0 0 12px 0',
          }}>
            {move.description}
          </p>
        )}

        {/* Action buttons row — full width on mobile */}
        <div style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          <button
            onClick={handleBoardToggle}
            disabled={boardLoading}
            style={{
              flex: 1,
              minWidth: '8rem',
              background: isOnBoard ? 'var(--accent-soft)' : 'var(--bg-subtle)',
              border: `0.5px solid ${isOnBoard ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: isOnBoard ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: boardLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
              opacity: boardLoading ? 0.6 : 1,
              transition: 'all var(--transition)',
              touchAction: 'manipulation',
            }}
          >
            {boardLoading ? '...' : isOnBoard ? '✓ On board' : '+ Add to board'}
          </button>

          {isOnBoard && (
            <button
              onClick={handleFavouriteToggle}
              disabled={progressLoading}
              title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
              style={{
                background: isFavourite ? 'var(--comp-ready-soft)' : 'var(--bg-subtle)',
                border: `0.5px solid ${isFavourite ? 'var(--comp-ready)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '9px 16px',
                fontSize: 16,
                cursor: progressLoading ? 'not-allowed' : 'pointer',
                opacity: progressLoading ? 0.6 : 1,
                transition: 'all var(--transition)',
                touchAction: 'manipulation',
                minHeight: '2.5rem',
              }}
            >
              {isFavourite ? '★' : '☆'}
            </button>
          )}
        </div>
      </div>

      {/* ── Video ─────────────────────────────────────────────────────── */}
      {videoId ? (
        <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={move.name}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%', border: 'none',
            }}
          />
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-subtle)',
          borderBottom: '0.5px solid var(--border)',
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 4,
        }}>
          <div style={{ fontSize: 18 }}>▷</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No video attached yet</div>
        </div>
      )}

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        gap: 8,
        borderBottom: '0.5px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <StatItem label="Scoring">
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18, fontWeight: 700,
            color: 'var(--success)',
          }}>
            {move.scoring_value ?? 0}pts
          </span>
        </StatItem>

        <StatItem label="Risk">
          <RiskDots value={move.risk_rating ?? 0} />
        </StatItem>

        <StatItem label="From">
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
            {move.from_position?.name ?? '—'}
          </span>
        </StatItem>

        <StatItem label="To">
          <button
            onClick={() => onNavigate(move.to_position)}
            style={{
              fontSize: 12, fontWeight: 500,
              color: 'var(--accent)',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: 0,
              fontFamily: 'var(--font-body)',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textUnderlineOffset: 3,
              touchAction: 'manipulation',
            }}
          >
            {move.to_position?.name ?? '—'} →
          </button>
        </StatItem>
      </div>

      {/* ── Confidence selector — full width row on mobile ────────────── */}
      {isOnBoard && (
        <div style={{
          padding: '14px 16px',
          borderBottom: '0.5px solid var(--border)',
        }}>
          <ConfidenceSelector
            value={confidence}
            onChange={handleConfidenceChange}
          />
        </div>
      )}

      {/* ── Coaching cues ─────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <div style={{
          fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--text-muted)',
          marginBottom: 6,
        }}>
          Coaching cues
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No coaching cues added yet.
        </div>
      </div>

      {/* ── Club Comments ─────────────────────────────────────────────── */}
      <div style={{ padding: '12px 16px' }}>

        {/* Collapsible header — tap to expand on mobile */}
        <button
          onClick={() => setShowComments(prev => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            marginBottom: showComments ? 10 : 0,
            touchAction: 'manipulation',
          }}
        >
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
          }}>
            Club Comments {comments.length > 0 ? `(${comments.length})` : ''}
          </div>
          <div style={{
            fontSize: 11, color: 'var(--text-muted)',
            transform: showComments ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}>
            ▾
          </div>
        </button>

        {showComments && (
          <>
            {/* Comment list */}
            <div style={{
              background: 'var(--bg-subtle)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              marginBottom: 10,
              maxHeight: '14rem',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}>
              {commentsLoading ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>
                  Loading...
                </div>
              ) : comments.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>
                  No comments yet. Be the first to add a coaching note.
                </div>
              ) : (
                comments.map((c, i) => (
                  <div key={c.id} style={{
                    borderBottom: i < comments.length - 1
                      ? '0.5px solid var(--border)'
                      : 'none',
                    padding: '8px 0',
                  }}>
                    <div style={{
                      fontSize: 11, fontWeight: 600,
                      color: 'var(--text-primary)', marginBottom: 3,
                    }}>
                      {/* Handles both array and object shape from Supabase nested select */}
                      {(Array.isArray(c.profiles)
                        ? c.profiles[0]?.display_name
                        : c.profiles?.display_name) || 'Unknown'}
                      <span style={{
                        fontWeight: 400, color: 'var(--text-muted)',
                        marginLeft: 6, fontSize: 10,
                      }}>
                        {new Date(c.created_at).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5,
                    }}>
                      {c.comment}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment input — only shown if user is in a club */}
            {clubId && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => {
                    // Submit on Enter (not Shift+Enter) on desktop
                    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
                      e.preventDefault()
                      handleAddComment()
                    }
                  }}
                  placeholder="Add a coaching note..."
                  rows={2}
                  style={{
                    flex: 1,
                    resize: 'none',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '0.5px solid var(--border)',
                    background: 'var(--bg-surface)',
                    fontSize: 13,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.4,
                    // Prevents zoom on input focus on iOS
                    fontSize: '16px',
                  }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || commentPosting}
                  style={{
                    padding: '9px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: !newComment.trim() || commentPosting ? 'not-allowed' : 'pointer',
                    opacity: !newComment.trim() || commentPosting ? 0.5 : 1,
                    transition: 'opacity var(--transition)',
                    whiteSpace: 'nowrap',
                    minHeight: '2.75rem',
                    touchAction: 'manipulation',
                  }}
                >
                  {commentPosting ? '...' : 'Post'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}