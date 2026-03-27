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
        background: 'var(--bg-page)',
        borderBottom: '0.5px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700,
          letterSpacing: '-0.3px',
        }}>
          Mat<span style={{ color: 'var(--accent)' }}>board</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500,
              background: 'transparent', color: 'var(--text-secondary)',
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
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
        maxWidth: '52rem', margin: '0 auto',
        padding: '5rem 2rem 4rem',
        textAlign: 'center',
      }}>

        {/* Credibility badge — front and centre */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '0.375rem 0.875rem',
          marginBottom: '2rem',
        }}>
          <span style={{ color: 'var(--accent)' }}>🥇</span>
          Built by a 2× English Wrestling Champion
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.25rem, 5.5vw, 3.25rem)',
          fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.1,
          color: 'var(--text-primary)', marginBottom: '1.75rem',
        }}>
          You have 20 athletes.<br />
          A tournament in 3 weeks.<br />
          <span style={{ color: 'var(--accent)' }}>Who's lying to themselves<br />about their double leg?</span>
        </h1>

        <p style={{
          fontSize: '1.125rem', color: 'var(--text-secondary)', lineHeight: 1.75,
          maxWidth: '34rem', margin: '0 auto 2.5rem',
        }}>
          Matboard maps your entire curriculum as a technique graph.
          Athletes rate their own confidence. You see exactly where your squad breaks down —
          and what to drill before it costs you a match.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button
            onClick={() => navigate('/login?tab=signup')}
            style={{
              padding: '0.9375rem 2.25rem', fontSize: '1rem', fontWeight: 700,
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', fontFamily: 'var(--font-display)',
              boxShadow: '0 4px 20px rgba(220,38,38,0.25)',
              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(220,38,38,0.35)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(220,38,38,0.25)'
            }}
          >Get early access — free</button>
          <button
            onClick={() => navigate('/explore')}
            style={{
              padding: '0.9375rem 2.25rem', fontSize: '1rem', fontWeight: 600,
              background: 'var(--bg-surface)', color: 'var(--text-primary)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', fontFamily: 'var(--font-display)',
            }}>Explore the graph →</button>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Free during early access · No credit card · USA Wrestling curriculum included
        </div>
      </div>

      {/* ── Hero screenshot ── */}
      <div style={{
        maxWidth: '56rem', margin: '0 auto',
        padding: '0 2rem 5rem',
      }}>
        <div style={{
          width: '100%', aspectRatio: '16/9',
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8,
          overflow: 'hidden',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            SCREENSHOT — Squad dashboard
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--border-strong)' }}>
            replace tomorrow
          </div>
        </div>
      </div>

      {/* ── The problem ── */}
      <div style={{
        background: 'var(--bg-surface)',
        borderTop: '0.5px solid var(--border)',
        borderBottom: '0.5px solid var(--border)',
        padding: '4rem 2rem',
      }}>
        <div style={{ maxWidth: '44rem', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem',
          }}>The problem every coach knows</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
            fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.3,
            color: 'var(--text-primary)', marginBottom: '1.5rem',
          }}>
            Athletes say they're ready.<br />The mat says otherwise.
          </h2>
          <p style={{
            fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.75,
          }}>
            Self-reported confidence isn't the same as real confidence — but it's a signal.
            When 15 of your 20 athletes rate their double leg a 2 out of 5, that's not a hunch.
            That's your drill plan for Tuesday.
          </p>
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '5rem 2rem' }}>

        {/* Feature 1 */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
          gap: '3rem', alignItems: 'center', marginBottom: '5rem',
        }}>
          <div>
            <div style={{
              fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--move-color)', marginBottom: '0.75rem',
            }}>The technique graph</div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700,
              letterSpacing: '-0.5px', lineHeight: 1.25,
              color: 'var(--text-primary)', marginBottom: '1rem',
            }}>Every position.<br />Every move.<br />Every connection.</h3>
            <p style={{
              fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7,
              marginBottom: '1rem',
            }}>
              The full USA Wrestling Level 1 and Level 2 freestyle curriculum is already built in.
              Positions are nodes. Moves are edges. The whole sport is mapped as a graph —
              so you can see chains, not just techniques in isolation.
            </p>
            <p style={{
              fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7,
            }}>
              Add your own moves. Build club-specific curricula. Teach your system, not someone else's.
            </p>
          </div>
          <div style={{
            aspectRatio: '4/3',
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              SCREENSHOT — Technique graph
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--border-strong)' }}>
              replace tomorrow
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
          gap: '3rem', alignItems: 'center', marginBottom: '5rem',
        }}>
          <div style={{
            aspectRatio: '4/3',
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
            order: -1,
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              SCREENSHOT — Progress matrix
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--border-strong)' }}>
              replace tomorrow
            </div>
          </div>
          <div>
            <div style={{
              fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.75rem',
            }}>The squad matrix</div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700,
              letterSpacing: '-0.5px', lineHeight: 1.25,
              color: 'var(--text-primary)', marginBottom: '1rem',
            }}>Every athlete.<br />Every move.<br />One view.</h3>
            <p style={{
              fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7,
              marginBottom: '1rem',
            }}>
              Athletes rate their confidence on every move from 1 to 5.
              You see the whole squad in a single matrix — who's strong,
              who's weak, and who's overrating themselves relative to the squad average.
            </p>
            <p style={{
              fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7,
            }}>
              Filter by curriculum. Spot the weak link in a chain instantly.
              The data does the scouting.
            </p>
          </div>
        </div>

        {/* Feature 3 */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
          gap: '3rem', alignItems: 'center',
        }}>
          <div>
            <div style={{
              fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--success)', marginBottom: '0.75rem',
            }}>Squad insights</div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700,
              letterSpacing: '-0.5px', lineHeight: 1.25,
              color: 'var(--text-primary)', marginBottom: '1rem',
            }}>Your drill plan.<br />Computed from<br />your own data.</h3>
            <p style={{
              fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7,
              marginBottom: '1rem',
            }}>
              Matboard surfaces the weakest move across your squad, the most inconsistent technique,
              and the highest-impact thing to focus on before your next competition.
            </p>
            <p style={{
              fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7,
            }}>
              Not a generic recommendation. Computed from your athletes' actual ratings.
            </p>
          </div>
          <div style={{
            aspectRatio: '4/3',
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              SCREENSHOT — Squad insights
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--border-strong)' }}>
              replace tomorrow
            </div>
          </div>
        </div>
      </div>

      {/* ── Sports roadmap ── */}
      <div style={{
        background: 'var(--bg-subtle)',
        borderTop: '0.5px solid var(--border)',
        borderBottom: '0.5px solid var(--border)',
        padding: '2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '3rem', flexWrap: 'wrap',
      }}>
        {[
          { sport: 'Wrestling', status: 'Live now', color: 'var(--success)', dot: 'var(--success)' },
          { sport: 'BJJ', status: 'Coming soon', color: 'var(--text-muted)', dot: 'var(--border-strong)' },
          { sport: 'Judo', status: 'Coming soon', color: 'var(--text-muted)', dot: 'var(--border-strong)' },
        ].map(({ sport, status, color, dot }) => (
          <div key={sport} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: dot, flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '0.9375rem', color: 'var(--text-primary)',
            }}>{sport}</span>
            <span style={{ fontSize: '0.75rem', color }}>{status}</span>
          </div>
        ))}
      </div>

      {/* ── Final CTA ── */}
      <div style={{
        maxWidth: '40rem', margin: '0 auto',
        padding: '6rem 2rem',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.2,
          color: 'var(--text-primary)', marginBottom: '1.25rem',
        }}>
          Stop guessing.<br />Start seeing.
        </h2>
        <p style={{
          fontSize: '1rem', color: 'var(--text-secondary)',
          lineHeight: 1.75, marginBottom: '2.5rem',
        }}>
          Early access is free. Get your squad set up before Thursday's practice
          and walk in knowing exactly what to drill.
        </p>
        <button
          onClick={() => navigate('/login?tab=signup')}
          style={{
            padding: '1rem 2.75rem', fontSize: '1.0625rem', fontWeight: 700,
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)',
            cursor: 'pointer', fontFamily: 'var(--font-display)',
            boxShadow: '0 4px 20px rgba(220,38,38,0.25)',
            display: 'block', margin: '0 auto 1rem',
            transition: 'transform 0.1s ease, box-shadow 0.1s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(220,38,38,0.35)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(220,38,38,0.25)'
          }}
        >Get early access — free</button>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Free during early access · No credit card required
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: '0.5px solid var(--border)',
        padding: '1.5rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
          letterSpacing: '-0.3px',
        }}>
          Mat<span style={{ color: 'var(--accent)' }}>board</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Wrestling · BJJ · Judo
        </div>
      </div>

    </div>
  )
}