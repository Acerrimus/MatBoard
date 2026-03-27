export function confidenceColor(confidence) {
  if (!confidence) return 'var(--border)'
  if (confidence <= 2) return '#EF4444'
  if (confidence === 3) return 'var(--comp-ready)'
  return '#22C55E'
}

export function confidenceBg(confidence) {
  if (!confidence) return 'transparent'
  if (confidence <= 2) return 'rgba(239,68,68,0.08)'
  if (confidence === 3) return 'rgba(245,158,11,0.08)'
  return 'rgba(34,197,94,0.08)'
}

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

export default function MoveCard({ move, onClick, isOnBoard }) {
  return (
    <div
      onClick={() => onClick(move)}
      style={{
        background: 'var(--bg-surface)',
        border: `0.5px solid ${isOnBoard ? confidenceColor(null) : 'var(--border)'}`,
        borderLeft: isOnBoard ? `3px solid var(--move-color)` : '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '13px 16px',
        marginBottom: 6,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'border-color var(--transition), background var(--transition)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.background = 'var(--accent-soft)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isOnBoard ? 'var(--move-color)' : 'var(--border)'
        e.currentTarget.style.background = 'var(--bg-surface)'
      }}
    >
      <div>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-primary)',
          marginBottom: 4,
        }}>
          {move.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Chip type="move">move</Chip>
          {isOnBoard && <Chip type="board">on board</Chip>}
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            → {move.to_position?.name ?? '—'} · Risk {move.risk_rating ?? '?'}/5
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {move.scoring_value > 0 && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--success)',
            background: 'var(--success-soft)',
            border: '0.5px solid var(--success-border)',
            padding: '2px 7px',
            borderRadius: 4,
          }}>
            {move.scoring_value}pts
          </span>
        )}
        <span style={{ color: 'var(--border-strong)', fontSize: 16 }}>›</span>
      </div>
    </div>
  )
}

export function Chip({ type, children }) {
  const styles = {
    move:     { background: 'var(--move-soft)',   color: 'var(--move-color)' },
    position: { background: 'var(--accent-soft)', color: 'var(--accent)'     },
    board:    { background: 'var(--bg-subtle)',    color: 'var(--text-muted)' },
  }
  const s = styles[type] ?? styles.move
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      padding: '2px 7px',
      borderRadius: 20,
      display: 'inline-block',
      ...s,
    }}>
      {children}
    </span>
  )
}