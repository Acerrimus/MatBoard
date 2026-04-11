import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function useReveal(threshold = 0.1) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return [ref, visible]
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [breakpoint])
  return isMobile
}

const reveal = (visible, delay = 0) => ({
  opacity: visible ? 1 : 0,
  transform: visible ? 'translateY(0)' : 'translateY(18px)',
  transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
})

// ── Shared ────────────────────────────────────────────────────────────────────

const Label = ({ children, color = 'var(--text-muted)' }) => (
  <div style={{
    fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.14em',
    textTransform: 'uppercase', color, marginBottom: '0.875rem',
  }}>
    {children}
  </div>
)

const Screenshot = ({ src, alt, aspect = '4/3' }) => (
  <div style={{
    aspectRatio: aspect,
    borderRadius: 'var(--radius-lg)',
    border: '0.5px solid var(--border)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-md)',
  }}>
    <img
      src={src}
      alt={alt}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  </div>
)

const PrimaryButton = ({ children, onClick, fullWidth = false }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} style={{
      width: fullWidth ? '100%' : 'auto',
      padding: '0.9375rem 2.25rem',
      minHeight: '48px',
      fontSize: '1rem', fontWeight: 700,
      background: 'var(--accent)', color: '#fff',
      border: 'none', borderRadius: 'var(--radius-md)',
      cursor: 'pointer', fontFamily: 'var(--font-display)',
      boxShadow: hovered ? '0 8px 28px rgba(220,38,38,0.4)' : '0 4px 20px rgba(220,38,38,0.25)',
      transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      transition: 'transform 0.12s ease, box-shadow 0.12s ease',
      whiteSpace: 'nowrap',
    }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  )
}

const GhostButton = ({ children, onClick, fullWidth = false }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} style={{
      width: fullWidth ? '100%' : 'auto',
      padding: '0.9375rem 2.25rem',
      minHeight: '48px',
      fontSize: '1rem', fontWeight: 600,
      background: 'transparent',
      color: hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
      border: `0.5px solid ${hovered ? 'var(--text-muted)' : 'var(--border-strong)'}`,
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer', fontFamily: 'var(--font-display)',
      transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      transition: 'all 0.12s ease',
      whiteSpace: 'nowrap',
    }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav({ navigate }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      height: '60px',
      display: 'flex', alignItems: 'center',
      padding: '0 1.25rem',
      background: scrolled ? 'rgba(15,17,23,0.9)' : 'transparent',
      backdropFilter: scrolled ? 'blur(14px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
      borderBottom: `0.5px solid ${scrolled ? 'var(--border)' : 'transparent'}`,
      transition: 'background 0.2s ease, border-color 0.2s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: '64rem', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            fontFamily: 'var(--font-display)', fontSize: '1.125rem',
            fontWeight: 700, letterSpacing: '-0.3px',
            cursor: 'pointer', color: 'var(--text-primary)',
          }}
        >
          Mat<span style={{ color: 'var(--accent)' }}>board</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button onClick={() => navigate('/login')} style={{
            padding: '0.625rem 0.875rem',
            minHeight: '44px', minWidth: '44px',
            fontSize: '0.875rem', fontWeight: 500,
            background: 'transparent', color: 'var(--text-secondary)',
            border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            Sign in
          </button>
          <button onClick={() => navigate('/login?tab=signup')} style={{
            padding: '0.625rem 1.125rem',
            minHeight: '44px',
            fontSize: '0.875rem', fontWeight: 600,
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)',
            cursor: 'pointer', fontFamily: 'var(--font-display)',
            boxShadow: '0 2px 10px rgba(220,38,38,0.2)',
          }}>
            Get started free
          </button>
        </div>
      </div>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero({ navigate }) {
  const isMobile = useIsMobile()

  return (
    <section style={{
      padding: isMobile ? '4rem 1.25rem 3.5rem' : '7rem 2rem 5rem',
      textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '700px', height: '500px',
        background: 'radial-gradient(ellipse at top, rgba(220,38,38,0.08) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '52rem', margin: '0 auto', position: 'relative' }}>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.75rem', fontWeight: 500,
          color: 'var(--text-secondary)',
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border)',
          borderRadius: '99px', padding: '0.375rem 1rem',
          marginBottom: '2rem',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--success)',
            boxShadow: '0 0 6px rgba(34,197,94,0.5)',
            flexShrink: 0,
          }} />
          Built by wrestlers, for wrestlers
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.125rem, 6vw, 3.75rem)',
          fontWeight: 700, letterSpacing: '-2px', lineHeight: 1.06,
          color: 'var(--text-primary)',
          marginBottom: '1.5rem',
        }}>
          Know your squad's weak spots{' '}
          <span style={{ color: 'var(--accent)' }}>before they step on the mat.</span>
        </h1>

        <p style={{
          fontSize: isMobile ? '1rem' : '1.125rem',
          lineHeight: 1.75,
          color: 'var(--text-secondary)',
          maxWidth: '34rem', margin: '0 auto 2.5rem',
        }}>
          Athletes rate their confidence on every technique in 30 seconds.
          You get a live dashboard showing exactly where your squad breaks down —
          position by position, chain by chain.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '0.75rem',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}>
          <PrimaryButton
            onClick={() => navigate('/login?tab=signup')}
            fullWidth={isMobile}
          >
            Set up your squad — free
          </PrimaryButton>
          <GhostButton
            onClick={() => navigate('/explore')}
            fullWidth={isMobile}
          >
            Explore the graph →
          </GhostButton>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Free during early access · No credit card · Full curriculum built in
        </p>
      </div>
    </section>
  )
}

