import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-body)',
    }}>

      {/* ── Nav ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 2rem',
        borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg-surface)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700,
          letterSpacing: '-0.3px',
        }}>
          Mat<span style={{ color: 'var(--accent)' }}>board</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: 500,
              background: 'transparent', color: 'var(--text-secondary)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>Sign in</button>
          <button
            onClick={() => navigate('/login?tab=signup')}
            style={{
              padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: 600,
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>Get early access</button>
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{
        maxWidth: '48rem', margin: '0 auto',
        padding: '5rem 2rem 3.5rem',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--accent)',
          background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.75rem',
          marginBottom: '1.5rem',
        }}>Wrestling · Early Access</div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.15,
          color: 'var(--text-primary)', marginBottom: '1.5rem',
        }}>
          You have 20 athletes and a tournament in 3 weeks.{' '}
          <span style={{ color: 'var(--accent)' }}>Do you know who's lying to themselves about their double leg?</span>
        </h1>

        <p style={{
          fontSize: '1.0625rem', color: 'var(--text-secondary)', lineHeight: 1.7,
          maxWidth: '36rem', margin: '0 auto 2.5rem',
        }}>
          Matboard is a technique graph for wrestling. Athletes rate their own confidence on every move.
          Coaches see exactly where the squad breaks down — and what to drill next.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/login?tab=signup')}
            style={{
              padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 700,
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', fontFamily: 'var(--font-display)',
              boxShadow: 'var(--shadow-md)',
            }}>Get early access — free</button>
          <button
            onClick={() => navigate('/explore')}
            style={{
              padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 600,
              background: 'transparent', color: 'var(--text-primary)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', fontFamily: 'var(--font-display)',
            }}>Explore the graph →</button>
        </div>
      </div>

      {/* ── Three pillars ── */}
      <div style={{
        maxWidth: '56rem', margin: '0 auto',
        padding: '0 2rem 4rem',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
        gap: '1rem',
      }}>
        {[
          {
            icon: '🗺️',
            title: 'The full technique graph',
            body: 'Every position. Every move. USA Wrestling Level 1 and Level 2 freestyle curriculum already built in — nothing to set up.',
          },
          {
            icon: '📊',
            title: 'Know your squad's weak points',
            body: 'Athletes self-rate their confidence. You see the matrix — who's strong, who's lying to themselves, and where the whole squad is falling apart.',
          },
          {
            icon: '🎯',
            title: 'Know what to drill next',
            body: 'Build curricula, track chains, and let the data tell you the most impactful thing to focus on before the next tournament.',
          },
        ].map(({ icon, title, body }) => (
          <div key={title} style={{
            background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '1.5rem',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{icon}</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
              color: 'var(--text-primary)', marginBottom: '0.5rem',
            }}>{title}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{body}</div>
          </div>
        ))}
      </div>

      {/* ── Sports expansion strip ── */}
      <div style={{
        borderTop: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg-subtle)',
        padding: '1rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '2rem', flexWrap: 'wrap',
      }}>
        {[
          { sport: 'Wrestling', status: 'live', color: 'var(--success)' },
          { sport: 'BJJ', status: 'coming soon', color: 'var(--text-muted)' },
          { sport: 'Judo', status: 'coming soon', color: 'var(--text-muted)' },
        ].map(({ sport, status, color }) => (
          <div key={sport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: color,
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{
              fontSize: '0.8125rem', fontWeight: 600,
              fontFamily: 'var(--font-display)', color: 'var(--text-primary)',
            }}>{sport}</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{status}</span>
          </div>
        ))}
      </div>

      {/* ── CTA footer ── */}
      <div style={{
        textAlign: 'center', padding: '4rem 2rem',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          fontWeight: 700, letterSpacing: '-0.5px',
          color: 'var(--text-primary)', marginBottom: '1rem',
        }}>Built by a 2× English champion.<br />For coaches who want to win.</h2>
        <p style={{
          fontSize: '0.9375rem', color: 'var(--text-secondary)',
          marginBottom: '2rem', lineHeight: 1.6,
        }}>Early access is free. No credit card. Get your squad set up in minutes.</p>
        <button
          onClick={() => navigate('/login?tab=signup')}
          style={{
            padding: '0.875rem 2.5rem', fontSize: '1rem', fontWeight: 700,
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)',
            cursor: 'pointer', fontFamily: 'var(--font-display)',
            boxShadow: 'var(--shadow-md)',
          }}>Get early access — free</button>
      </div>

    </div>
  )
}