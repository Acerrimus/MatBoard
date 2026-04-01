// ── MoveCard.jsx ──────────────────────────────────────────────────────────────
// Exports: confidenceColor, confidenceBg, moveType, moveTypeColor, Chip
// Default export: MoveCard — used on ProgressPage board list.
// MoveRow (ExplorePage) and MoveRow (ProgressPage) are defined locally
// in their respective pages and import the utility exports from here.

// ── Confidence colour scale ───────────────────────────────────────────────────
// 1–2: red (needs work), 3: amber (developing), 4–5: green (strong)
// null/0: falls back to --border (unrated)
export function confidenceColor(confidence) {
  if (!confidence) return 'var(--border)'
  if (confidence <= 2) return 'var(--conf-low)'
  if (confidence === 3) return 'var(--comp-ready)'
  return 'var(--conf-high)'
}

export function confidenceBg(confidence) {
  if (!confidence) return 'transparent'
  if (confidence <= 2) return 'var(--conf-low-bg)'
  if (confidence === 3) return 'var(--conf-mid-bg)'
  return 'var(--conf-high-bg)'
}

// ── Move ownership helpers ────────────────────────────────────────────────────
export function moveType(move) {
  if (!move.created_by && !move.club_id) return 'global'
  if (move.club_id)                       return 'club'
  return 'personal'
}

export function moveTypeColor(move) {
  const t = moveType(move)
  if (t === 'club')     return 'var(--comp-ready)'
  if (t === 'personal') return 'var(--move-color)'
  return 'var(--move-color)'
}

// ── Confidence label ──────────────────────────────────────────────────────────
export function confidenceLabel(confidence) {
  if (!confidence) return null
  if (confidence <= 2) return 'Needs work'
  if (confidence === 3) return 'Developing'
  return 'Strong'
}

// ── Chip ──────────────────────────────────────────────────────────────────────
// Lightweight inline badge. Used in MoveDetail and elsewhere.
export function Chip({ type, children }) {
  const styles = {
    move:     { background: 'var(--move-soft)',   color: 'var(--move-color)'  },
    position: { background: 'var(--accent-soft)', color: 'var(--accent)'      },
    board:    { background: 'var(--bg-subtle)',    color: 'var(--text-muted)'  },
    personal: { background: 'var(--move-soft)',    color: 'var(--move-color)'  },
    club:     { background: 'var(--comp-ready-soft)', color: 'var(--comp-ready)' },
  }
  const s = styles[type] ?? styles.move
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      padding: '2px 7px',
      borderRadius: 20,
      display: 'inline-block',
      lineHeight: 1.6,
      ...s,
    }}>
      {children}
    </span>
  )
}

// ── MoveCard ──────────────────────────────────────────────────────────────────
// Used on ProgressPage board list. Receives the full board item (item.move +
// item.progress). Confidence is encoded on the left border and as a right-side
// badge so the athlete can scan their whole board and spot weak moves instantly.
export default function MoveCard({ move, onClick, isOnBoard, progress }) {
  const confidence  = progress?.confidence ?? null
  const isFavourite = progress?.is_favourite ?? false
  const tt          = moveType(move)
  const borderColor = confidenceColor(confidence)

  return (
    <div
      onClick={() => onClick(move)}
      style={{
        background:   'var(--bg-surface)',
        border:       '0.5px solid var(--border)',
        borderLeft:   `3px solid ${isOnBoard ? borderColor : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        padding:      '12px 14px 12px 16px',
        cursor:       'pointer',
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        transition:   'background 0.12s ease, border-color 0.12s ease',
        // Left border transition needs the shorthand to be split for smooth animation
        borderLeftWidth:  3,
        borderLeftStyle: 'solid',
        borderLeftColor: isOnBoard ? borderColor : 'var(--border)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background    = 'var(--bg-subtle)'
        e.currentTarget.style.borderColor   = 'var(--border-strong)'
        // Preserve left border colour on hover
        e.currentTarget.style.borderLeftColor = isOnBoard ? borderColor : 'var(--border-strong)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background    = 'var(--bg-surface)'
        e.currentTarget.style.borderColor   = 'var(--border)'
        e.currentTarget.style.borderLeftColor = isOnBoard ? borderColor : 'var(--border)'
      }}
    >

      {/* Confidence dot — gives instant visual status at board-list level */}
      <div style={{
        width:        10,
        height:       10,
        borderRadius: '50%',
        flexShrink:   0,
        background:   isOnBoard ? confidenceColor(confidence) : 'var(--border)',
        boxShadow:    isOnBoard && confidence
          ? `0 0 0 3px ${confidenceBg(confidence)}`
          : 'none',
        transition:   'background 0.15s ease, box-shadow 0.15s ease',
      }} />

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Move name */}
        <div style={{
          fontSize:     14,
          fontWeight:   600,
          color:        'var(--text-primary)',
          fontFamily:   'var(--font-body)',
          whiteSpace:   'nowrap',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          marginBottom: 3,
          lineHeight:   1.3,
        }}>
          {move.name}
          {/* Ownership badge — only for non-global moves */}
          {tt !== 'global' && (
            <span style={{
              marginLeft:    6,
              fontSize:      9,
              fontWeight:    700,
              color:         moveTypeColor(move),
              background:    `${moveTypeColor(move)}18`,
              border:        `0.5px solid ${moveTypeColor(move)}44`,
              borderRadius:  3,
              padding:       '1px 5px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              verticalAlign: 'middle',
            }}>
              {tt === 'personal' ? 'Mine' : 'Club'}
            </span>
          )}
        </div>

        {/* Destination + scoring */}
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        6,
          fontSize:   11,
          color:      'var(--text-muted)',
          lineHeight: 1,
        }}>
          <span>→ {move.to_position?.name ?? '—'}</span>
          {move.scoring_value > 0 && (
            <>
              <span style={{ color: 'var(--border-strong)' }}>·</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                {move.scoring_value}pts
              </span>
            </>
          )}
          {isFavourite && (
            <>
              <span style={{ color: 'var(--border-strong)' }}>·</span>
              <span style={{ color: 'var(--comp-ready)', fontSize: 10 }}>★</span>
            </>
          )}
        </div>
      </div>

      {/* Right side — confidence badge or unrated nudge */}
      <div style={{
        flexShrink: 0,
        display:    'flex',
        alignItems: 'center',
        gap:        8,
      }}>
        {isOnBoard && confidence ? (
          <div style={{
            fontSize:     11,
            fontWeight:   700,
            color:        confidenceColor(confidence),
            background:   confidenceBg(confidence),
            border:       `0.5px solid ${confidenceColor(confidence)}44`,
            borderRadius: 6,
            padding:      '3px 8px',
            lineHeight:   1,
            whiteSpace:   'nowrap',
          }}>
            {confidence}/5
          </div>
        ) : isOnBoard ? (
          <div style={{
            fontSize:     10,
            fontWeight:   600,
            color:        'var(--text-muted)',
            background:   'var(--bg-subtle)',
            border:       '0.5px solid var(--border)',
            borderRadius: 6,
            padding:      '3px 8px',
            lineHeight:   1,
            whiteSpace:   'nowrap',
          }}>
            Rate it
          </div>
        ) : null}

        {/* Chevron */}
        <span style={{
          fontSize:   14,
          color:      'var(--border-strong)',
          lineHeight: 1,
        }}>›</span>
      </div>

    </div>
  )
}