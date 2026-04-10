import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { confidenceColor, confidenceBg, confidenceLabel } from './MoveCard'
import { addToBoard, removeFromBoard, upsertProgress, deleteProgress } from '../api'

// ── Confidence rating button strip ────────────────────────────────────────────
// Always visible — not gated on isOnBoard.
// Selecting a rating auto-adds the move to the athlete's board.
// Tapping an already-selected rating removes it (toggle off).
function ConfidenceRater({ value, onChange, disabled }) {
  const levels = [
    { n: 1, label: 'Introduced' },
    { n: 2, label: 'Drilling' },
    { n: 3, label: 'Independant use'   },
    { n: 4, label: 'Solid'        },
    { n: 5, label: 'Competition ready' },
  ]

  return (
    <div>
      {/* Prompt */}
      <div style={{
        fontSize:      12,
        fontWeight:    600,
        color:         'var(--text-secondary)',
        marginBottom:  10,
        lineHeight:    1.4,
      }}>
        How well can you hit this?
      </div>

      {/* Button row */}
      <div style={{
        display:  'flex',
        gap:      6,
        marginBottom: value ? 8 : 0,
      }}>
        {levels.map(({ n, label }) => {
          const selected = n === value
          const color    = confidenceColor(n)
          const bg       = confidenceBg(n)
          return (
            <button
              key={n}
              onClick={() => !disabled && onChange(n)}
              title={label}
              disabled={disabled}
              style={{
                flex:         1,
                height:       44,
                borderRadius: 'var(--radius-sm)',
                border:       `1.5px solid ${selected ? color : 'var(--border)'}`,
                background:   selected ? bg : 'var(--bg-subtle)',
                color:        selected ? color : 'var(--text-muted)',
                fontSize:     15,
                fontWeight:   700,
                cursor:       disabled ? 'not-allowed' : 'pointer',
                transition:   'all 0.12s ease',
                fontFamily:   'var(--font-display)',
                touchAction:  'manipulation',
                opacity:      disabled ? 0.5 : 1,
                // Glow on selected
                boxShadow:    selected ? `0 0 0 3px ${bg}` : 'none',
              }}
            >
              {n}
            </button>
          )
        })}
      </div>

      {/* Label under selected — tells athlete what their rating means */}
      {value && (
        <div style={{
          fontSize:   12,
          fontWeight: 600,
          color:      confidenceColor(value),
          lineHeight: 1,
          transition: 'color 0.12s ease',
        }}>
          {levels.find(l => l.n === value)?.label}
        </div>
      )}

      {/* Nudge for unrated state */}
      {!value && (
        <div style={{
          fontSize:  11,
          color:     'var(--text-muted)',
          lineHeight: 1.4,
        }}>
          Rating this adds it to your techniques automatically.
        </div>
      )}
    </div>
  )
}

// ── Risk dots ─────────────────────────────────────────────────────────────────
function RiskDots({ value }) {
  if (!value) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            width:        7,
            height:       7,
            borderRadius: '50%',
            background:   i <= value
              ? value <= 2 ? '#22C55E'
                : value <= 3 ? 'var(--comp-ready)'
                : '#EF4444'
              : 'var(--border)',
            transition:   'background 0.12s ease',
          }}
        />
      ))}
    </div>
  )
}

// ── Stat cell ─────────────────────────────────────────────────────────────────
function StatCell({ label, children }) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      gap:           4,
      padding:       '10px 14px',
      background:    'var(--bg-subtle)',
      border:        '0.5px solid var(--border)',
      borderRadius:  'var(--radius-sm)',
      flex:          1,
      minWidth:      0,
    }}>
      <div style={{
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color:         'var(--text-muted)',
        lineHeight:    1,
      }}>
        {label}
      </div>
      <div style={{ lineHeight: 1.2 }}>
        {children}
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ children }) {
  return (
    <div style={{
      fontSize:      9,
      fontWeight:    700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color:         'var(--text-muted)',
      marginBottom:  8,
      lineHeight:    1,
    }}>
      {children}
    </div>
  )
}

// ── Extract YouTube video ID from a URL ───────────────────────────────────────
// Handles both youtube.com/watch?v=X and youtu.be/X formats.
// Returns null if no valid ID found.
function extractYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)
  return match ? match[1] : null
}

