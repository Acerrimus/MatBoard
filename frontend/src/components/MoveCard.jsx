export default function MoveCard({ move, onClick }) {
  return (
    <div
      onClick={() => onClick(move)}
      style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
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
        e.currentTarget.style.borderColor = 'var(--border)'
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
  const isMove = type === 'move'
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      padding: '2px 7px',
      borderRadius: 20,
      background: isMove ? 'var(--move-soft)' : 'var(--accent-soft)',
      color: isMove ? 'var(--move-color)' : 'var(--accent)',
      display: 'inline-block',
    }}>
      {children}
    </span>
  )
}