// ── Hero Screenshot ───────────────────────────────────────────────────────────

function HeroScreenshot() {
  const [ref, visible] = useReveal(0.05)
  return (
    <section ref={ref} style={{
      padding: '0 1.25rem 5rem',
      ...reveal(visible),
    }}>
      <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
        <Screenshot src="/dashboard.png" alt="Matboard squad dashboard — heatmap matrix, attention cards, athletes at risk" aspect="16/9" />
      </div>
    </section>
  )
}

// ── Problem ───────────────────────────────────────────────────────────────────

function Problem() {
  const [ref, visible] = useReveal()
  return (
    <section ref={ref} style={{
      background: 'var(--bg-surface)',
      borderTop: '0.5px solid var(--border)',
      borderBottom: '0.5px solid var(--border)',
      padding: '4rem 1.25rem',
    }}>
      <div style={{
        maxWidth: '40rem', margin: '0 auto',
        ...reveal(visible),
      }}>
        <Label>The problem</Label>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.625rem, 4vw, 2.25rem)',
          fontWeight: 700, letterSpacing: '-0.75px', lineHeight: 1.2,
          color: 'var(--text-primary)', marginBottom: '2rem',
        }}>
          You watch practice every day.<br />
          You still don't know who's ready.
        </h2>

        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1.25rem' }}>
          You can see the room. You know your athletes. But when you try to pin down
          exactly who's weak on the double-leg finish, which kids fall apart from
          referee's position, who's never going to hold a tilt — it gets fuzzy.
          Too many athletes, too many moves, one of you on that mat.
        </p>

        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1.25rem' }}>
          So you coach what feels right. What you noticed yesterday. What went wrong
          last weekend. You work off instinct because there's nothing else to work off.
        </p>

        <p style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.8, fontWeight: 500 }}>
          The real gaps don't show up in practice. They show up at a tournament,
          in a match that matters, when the chain breaks at exactly the point
          you never got to.
        </p>
      </div>
    </section>
  )
}

