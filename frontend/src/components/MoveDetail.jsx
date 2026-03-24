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
  const [boardLoading, setBoardLoading]       = useState(false)
  const [progressLoading, setProgressLoading] = useState(false)

  const { user } = useAuth()

  const [clubId, setClubId] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(true)

  if (!move) return null

  const videoId = move.youtube_url
    ? move.youtube_url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1]
    : null

  const confidence  = progress?.confidence   ?? null
  const isFavourite = progress?.is_favourite ?? false

  // ── Load club + comments ────────────────────────────────────────────────────
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

      const { data } = await supabase
        .from('move_comments')
        .select(`
          id,
          comment,
          created_at,
          profiles(display_name)
        `)
        .eq('club_id', membership.club_id)
        .eq('move_id', move.id)
        .order('created_at', { ascending: false })

      setComments(data || [])
      setCommentsLoading(false)
    }

    loadComments()
  }, [move?.id, user])

  async function handleAddComment() {
    if (!newComment.trim() || !clubId) return

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
        profiles(display_name)
      `)
      .eq('club_id', clubId)
      .eq('move_id', move.id)
      .order('created_at', { ascending: false })

    setComments(data || [])
  }

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

  const borderColor = isOnBoard ? confidenceColor(confidence) : 'var(--border)'
  const bgColor     = isOnBoard ? confidenceBg(confidence)    : 'transparent'

  return (
    <div style={{
      background: 'var(--bg-surface)',
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

          <button
            onClick={onBack}
            style={{
              background: 'var(--bg-subtle)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ✕ close
          </button>
        </div>
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

      {/* ───────────── Club Comments ───────────── */}
      <div style={{
        padding: '14px 20px',
        borderTop: '0.5px solid var(--border)',
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 10,
        }}>
          Club Comments
        </div>

        <div style={{
          background: 'var(--bg-subtle)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          marginBottom: 12,
        }}>
          {commentsLoading ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              No comments yet.
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} style={{
                borderBottom: '0.5px solid var(--border)',
                padding: '8px 0',
              }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                }}>
                  {c.profiles?.display_name || 'User'}
                </div>

                <div style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}>
                  {c.comment}
                </div>
              </div>
            ))
          )}
        </div>

        {clubId && (
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add coaching note..."
              style={{
                flex: 1,
                resize: 'none',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: '0.5px solid var(--border)',
                background: 'var(--bg-surface)',
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={handleAddComment}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Post
            </button>
          </div>
        )}
      </div>
    </div>
  )
}