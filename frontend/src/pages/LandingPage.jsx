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
            }}>Get started free</button>
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{
        maxWidth: '52rem', margin: '0 auto',
        padding: '5rem 2rem 4rem',
        textAlign: 'center',
      }}>

        {/* Credibility badge */}
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
          Built by wrestlers, for wrestlers
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.25rem, 5.5vw, 3.25rem)',
          fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.1,
          color: 'var(--text-primary)', marginBottom: '1.75rem',
        }}>
          Know your squad's weak spots<br />
          <span style={{ color: 'var(--accent)' }}>before they ever step on the mat.</span>
        </h1>

        <p style={{
          fontSize: '1.125rem', color: 'var(--text-secondary)', lineHeight: 1.75,
          maxWidth: '34rem', margin: '0 auto 2.5rem',
        }}>
          Matboard tracks every athlete's technique confidence across every position and move.
          You see where your squad is strong, where it falls apart, and what to coach next.
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
          >Set up your squad — free</button>
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
          Free during early access · No credit card · Full curriculum built in
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
          }}>The problem</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
            fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.3,
            color: 'var(--text-primary)', marginBottom: '1.5rem',
          }}>
            You can't track every athlete's technique in your head.
          </h2>
          <p style={{
            fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.75,
            marginBottom: '1rem',
          }}>
            You watch practice every day. You know your squad. But when you try to pin down
            exactly who's weak where — across every position, every technique, every athlete —
            it gets fuzzy. You end up coaching what feels right instead of what the squad actually needs.
          </p>
          <p style={{
            fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.75,
          }}>
            And you find out the real gaps at tournaments. When it's already too late.
          </p>
        </div>
      </div>

      {/* ── How it works ── */}
      <div style={{
        maxWidth: '44rem', margin: '0 auto',
        padding: '4rem 2rem',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem',
        }}>How it works</div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
          fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.3,
          color: 'var(--text-primary)', marginBottom: '2.5rem',
        }}>
          Three steps. Real data by end of practice.
        </h2>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
          gap: '2rem', textAlign: 'left',
        }}>
          {[
            {
              num: '01',
              title: 'Athletes rate themselves',
              desc: 'Each athlete taps through their confidence on every technique. Takes about 30 seconds. No coach time needed.',
            },
            {
              num: '02',
              title: 'You see everything',
              desc: 'A live dashboard shows your squad\'s strengths and gaps across every position and move. Heatmap, risk flags, chain breakdowns.',
            },
            {
              num: '03',
              title: 'You coach what matters',
              desc: 'Walk into practice knowing exactly which techniques need work and which athletes need attention.',
            },
          ].map(({ num, title, desc }) => (
            <div key={num}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.8125rem',
                fontWeight: 700, color: 'var(--accent)', marginBottom: '0.625rem',
              }}>{num}</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '1.0625rem',
                fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem',
                letterSpacing: '-0.3px',
              }}>{title}</div>
              <p style={{
                fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7,
                margin: 0,
              }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '3rem 2rem 5rem' }}>

        {/* Feature 1 — Technique Graph */}
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
              Wrestling is a chain sport. A shot means nothing if the finish isn't there.
              Matboard maps the full picture — positions, moves, and the connections between them —
              so you can see where a chain breaks down, not just where it starts.
            </p>
            <p style={{
              fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7,
            }}>
              Full folkstyle and freestyle curricula are built in with video. Add your own moves
              and build club-specific progressions on top.
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

        {/* Feature 2 — Squad Matrix */}
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
            }}>Every athlete.<br />Every technique.<br />One view.</h3>
            <p style={{
              fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7,
              marginBottom: '1rem',
            }}>
              Athletes rate their confidence from 1 to 5 on every move in the curriculum.
              You get a colour-coded matrix of your entire squad. Green means they're confident.
              Red means they're not. Gaps are obvious at a glance.
            </p>
            <p style={{
              fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7,
            }}>
              Filter by curriculum or position. Sort by squad average. Spot who's struggling
              and on what — without asking them.
            </p>
          </div>
        </div>

        {/* Feature 3 — Squad Insights */}
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
            }}>Your drill plan writes itself.</h3>
            <p style={{
              fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7,
              marginBottom: '1rem',
            }}>
              Matboard surfaces the weakest technique across your squad, the most inconsistent move,
              and which athletes are falling behind. All computed from your athletes' actual data.
            </p>
            <p style={{
              fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7,
            }}>
              This isn't generic coaching advice from the internet. It's your squad's real numbers
              telling you what to do next Tuesday.
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

      {/* ── Built by wrestlers ── */}
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
          }}>Why this exists</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
            fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.3,
            color: 'var(--text-primary)', marginBottom: '1.5rem',
          }}>
            Built by wrestlers. For wrestlers.
          </h2>
          <p style={{
            fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.75,
            marginBottom: '1rem',
          }}>
            Matboard was built by a 2× English Wrestling Champion who spent years coaching with
            the same garbage tools everyone else uses — spreadsheets, notebooks, memory.
            The sport deserves better than that.
          </p>
          <p style={{
            fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.75,
          }}>
            Every position, every move, every progression was built by someone who's
            been on the mat. The sport knowledge is real. The tool was built from the inside.
          </p>
        </div>
      </div>

      {/* ── Sports roadmap ── */}
      <div style={{
        background: 'var(--bg-subtle)',
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
          Know what each athlete needs.<br />At a glance.
        </h2>
        <p style={{
          fontSize: '1rem', color: 'var(--text-secondary)',
          lineHeight: 1.75, marginBottom: '2.5rem',
        }}>
          Set up your squad in two minutes. Athletes rate themselves before the end of practice.
          You walk in tomorrow knowing exactly what to coach.
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
        >Get started — free</button>
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