// ── How It Works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const [ref, visible] = useReveal()
  const isMobile = useIsMobile()

  const steps = [
    {
      num: '01',
      title: 'Athletes rate themselves.',
      body: 'Each athlete taps through their confidence on every technique — 1 to 5. Takes 30 seconds. No coach time, no data entry.',
    },
    {
      num: '02',
      title: 'You see everything.',
      body: 'A live dashboard maps your squad across every position, technique, and chain. Green means confident. Red means not. The gaps are obvious.',
    },
    {
      num: '03',
      title: 'You walk in knowing what to coach.',
      body: "Your squad's actual numbers. Not instinct. Plan practice around what they need — not what you felt last session.",
    },
  ]

  return (
    <section ref={ref} style={{ padding: '4rem 1.25rem' }}>
      <div style={{
        maxWidth: '56rem', margin: '0 auto',
        ...reveal(visible),
      }}>
        <Label>How it works</Label>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.625rem, 4vw, 2.25rem)',
          fontWeight: 700, letterSpacing: '-0.75px', lineHeight: 1.2,
          color: 'var(--text-primary)', marginBottom: '2.5rem',
        }}>
          One session. Real data. Your whole squad.
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          {steps.map((s, i) => (
            <div key={s.num} style={{
              padding: '1.75rem',
              background: 'var(--bg-surface)',
              borderRight: !isMobile && i < steps.length - 1 ? '0.5px solid var(--border)' : 'none',
              borderBottom: isMobile && i < steps.length - 1 ? '0.5px solid var(--border)' : 'none',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.75rem',
                fontWeight: 700, color: 'var(--accent)',
                marginBottom: '0.875rem', letterSpacing: '0.05em',
              }}>
                {s.num}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '1rem',
                fontWeight: 700, color: 'var(--text-primary)',
                marginBottom: '0.625rem', letterSpacing: '-0.2px',
              }}>
                {s.title}
              </div>
              <p style={{
                fontSize: '0.875rem', color: 'var(--text-secondary)',
                lineHeight: 1.75, margin: 0,
              }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Feature ───────────────────────────────────────────────────────────────────

function Feature({ labelText, labelColor, headline, para1, para2, screenshotSrc, screenshotAlt, reverse }) {
  const [ref, visible] = useReveal()
  const isMobile = useIsMobile()

  const copyOrder = isMobile ? 1 : (reverse ? 2 : 1)
  const screenshotOrder = isMobile ? 2 : (reverse ? 1 : 2)

  return (
    <section ref={ref} style={{
      padding: '3.5rem 1.25rem 4.5rem',
      borderTop: '0.5px solid var(--border)',
    }}>
      <div style={{
        maxWidth: '60rem', margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? '2rem' : '4rem',
        alignItems: 'center',
        ...reveal(visible),
      }}>
        <div style={{ order: copyOrder }}>
          <Label color={labelColor}>{labelText}</Label>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.375rem, 3vw, 1.75rem)',
            fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.22,
            color: 'var(--text-primary)', marginBottom: '1.25rem',
          }}>
            {headline}
          </h3>
          <p style={{
            fontSize: '0.9375rem', color: 'var(--text-secondary)',
            lineHeight: 1.8, marginBottom: '1rem',
          }}>
            {para1}
          </p>
          <p style={{
            fontSize: '0.9375rem', color: 'var(--text-secondary)',
            lineHeight: 1.8,
          }}>
            {para2}
          </p>
        </div>

        <div style={{ order: screenshotOrder }}>
          <Screenshot src={screenshotSrc} alt={screenshotAlt} aspect="4/3" />
        </div>
      </div>
    </section>
  )
}

// ── Built by Wrestlers ────────────────────────────────────────────────────────

