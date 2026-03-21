import { Chip } from './MoveCard'

function RiskDots({ value }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(i => (
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

export default function MoveDetail({ move, onNavigate, onBack }) {
  if (!move) return null

  const videoId = move.youtube_url
    ? move.youtube_url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1]
    : null

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: 16,
      animation: 'slideIn 0.18s ease',
    }}>

      {/* Header */}
      <div style={{
        padding: '18px 20px 16px',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
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
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 480 }}>
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
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              fontFamily: 'var(--font-body)',
            }}
          >
            ✕ close
          </button>
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
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ fontSize: 24 }}>▷</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No video attached yet</div>
        </div>
      )}

      {/* Stats row */}
      <div style={{
        padding: '14px 20px',
        display: 'flex',
        gap: 12,
        borderBottom: '0.5px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <StatCard label="Scoring value">
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--success)' }}>
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
      </div>

      {/* Coaching cues placeholder */}
      <div style={{ padding: '14px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Coaching cues
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No coaching cues added yet.
        </div>
      </div>
    </div>
  )
}

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
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {label}
      </div>
      {children}
    </div>
  )
}