// ── Main component ────────────────────────────────────────────────────────────
// Props:
//   move             — full move object (now includes move_media[] from backend join)
//   onNavigate       — (destinationPosition) => void — navigate to next position
//   onBack           — () => void — collapse/close this detail
//   isOnBoard        — bool
//   progress         — { confidence, is_favourite } | null
//   onBoardChange    — (moveId, bool) => void
//   onProgressChange — (moveId, progressData | null) => void
//   inline           — bool — when true, suppress close button + Go To CTA
//                      (ExplorePage owns those affordances in that context)

export default function MoveDetail({
  move,
  onNavigate,
  onBack,
  isOnBoard,
  progress,
  onBoardChange,
  onProgressChange,
  inline = false,
}) {
  const { user } = useAuth()

  const [boardLoading, setBoardLoading]       = useState(false)
  const [progressLoading, setProgressLoading] = useState(false)
  const [clubId, setClubId]                   = useState(null)
  const [comments, setComments]               = useState([])
  const [newComment, setNewComment]           = useState('')
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentPosting, setCommentPosting]   = useState(false)
  const [showComments, setShowComments]       = useState(false)

  const confidence  = progress?.confidence   ?? null
  const isFavourite = progress?.is_favourite ?? false
  const accentColor = confidence
    ? confidenceColor(confidence)
    : 'var(--border)'

  // ── Derive video from move_media join ───────────────────────────────────────
  // Backend now returns move_media[] array on every move object.
  // We pick the first youtube technique video if one exists.
  const mediaEntry = Array.isArray(move?.move_media)
    ? move.move_media.find(m => m.media_type === 'youtube')
    : null
  const videoId = extractYouTubeId(mediaEntry?.url)

  // ── Load club + comments ────────────────────────────────────────────────────
  // Must stay before early return — Rules of Hooks
  useEffect(() => {
    if (!user || !move?.id) return

    async function load() {
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

      // profiles!user_id — explicit FK hint needed because move_comments
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

    load()
  }, [move?.id, user])

  // ── Early return after all hooks ────────────────────────────────────────────
  if (!move) return null

  // ── Confidence change ───────────────────────────────────────────────────────
  // Core interaction: auto-adds to board on first rating.
  // Tapping the current value removes the rating (toggle off).
  const handleConfidenceChange = async (value) => {
    if (progressLoading) return
    setProgressLoading(true)
    try {
      // Auto-add to board if not already on it
      if (!isOnBoard) {
        await addToBoard(move.id)
        onBoardChange(move.id, true)
      }

      if (value === confidence) {
        // Toggle off — remove rating but keep on board
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

  // ── Board toggle ────────────────────────────────────────────────────────────
  const handleBoardToggle = async () => {
    if (boardLoading) return
    setBoardLoading(true)
    try {
      if (isOnBoard) {
        await removeFromBoard(move.id)
        onBoardChange(move.id, false)
        // If removing from board, also clear progress
        if (progress) {
          await deleteProgress(move.id)
          onProgressChange(move.id, null)
        }
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
      const next = !isFavourite
      if (!next && confidence === null) {
        await deleteProgress(move.id)
        onProgressChange(move.id, null)
      } else {
        const updated = await upsertProgress(move.id, confidence ?? null, next)
        onProgressChange(move.id, updated)
      }
    } catch (e) {
      console.error('Favourite toggle failed:', e)
    } finally {
      setProgressLoading(false)
    }
  }

  // ── Add comment ─────────────────────────────────────────────────────────────
  async function handleAddComment() {
    if (!newComment.trim() || !clubId || commentPosting) return
    setCommentPosting(true)
    try {
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
    } catch (e) {
      console.error('Comment post failed:', e)
    } finally {
      setCommentPosting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background:  'var(--bg-surface)',
      borderRadius: inline ? 0 : 'var(--radius-lg)',
      overflow:    'hidden',
      // In inline mode, the parent ExplorePage wraps this in a container
      // that provides the connected border treatment (top border removed,
      // rounded only at bottom). We don't fight that here.
      animation:   'mdSlideIn 0.15s ease',
    }}>

      {/* ── Confidence accent strip ──────────────────────────────────── */}
      {/* Colour-encodes the athlete's confidence at a glance.
          In inline mode this creates a visual spine connecting
          the MoveRow above to the detail below. */}
      <div style={{
        height:     3,
        background: accentColor,
        opacity:    confidence ? 0.85 : 0.25,
        transition: 'background 0.2s ease, opacity 0.2s ease',
      }} />

      {/* ── Header block ────────────────────────────────────────────── */}
      <div style={{
        padding:         '16px 18px 14px',
        borderBottom:    '0.5px solid var(--border)',
        background:      confidence
          ? confidenceBg(confidence)
          : 'transparent',
        transition:      'background 0.2s ease',
      }}>

        {/* Top row: close button (non-inline only) */}
        {!inline && (
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onBack}
              style={{
                background:   'var(--bg-subtle)',
                border:       '0.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding:      '5px 12px',
                fontSize:     12,
                color:        'var(--text-secondary)',
                cursor:       'pointer',
                fontFamily:   'var(--font-body)',
                minHeight:    '2rem',
                touchAction:  'manipulation',
                transition:   'all 0.12s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background  = 'var(--bg-subtle)'
                e.currentTarget.style.borderColor = 'var(--border-strong)'
                e.currentTarget.style.color       = 'var(--text-primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background  = 'var(--bg-subtle)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color       = 'var(--text-secondary)'
              }}
            >
              ✕ close
            </button>
          </div>
        )}

        {/* From → To flow — gives immediate position context */}
        <div style={{
          display:     'flex',
          alignItems:  'center',
          gap:         6,
          marginBottom: 8,
          fontSize:    11,
          color:       'var(--text-muted)',
          fontWeight:  500,
        }}>
          <span>{move.from_position?.name ?? '—'}</span>
          <span style={{ color: 'var(--border-strong)', fontSize: 10 }}>→</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            {move.to_position?.name ?? '—'}
          </span>
        </div>

        {/* Move name */}
        <div style={{
          fontFamily:    'var(--font-display)',
          fontSize:      22,
          fontWeight:    700,
          letterSpacing: '-0.3px',
          color:         'var(--text-primary)',
          lineHeight:    1.2,
          marginBottom:  move.description ? 8 : 14,
        }}>
          {move.name}
        </div>

        {/* Description */}
        {move.description && (
          <p style={{
            fontSize:   13,
            color:      'var(--text-secondary)',
            lineHeight: 1.6,
            margin:     '0 0 14px 0',
          }}>
            {move.description}
          </p>
        )}

        {/* Action row: Add to techniques + Favourite */}
        <div style={{
          display:   'flex',
          gap:       8,
          flexWrap:  'wrap',
        }}>
          <button
            onClick={handleBoardToggle}
            disabled={boardLoading}
            style={{
              flex:         1,
              minWidth:     '8rem',
              background:   isOnBoard ? 'var(--accent-soft)' : 'var(--bg-subtle)',
              border:       `0.5px solid ${isOnBoard ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              padding:      '9px 14px',
              fontSize:     12,
              fontWeight:   600,
              color:        isOnBoard ? 'var(--accent)' : 'var(--text-secondary)',
              cursor:       boardLoading ? 'not-allowed' : 'pointer',
              fontFamily:   'var(--font-body)',
              opacity:      boardLoading ? 0.6 : 1,
              transition:   'all 0.12s ease',
              touchAction:  'manipulation',
              lineHeight:   1,
            }}
          >
            {boardLoading
              ? '...'
              : isOnBoard
              ? '✓ In my techniques'
              : '+ Add to my techniques'}
          </button>

          {/* Favourite — only shown once on board */}
          {isOnBoard && (
            <button
              onClick={handleFavouriteToggle}
              disabled={progressLoading}
              title={isFavourite ? 'Remove from saved' : 'Save this technique'}
              style={{
                background:   isFavourite
                  ? 'var(--comp-ready-soft)'
                  : 'var(--bg-subtle)',
                border:       `0.5px solid ${isFavourite
                  ? 'var(--comp-ready)'
                  : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding:      '9px 14px',
                fontSize:     12,
                fontWeight:   600,
                color:        isFavourite
                  ? 'var(--comp-ready)'
                  : 'var(--text-muted)',
                cursor:       progressLoading ? 'not-allowed' : 'pointer',
                opacity:      progressLoading ? 0.6 : 1,
                transition:   'all 0.12s ease',
                touchAction:  'manipulation',
                display:      'flex',
                alignItems:   'center',
                gap:          5,
                lineHeight:   1,
                whiteSpace:   'nowrap',
              }}
            >
              {isFavourite ? '★' : '☆'}
              <span>{isFavourite ? 'Saved' : 'Save'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Confidence rater ─────────────────────────────────────────── */}
      {/* Always visible — not gated on isOnBoard.
          First rating auto-adds to board via handleConfidenceChange. */}
      <div style={{
        padding:      '16px 18px',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <ConfidenceRater
          value={confidence}
          onChange={handleConfidenceChange}
          disabled={progressLoading}
        />
      </div>

      {/* ── Video ────────────────────────────────────────────────────── */}
      {/* Video sourced from move_media join — backend returns move_media[]
          array on every move object. We pick the first youtube entry. */}
      {videoId ? (
        <div style={{
          position:      'relative',
          paddingBottom: '56.25%',
          background:    '#000',
        }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={move.name}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              top:      0, left: 0,
              width:    '100%', height: '100%',
              border:   'none',
            }}
          />
        </div>
      ) : (
        // No video placeholder — only show if there's genuinely nothing,
        // kept minimal so it doesn't draw attention to incompleteness.
        <div style={{
          background:    'var(--bg-subtle)',
          borderBottom:  '0.5px solid var(--border)',
          height:        64,
          display:       'flex',
          alignItems:    'center',
          justifyContent:'center',
          gap:           8,
        }}>
          <span style={{ fontSize: 14, opacity: 0.4 }}>▷</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.7 }}>
            No video yet
          </span>
        </div>
      )}

      {/* ── Stats row ────────────────────────────────────────────────── */}
      {/* 2-col grid on all screen sizes — prevents wrapping issues.
          From/To moved to header, so only Scoring and Risk live here. */}
      <div style={{
        padding:      '12px 18px',
        display:      'grid',
        gridTemplateColumns: '1fr 1fr',
        gap:          8,
        borderBottom: '0.5px solid var(--border)',
      }}>
        <StatCell label="Scoring">
          {move.scoring_value > 0 ? (
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize:   18,
              fontWeight: 700,
              color:      'var(--success)',
              lineHeight: 1,
            }}>
              {move.scoring_value}pts
            </span>
          ) : (
            <span style={{
              fontSize: 12,
              color:    'var(--text-muted)',
            }}>
              No score
            </span>
          )}
        </StatCell>

        <StatCell label="Risk">
          <RiskDots value={move.risk_rating ?? 0} />
        </StatCell>
      </div>

      {/* ── Go to destination CTA ────────────────────────────────────── */}
      {/* Navigation action. Suppressed in inline mode —
          ExplorePage renders its own "Go to" button on the move row. */}
      {!inline && move.to_position && (
        <div style={{
          padding:      '12px 18px',
          borderBottom: '0.5px solid var(--border)',
        }}>
          <button
            onClick={() => onNavigate(move.to_position)}
            style={{
              width:        '100%',
              padding:      '11px 16px',
              background:   'var(--accent)',
              border:       'none',
              borderRadius: 'var(--radius-md)',
              fontSize:     13,
              fontWeight:   700,
              color:        '#fff',
              cursor:       'pointer',
              fontFamily:   'var(--font-body)',
              letterSpacing: '0.01em',
              transition:   'opacity 0.12s ease',
              touchAction:  'manipulation',
              boxShadow:    '0 2px 8px rgba(220,38,38,0.25)',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Go to {move.to_position.name} →
          </button>
        </div>
      )}

      {/* ── Club comments ────────────────────────────────────────────── */}
      {/* Collapsible. Tap target is full-width for mobile friendliness.
          Only shows comment input if user is in a club. */}
      <div>

        {/* Toggle header — full width tap target */}
        <button
          onClick={() => setShowComments(prev => !prev)}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            width:          '100%',
            background:     'none',
            border:         'none',
            borderBottom:   showComments ? '0.5px solid var(--border)' : 'none',
            padding:        '13px 18px',
            cursor:         'pointer',
            touchAction:    'manipulation',
            minHeight:      '2.75rem',
          }}
        >
          <div style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         'var(--text-muted)',
            display:       'flex',
            alignItems:    'center',
            gap:           6,
          }}>
            Club notes
            {comments.length > 0 && (
              <span style={{
                background:   'var(--bg-subtle)',
                border:       '0.5px solid var(--border)',
                borderRadius: 20,
                padding:      '1px 6px',
                fontSize:     9,
                fontWeight:   700,
                color:        'var(--text-muted)',
              }}>
                {comments.length}
              </span>
            )}
          </div>
          <span style={{
            fontSize:   11,
            color:      'var(--text-muted)',
            transform:  showComments ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            lineHeight: 1,
          }}>
            ▾
          </span>
        </button>

        {showComments && (
          <div style={{ padding: '12px 18px' }}>

            {/* Comment list */}
            <div style={{
              background:              'var(--bg-subtle)',
              border:                  '0.5px solid var(--border)',
              borderRadius:            'var(--radius-md)',
              padding:                 '6px 12px',
              marginBottom:            10,
              maxHeight:               '13rem',
              overflowY:               'auto',
              WebkitOverflowScrolling: 'touch',
            }}>
              {commentsLoading ? (
                <div style={{
                  fontSize: 12,
                  color:    'var(--text-muted)',
                  padding:  '6px 0',
                }}>
                  Loading...
                </div>
              ) : comments.length === 0 ? (
                <div style={{
                  fontSize:   12,
                  color:      'var(--text-muted)',
                  padding:    '6px 0',
                  lineHeight: 1.5,
                }}>
                  No notes yet. Add a coaching cue for your club.
                </div>
              ) : (
                comments.map((c, i) => (
                  <div
                    key={c.id}
                    style={{
                      borderBottom: i < comments.length - 1
                        ? '0.5px solid var(--border)'
                        : 'none',
                      padding: '8px 0',
                    }}
                  >
                    <div style={{
                      fontSize:    11,
                      fontWeight:  600,
                      color:       'var(--text-primary)',
                      marginBottom: 3,
                      display:     'flex',
                      alignItems:  'center',
                      gap:         6,
                    }}>
                      {/* Handles both array and object shape from Supabase nested select */}
                      {(Array.isArray(c.profiles)
                        ? c.profiles[0]?.display_name
                        : c.profiles?.display_name) || 'Unknown'}
                      <span style={{
                        fontWeight: 400,
                        color:      'var(--text-muted)',
                        fontSize:   10,
                      }}>
                        {new Date(c.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day:   'numeric',
                        })}
                      </span>
                    </div>
                    <div style={{
                      fontSize:   13,
                      color:      'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}>
                      {c.comment}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment input — only if user is in a club */}
            {clubId && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => {
                    // Submit on Enter (not Shift+Enter) — desktop only
                    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
                      e.preventDefault()
                      handleAddComment()
                    }
                  }}
                  placeholder="Add a coaching note for your club..."
                  rows={2}
                  style={{
                    flex:        1,
                    resize:      'none',
                    padding:     '9px 12px',
                    borderRadius:'var(--radius-md)',
                    border:      '0.5px solid var(--border)',
                    background:  'var(--bg-surface)',
                    // 16px prevents iOS zoom on focus — do not lower
                    fontSize:    '16px',
                    fontFamily:  'var(--font-body)',
                    color:       'var(--text-primary)',
                    lineHeight:  1.4,
                    outline:     'none',
                    transition:  'border-color 0.12s ease',
                  }}
                  onFocus={e  => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={e   => e.currentTarget.style.borderColor = 'var(--border)'}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || commentPosting}
                  style={{
                    padding:      '9px 14px',
                    borderRadius: 'var(--radius-md)',
                    border:       'none',
                    background:   'var(--accent)',
                    color:        '#fff',
                    fontSize:     12,
                    fontWeight:   700,
                    cursor:       !newComment.trim() || commentPosting
                      ? 'not-allowed'
                      : 'pointer',
                    opacity:     !newComment.trim() || commentPosting ? 0.45 : 1,
                    transition:  'opacity 0.12s ease',
                    whiteSpace:  'nowrap',
                    minHeight:   '2.75rem',
                    touchAction: 'manipulation',
                    fontFamily:  'var(--font-body)',
                  }}
                >
                  {commentPosting ? '...' : 'Post'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Animation keyframe ───────────────────────────────────────── */}
      <style>{`
        @keyframes mdSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

    </div>
  )
}