function BuiltByWrestlers() {
  const [ref, visible] = useReveal()
  return (
    <section ref={ref} style={{
      background: 'var(--bg-surface)',
      borderTop: '0.5px solid var(--border)',
      borderBottom: '0.5px solid var(--border)',
      padding: '4rem 1.25rem',
    }}>
      <div style={{
        maxWidth: '40rem', margin: '0 auto',
        ...reveal(visible),
      }}>
        <Label>Why it exists</Label>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.625rem, 4vw, 2.25rem)',
          fontWeight: 700, letterSpacing: '-0.75px', lineHeight: 1.2,
          color: 'var(--text-primary)', marginBottom: '2rem',
        }}>
          Built by wrestlers.<br />
          Not software people who coach.
        </h2>

        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1.25rem' }}>
          Matboard was built by a 2× English Wrestling Champion who coached with the
          same tools everyone else uses — spreadsheets, notebooks, and memory.
          The sport deserves better than that.
        </p>

        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '2rem' }}>
          The curricula are built in by someone who's been on the mat —
          every position, every progression, every video. Not scraped together.
          Structured correctly, from the inside.
        </p>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
          fontSize: '0.8125rem', color: 'var(--text-secondary)',
          background: 'var(--bg-subtle)',
          border: '0.5px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1.125rem',
        }}>
          <span>🤼</span>
          Folkstyle L1–L3 · Olympic Styles L1 · Freestyle L2 · All built in.
        </div>
      </div>
    </section>
  )
}

// ── Roadmap ───────────────────────────────────────────────────────────────────

function Roadmap() {
  const [ref, visible] = useReveal()

  const sports = [
    { name: 'Wrestling', sub: 'Folkstyle + Freestyle', status: 'live' },
    { name: 'Wrestling', sub: 'Greco-Roman', status: 'next' },
    { name: 'BJJ', sub: 'Brazilian Jiu-Jitsu', status: 'soon' },
    { name: 'Judo', sub: 'Olympic + Kata', status: 'soon' },
  ]

  const meta = {
    live: { label: 'Live now', color: 'var(--success)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
    next: { label: 'Next up', color: 'var(--move-color)', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.15)' },
    soon: { label: 'Coming soon', color: 'var(--text-muted)', bg: 'transparent', border: 'var(--border)' },
  }

  return (
    <section ref={ref} style={{ padding: '4rem 1.25rem' }}>
      <div style={{
        maxWidth: '56rem', margin: '0 auto',
        ...reveal(visible),
      }}>
        <Label>What's next</Label>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.625rem, 4vw, 2.25rem)',
          fontWeight: 700, letterSpacing: '-0.75px', lineHeight: 1.2,
          color: 'var(--text-primary)', marginBottom: '0.875rem',
        }}>
          Wrestling first. The rest is coming.
        </h2>
        <p style={{
          fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.75,
          maxWidth: '34rem', marginBottom: '2.5rem',
        }}>
          Same app. Same architecture. One product for grappling sports —
          not a wrestling tool with a BJJ skin bolted on top.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))',
          gap: '0.75rem',
        }}>
          {sports.map((s, i) => {
            const m = meta[s.status]
            return (
              <div key={i} style={{
                background: 'var(--bg-surface)',
                border: `0.5px solid ${m.border}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                opacity: s.status === 'soon' ? 0.5 : 1,
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: m.color, background: m.bg,
                  borderRadius: '99px', padding: '0.25rem 0.625rem',
                  marginBottom: '1rem',
                }}>
                  {s.status === 'live' && (
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: 'var(--success)',
                      boxShadow: '0 0 5px rgba(34,197,94,0.6)',
                      flexShrink: 0,
                      animation: 'mbPulse 2s ease-in-out infinite',
                    }} />
                  )}
                  {m.label}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '0.9375rem',
                  fontWeight: 700, color: 'var(--text-primary)',
                  marginBottom: '0.25rem',
                }}>
                  {s.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {s.sub}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <style>{`@keyframes mbPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </section>
  )
}

// ── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCTA({ navigate }) {
  const [ref, visible] = useReveal()
  const isMobile = useIsMobile()

  return (
    <section ref={ref} style={{
      borderTop: '0.5px solid var(--border)',
      padding: isMobile ? '5rem 1.25rem' : '7rem 2rem',
      textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', bottom: '-80px', left: '50%',
        transform: 'translateX(-50%)',
        width: '600px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(220,38,38,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: '36rem', margin: '0 auto',
        position: 'relative',
        ...reveal(visible),
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.875rem, 5vw, 2.875rem)',
          fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1,
          color: 'var(--text-primary)', marginBottom: '1.25rem',
        }}>
          Know what each athlete needs.<br />At a glance.
        </h2>

        <p style={{
          fontSize: '1rem', color: 'var(--text-secondary)',
          lineHeight: 1.8, marginBottom: '2.5rem',
        }}>
          Set up your squad in one practice. Athletes rate themselves before
          you leave the room. You walk in tomorrow knowing exactly what to coach.
        </p>

        <PrimaryButton
          onClick={() => navigate('/login?tab=signup')}
          fullWidth={isMobile}
        >
          Set up your squad — free
        </PrimaryButton>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.125rem' }}>
          Free during early access · No credit card · 2 minutes to set up
        </p>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{
      borderTop: '0.5px solid var(--border)',
      padding: '1.5rem 1.25rem',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '0.75rem',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '1rem',
        fontWeight: 700, letterSpacing: '-0.3px',
        color: 'var(--text-primary)',
      }}>
        Mat<span style={{ color: 'var(--accent)' }}>board</span>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Wrestling · BJJ · Judo
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-body)',
    }}>
      <Nav navigate={navigate} />
      <Hero navigate={navigate} />
      <HeroScreenshot />
      <Problem />
      <HowItWorks />

      <Feature
        labelText="Technique Graph"
        labelColor="var(--move-color)"
        headline={<>See where the chain breaks,<br />not just where it starts.</>}
        para1="A shot means nothing if the finish isn't there. Without a map of the whole chain — neutral to takedown to pin — you can't see where your athletes are actually losing. You feel it when a match slips away. You can't point to it on Monday."
        para2="Matboard maps every position and technique as a connected graph. 20 positions. 124 techniques. Every edge between them, coloured by your squad's actual confidence. You see the full chain in one view — so you know whether the problem is the move, or everything that comes after it."
        screenshotSrc="/graph.png"
        screenshotAlt="Matboard technique graph — positions as nodes, moves as edges, confidence-coloured"
        reverse={false}
      />

      <Feature
        labelText="Squad Matrix"
        labelColor="var(--accent)"
        headline={<>Every athlete. Every technique.<br />One view.</>}
        para1="You know your top wrestlers. You know your newest kids. The ones you're not sure about — the middle of the roster, the ones who look fine in practice — those are the athletes who hurt you at a tournament. You don't know what you don't know about them."
        para2="The squad matrix puts every athlete on a row and every technique on a column. Each cell is colour-coded red to green. The whole squad, the whole curriculum, at a glance. Filter by position. Sort by squad average. See instantly who's been carrying a weakness you haven't had time to catch."
        screenshotSrc="/squad-matrix.png"
        screenshotAlt="Matboard squad matrix — athletes as rows, techniques as columns, coloured by confidence"
        reverse={true}
      />

      <Feature
        labelText="Squad Insights"
        labelColor="var(--success)"
        headline="The weakest link surfaces automatically."
        para1="The matrix shows you everything. Insights tell you what to look at first. The weakest technique across your whole squad. The most inconsistent move — where half your team is a 4 and the other half is a 1. The athletes falling behind across enough moves that you need to act."
        para2="None of this is generated advice. It's computed from your athletes' actual numbers. Matboard runs the averages, flags the variance, surfaces the names. You decide what to do with it — but you're deciding with real data, not instinct."
        screenshotSrc="/insights.png"
        screenshotAlt="Matboard squad insights — weakest technique, most inconsistent move, athletes at risk"
        reverse={false}
      />

      <BuiltByWrestlers />
      <Roadmap />
      <FinalCTA navigate={navigate} />
      <Footer />
    </div>
  )
}