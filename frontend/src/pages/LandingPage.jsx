import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Scroll reveal ────────────────────────────────────────────────────────────
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

const revealStyle = (visible, delay = 0) => ({
  opacity: visible ? 1 : 0,
  transform: visible ? 'translateY(0)' : 'translateY(22px)',
  transition: `opacity 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
})

// ─── SVG Placeholders ─────────────────────────────────────────────────────────
function DashboardSVG() {
  const athletes = ['A.Chen', 'D.Morris', 'J.Okafor', 'T.Singh', 'R.Cole', 'M.Park', 'L.Evans', 'B.Tran']
  const moves = ['Double', 'Single', 'Ankle P.', 'High C.', 'Stand-up', 'Switch', 'Granby', 'Tilt']
  const conf = [
    [5,4,5,3,4,5,4,3],
    [2,2,3,1,4,3,2,2],
    [4,5,4,4,3,4,5,4],
    [1,2,1,2,3,2,1,1],
    [3,4,3,4,5,3,4,3],
    [4,3,5,3,4,4,3,5],
    [2,1,2,3,2,1,2,1],
    [5,4,4,5,5,5,4,4],
  ]
  const c = (v) => v >= 5 ? '#22c55e' : v === 4 ? '#86efac' : v === 3 ? '#eab308' : v === 2 ? '#f97316' : '#ef4444'

  return (
    <svg viewBox="0 0 560 320" style={{ width: '100%', height: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
      {/* Stat pills */}
      {[
        { x: 10, label: 'Athletes', val: '8' },
        { x: 100, label: 'Avg Conf.', val: '2.9' },
        { x: 190, label: 'At Risk', val: '3' },
        { x: 280, label: 'Comp Ready', val: '2' },
      ].map(s => (
        <g key={s.x}>
          <rect x={s.x} y={8} width={82} height={38} rx="6" fill="var(--bg-subtle)" stroke="var(--border-strong)" strokeWidth="0.8" />
          <text x={s.x + 9} y={22} fill="var(--text-muted)" fontSize="7" fontFamily="Space Grotesk, sans-serif">{s.label}</text>
          <text x={s.x + 9} y={38} fill="var(--text-primary)" fontSize="14" fontWeight="700" fontFamily="Space Grotesk, sans-serif">{s.val}</text>
        </g>
      ))}
      {/* Attention cards */}
      {[
        { x: 370, color: '#ef4444', title: 'Weakest Link', val: 'Ankle Pick', sub: 'Avg 1.4 / 5' },
        { x: 465, color: '#eab308', title: 'Inconsistent', val: 'Tilt', sub: 'σ 1.8' },
      ].map(s => (
        <g key={s.x}>
          <rect x={s.x} y={8} width={86} height={38} rx="6" fill="var(--bg-surface)" stroke={s.color} strokeWidth="0.8" strokeOpacity="0.4" />
          <text x={s.x + 8} y={20} fill={s.color} fontSize="6" fontFamily="Space Grotesk, sans-serif" fontWeight="600" opacity="0.85">{s.title.toUpperCase()}</text>
          <text x={s.x + 8} y={32} fill="var(--text-primary)" fontSize="10" fontWeight="700" fontFamily="Space Grotesk, sans-serif">{s.val}</text>
          <text x={s.x + 8} y={42} fill="var(--text-muted)" fontSize="6.5" fontFamily="Space Grotesk, sans-serif">{s.sub}</text>
        </g>
      ))}
      {/* Column headers */}
      {moves.map((m, i) => (
        <text key={m} x={116 + i * 54} y={72} fill="var(--text-muted)" fontSize="6.5"
          fontFamily="Space Grotesk, sans-serif" transform={`rotate(-35, ${116 + i * 54}, 72)`}>{m}</text>
      ))}
      {/* Matrix */}
      {athletes.map((a, ai) => (
        <g key={a}>
          <text x={4} y={93 + ai * 24} fill="var(--text-secondary)" fontSize="7.5"
            fontFamily="Instrument Sans, sans-serif" dominantBaseline="middle">{a}</text>
          {conf[ai].map((v, mi) => (
            <g key={mi}>
              <rect x={90 + mi * 54} y={82 + ai * 24} width={48} height={19} rx="4"
                fill={c(v)} fillOpacity="0.15" stroke={c(v)} strokeOpacity="0.3" strokeWidth="0.7" />
              <text x={114 + mi * 54} y={92 + ai * 24} fill={c(v)} fontSize="8.5" fontWeight="700"
                fontFamily="Space Grotesk, sans-serif" textAnchor="middle" dominantBaseline="middle">{v}</text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  )
}

function GraphSVG() {
  const nodes = [
    { id: 'N',  label: 'Neutral',    x: 280, y: 48,  conf: 3 },
    { id: 'TD', label: 'Takedown',   x: 140, y: 140, conf: 2 },
    { id: 'SL', label: 'Single Leg', x: 400, y: 130, conf: 4 },
    { id: 'RP', label: 'Ref Pos.',   x: 100, y: 240, conf: 1 },
    { id: 'TT', label: 'Tilt',       x: 280, y: 240, conf: 2 },
    { id: 'PN', label: 'Pin',        x: 200, y: 330, conf: 3 },
  ]
  const edges = [['N','TD'],['N','SL'],['TD','RP'],['TD','TT'],['SL','TT'],['RP','PN'],['TT','PN']]
  const c = (v) => v >= 4 ? '#22c55e' : v === 3 ? '#eab308' : v === 2 ? '#f97316' : '#ef4444'
  const nm = Object.fromEntries(nodes.map(n => [n.id, n]))

  return (
    <svg viewBox="0 0 520 380" style={{ width: '100%', height: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3z" fill="var(--border-strong)" />
        </marker>
      </defs>
      {edges.map(([a, b]) => {
        const na = nm[a], nb = nm[b]
        return <line key={`${a}-${b}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
          stroke="var(--border-strong)" strokeWidth="1.5" markerEnd="url(#arr)" />
      })}
      {nodes.map(n => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={30} fill="var(--bg-surface)"
            stroke={c(n.conf)} strokeWidth="1.8" strokeOpacity="0.75" />
          <circle cx={n.x} cy={n.y} r={30} fill={c(n.conf)} fillOpacity="0.07" />
          <text x={n.x} y={n.y - 5} fill={c(n.conf)} fontSize="7" fontWeight="700"
            fontFamily="Space Grotesk, sans-serif" textAnchor="middle">{n.label}</text>
          <text x={n.x} y={n.y + 10} fill={c(n.conf)} fontSize="13" fontWeight="700"
            fontFamily="Space Grotesk, sans-serif" textAnchor="middle">{n.conf}</text>
        </g>
      ))}
      <text x={260} y={370} fill="var(--text-muted)" fontSize="8"
        fontFamily="Instrument Sans, sans-serif" textAnchor="middle">
        20 positions · 124 techniques · every connection mapped
      </text>
    </svg>
  )
}

function MatrixSVG() {
  const athletes = ['A.Chen', 'D.Morris', 'J.Okafor', 'T.Singh', 'R.Cole', 'M.Park']
  const moves = ['Double Leg', 'Single Leg', 'High C.', 'Ankle Pick', 'Stand-up', 'Switch', 'Granby', 'Tilt', 'Half Nel.', 'Cradle']
  const conf = [
    [5,4,5,3,4,5,4,3,5,4],
    [2,2,3,1,4,3,2,2,1,2],
    [4,5,4,4,3,4,5,4,4,3],
    [1,2,1,2,3,2,1,1,2,1],
    [3,4,3,4,5,3,4,3,4,5],
    [4,3,5,3,4,4,3,5,3,4],
  ]
  const c = (v) => v >= 5 ? '#22c55e' : v === 4 ? '#86efac' : v === 3 ? '#eab308' : v === 2 ? '#f97316' : '#ef4444'

  return (
    <svg viewBox="0 0 520 220" style={{ width: '100%', height: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
      {moves.map((m, i) => (
        <text key={m} x={80 + i * 44} y={22} fill="var(--text-muted)" fontSize="6"
          fontFamily="Space Grotesk, sans-serif" transform={`rotate(-40, ${80 + i * 44}, 22)`}>{m}</text>
      ))}
      {athletes.map((a, ai) => (
        <g key={a}>
          <text x={4} y={57 + ai * 28} fill="var(--text-secondary)" fontSize="8"
            fontFamily="Instrument Sans, sans-serif" dominantBaseline="middle">{a}</text>
          {conf[ai].map((v, mi) => (
            <g key={mi}>
              <rect x={60 + mi * 44} y={45 + ai * 28} width={40} height={22} rx="5"
                fill={c(v)} fillOpacity="0.15" stroke={c(v)} strokeOpacity="0.35" strokeWidth="0.7" />
              <text x={80 + mi * 44} y={57 + ai * 28} fill={c(v)} fontSize="9" fontWeight="700"
                fontFamily="Space Grotesk, sans-serif" textAnchor="middle" dominantBaseline="middle">{v}</text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  )
}

function InsightsSVG() {
  const rows = [
    { label: 'Weakest Technique', value: 'Ankle Pick', sub: 'Squad avg 1.4 / 5', color: '#ef4444' },
    { label: 'Most Inconsistent', value: 'Tilt', sub: 'σ 1.8 — high variance', color: '#eab308' },
    { label: 'Athletes at Risk', value: 'D.Morris · T.Singh · L.Evans', sub: '6+ moves below threshold', color: '#f97316' },
    { label: 'Competition Ready', value: 'A.Chen · M.Park', sub: 'Strong across key chains', color: '#22c55e' },
  ]
  return (
    <svg viewBox="0 0 520 256" style={{ width: '100%', height: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
      {rows.map((r, i) => (
        <g key={r.label}>
          <rect x={10} y={10 + i * 58} width={500} height={48} rx="7"
            fill="var(--bg-surface)" stroke={r.color} strokeOpacity="0.22" strokeWidth="1" />
          <rect x={10} y={10 + i * 58} width={4} height={48} rx="2" fill={r.color} fillOpacity="0.85" />
          <text x={24} y={30 + i * 58} fill="var(--text-muted)" fontSize="7" fontWeight="600"
            fontFamily="Space Grotesk, sans-serif" letterSpacing="0.9">{r.label.toUpperCase()}</text>
          <text x={24} y={47 + i * 58} fill={r.color} fontSize="13" fontWeight="700"
            fontFamily="Space Grotesk, sans-serif">{r.value}</text>
          <text x={500} y={47 + i * 58} fill="var(--text-muted)" fontSize="7.5"
            fontFamily="Instrument Sans, sans-serif" textAnchor="end">{r.sub}</text>
        </g>
      ))}
    </svg>
  )
}

// ─── Shared primitives ────────────────────────────────────────────────────────
const sectionLabel = (text, color = 'var(--text-muted)') => (
  <div style={{
    fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.14em',
    textTransform: 'uppercase', color, marginBottom: '1rem',
  }}>{text}</div>
)

const ScreenshotFrame = ({ children, aspect = '4/3', style = {} }) => (
  <div style={{
    aspectRatio: aspect,
    background: 'var(--bg-surface)',
    border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-md)',
    ...style,
  }}>
    {children}
  </div>
)

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ navigate }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 2rem',
      height: '60px',
      background: scrolled ? 'rgba(15,17,23,0.88)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '0.5px solid var(--border)' : '0.5px solid transparent',
      position: 'sticky', top: 0, zIndex: 100,
      transition: 'background 0.2s ease, border-color 0.2s ease',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700,
        letterSpacing: '-0.3px', cursor: 'pointer',
      }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        Mat<span style={{ color: 'var(--accent)' }}>board</span>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button onClick={() => navigate('/login')} style={{
          padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500,
          background: 'transparent', color: 'var(--text-secondary)',
          border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
          transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >Sign in</button>

        <button onClick={() => navigate('/login?tab=signup')} style={{
          padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: 600,
          background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 'var(--radius-md)',
          cursor: 'pointer', fontFamily: 'var(--font-display)',
          boxShadow: '0 2px 12px rgba(220,38,38,0.2)',
          transition: 'transform 0.1s ease, box-shadow 0.1s ease',
        }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(220,38,38,0.35)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 12px rgba(220,38,38,0.2)'
          }}
        >Get started free</button>
      </div>
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ navigate }) {
  return (
    <div style={{
      maxWidth: '52rem', margin: '0 auto',
      padding: '6rem 2rem 4rem',
      textAlign: 'center',
      position: 'relative',
    }}>
      {/* Radial glow behind hero */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: '600px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(220,38,38,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em',
        color: 'var(--text-secondary)',
        background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
        borderRadius: '99px', padding: '0.375rem 1rem',
        marginBottom: '2rem', position: 'relative',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--success)',
          boxShadow: '0 0 6px rgba(34,197,94,0.5)',
          display: 'inline-block', flexShrink: 0,
        }} />
        Built by wrestlers, for wrestlers
      </div>

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(2.25rem, 5.5vw, 3.5rem)',
        fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.08,
        color: 'var(--text-primary)', marginBottom: '1.5rem',
        position: 'relative',
      }}>
        Know your squad's weak spots<br />
        <span style={{ color: 'var(--accent)' }}>before they step on the mat.</span>
      </h1>

      <p style={{
        fontSize: '1.125rem', color: 'var(--text-secondary)', lineHeight: 1.75,
        maxWidth: '36rem', margin: '0 auto 2.5rem',
      }}>
        Athletes rate their confidence on every technique — takes 30 seconds.
        You get a live dashboard showing exactly where your squad breaks down,
        position by position, chain by chain.
      </p>

      <div style={{
        display: 'flex', gap: '0.75rem', justifyContent: 'center',
        flexWrap: 'wrap', marginBottom: '1.25rem',
      }}>
        <button onClick={() => navigate('/login?tab=signup')} style={{
          padding: '0.9375rem 2.25rem', fontSize: '1rem', fontWeight: 700,
          background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 'var(--radius-md)',
          cursor: 'pointer', fontFamily: 'var(--font-display)',
          boxShadow: '0 4px 20px rgba(220,38,38,0.28)',
          transition: 'transform 0.12s ease, box-shadow 0.12s ease',
        }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(220,38,38,0.38)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(220,38,38,0.28)'
          }}
        >Set up your squad — free</button>

        <button onClick={() => navigate('/explore')} style={{
          padding: '0.9375rem 2.25rem', fontSize: '1rem', fontWeight: 600,
          background: 'var(--bg-surface)', color: 'var(--text-secondary)',
          border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)',
          cursor: 'pointer', fontFamily: 'var(--font-display)',
          transition: 'color 0.15s, border-color 0.15s, transform 0.12s',
        }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--text-primary)'
            e.currentTarget.style.borderColor = 'var(--text-muted)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.borderColor = 'var(--border-strong)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >Explore the graph →</button>
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Free during early access · No credit card · Full curriculum built in
      </div>
    </div>
  )
}

// ─── Hero Screenshot ──────────────────────────────────────────────────────────
function HeroScreenshot() {
  const [ref, visible] = useReveal()
  return (
    <div ref={ref} style={{
      maxWidth: '62rem', margin: '0 auto',
      padding: '0 2rem 6rem',
      ...revealStyle(visible),
    }}>
      <ScreenshotFrame aspect="16/9" style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md), 0 0 80px rgba(0,0,0,0.5)' }}>
        <DashboardSVG />
      </ScreenshotFrame>
    </div>
  )
}

// ─── Problem ──────────────────────────────────────────────────────────────────
function Problem() {
  const [ref, visible] = useReveal()
  return (
    <div ref={ref} style={{
      background: 'var(--bg-surface)',
      borderTop: '0.5px solid var(--border)',
      borderBottom: '0.5px solid var(--border)',
      padding: '5rem 2rem',
    }}>
      <div style={{
        maxWidth: '42rem', margin: '0 auto',
        ...revealStyle(visible),
      }}>
        {sectionLabel('The problem')}
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.625rem, 3.5vw, 2.125rem)',
          fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.25,
          color: 'var(--text-primary)', marginBottom: '1.75rem',
        }}>
          You watch practice every day.<br />
          You still don't know who's ready.
        </h2>

        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1.125rem' }}>
          You can see the room. You know your athletes. But when you try to pin down exactly who's weak
          on the double-leg finish, which kids fall apart from referee's position, who's never going to
          hold a tilt — it gets fuzzy. There are too many athletes, too many moves, and one of you on
          that mat.
        </p>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1.125rem' }}>
          So you coach what feels right. What you noticed yesterday. What went wrong last weekend.
          You work off instinct because there's nothing else to work off.
        </p>
        <p style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.8, fontWeight: 500 }}>
          The real gaps don't show up in practice. They show up at a tournament, in a match that matters,
          when the chain breaks at exactly the point you never got to.
        </p>
      </div>
    </div>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const [ref, visible] = useReveal()
  const steps = [
    {
      num: '01',
      title: 'Athletes rate themselves.',
      desc: 'Each athlete taps through their confidence on every technique — 1 to 5. 30 seconds. No coach time, no data entry, no setup.',
    },
    {
      num: '02',
      title: 'You see everything.',
      desc: 'A live dashboard maps your squad across every position, technique, and chain. Green means confident. Red means not. Gaps are obvious.',
    },
    {
      num: '03',
      title: 'You walk in knowing what to coach.',
      desc: "No more guessing. You have the squad's actual numbers. Plan practice around what they need, not what you felt last session.",
    },
  ]

  return (
    <div ref={ref} style={{ padding: '5rem 2rem' }}>
      <div style={{
        maxWidth: '56rem', margin: '0 auto',
        ...revealStyle(visible),
      }}>
        {sectionLabel('How it works')}
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.625rem, 3.5vw, 2.125rem)',
          fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.25,
          color: 'var(--text-primary)', marginBottom: '2.5rem',
        }}>
          One session. Real data. Your whole squad.
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
          gap: '1px',
          background: 'var(--border)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          {steps.map((s) => (
            <div key={s.num} style={{
              padding: '2rem',
              background: 'var(--bg-surface)',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.75rem',
                fontWeight: 700, color: 'var(--accent)',
                marginBottom: '0.875rem', letterSpacing: '0.05em',
              }}>{s.num}</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '1rem',
                fontWeight: 700, color: 'var(--text-primary)',
                marginBottom: '0.625rem', letterSpacing: '-0.2px',
              }}>{s.title}</div>
              <p style={{
                fontSize: '0.875rem', color: 'var(--text-secondary)',
                lineHeight: 1.7, margin: 0,
              }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Feature Block ────────────────────────────────────────────────────────────
function FeatureBlock({ labelText, labelColor, headline, para1, para2, graphic, reverse }) {
  const [ref, visible] = useReveal()
  return (
    <div ref={ref} style={{
      maxWidth: '60rem', margin: '0 auto',
      padding: '2rem 2rem 5rem',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
        gap: '4rem',
        alignItems: 'center',
        ...revealStyle(visible),
      }}>
        <div style={{ order: reverse ? 1 : 0 }}>
          <div style={{
            fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: labelColor,
            marginBottom: '0.875rem',
          }}>{labelText}</div>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.375rem, 2.5vw, 1.625rem)',
            fontWeight: 700, letterSpacing: '-0.4px', lineHeight: 1.25,
            color: 'var(--text-primary)', marginBottom: '1.25rem',
          }}>{headline}</h3>
          <p style={{
            fontSize: '0.9375rem', color: 'var(--text-secondary)',
            lineHeight: 1.8, marginBottom: '1rem',
          }}>{para1}</p>
          <p style={{
            fontSize: '0.9375rem', color: 'var(--text-secondary)',
            lineHeight: 1.8, margin: 0,
          }}>{para2}</p>
        </div>

        <div style={{ order: reverse ? 0 : 1 }}>
          <ScreenshotFrame>
            {graphic}
          </ScreenshotFrame>
        </div>
      </div>
    </div>
  )
}

// ─── Built by Wrestlers ───────────────────────────────────────────────────────
function BuiltByWrestlers() {
  const [ref, visible] = useReveal()
  return (
    <div ref={ref} style={{
      background: 'var(--bg-surface)',
      borderTop: '0.5px solid var(--border)',
      borderBottom: '0.5px solid var(--border)',
      padding: '5rem 2rem',
    }}>
      <div style={{
        maxWidth: '42rem', margin: '0 auto',
        ...revealStyle(visible),
      }}>
        {sectionLabel('Why it exists')}
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.625rem, 3.5vw, 2.125rem)',
          fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.25,
          color: 'var(--text-primary)', marginBottom: '1.75rem',
        }}>
          Built by wrestlers.<br />Not software people who coach.
        </h2>

        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1.125rem' }}>
          Matboard was built by wrestlers who have stood on that mat, watched matches slip away,
          and tried to piece it back together at the next practice with nothing but memory and instinct.
        </p>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1.125rem' }}>
          The sport knowledge is real. The folkstyle and freestyle curricula are built in —
          every level, every progression, every video. That part took months. It's not scraped
          together. It's the sport, structured correctly.
        </p>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '2rem' }}>
          Every feature exists because a real coaching problem needed a real answer.
        </p>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
          fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)',
          background: 'var(--bg-subtle)', border: '0.5px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)', padding: '0.75rem 1.125rem',
        }}>
          <span style={{ fontSize: '1.125rem' }}>🤼</span>
          Folkstyle L1–L3 · Olympic Styles L1 · Freestyle L2 · All built in.
        </div>
      </div>
    </div>
  )
}

// ─── Roadmap ──────────────────────────────────────────────────────────────────
function Roadmap() {
  const [ref, visible] = useReveal()
  const sports = [
    { name: 'Wrestling', sub: 'Folkstyle + Freestyle', status: 'live' },
    { name: 'Wrestling', sub: 'Greco-Roman', status: 'next' },
    { name: 'BJJ', sub: 'Brazilian Jiu-Jitsu', status: 'soon' },
    { name: 'Judo', sub: 'Olympic + Kata', status: 'soon' },
  ]

  const statusMeta = {
    live: { label: 'Live now', color: 'var(--success)', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
    next: { label: 'Next up', color: 'var(--move-color)', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)' },
    soon: { label: 'Coming soon', color: 'var(--text-muted)', bg: 'var(--bg-subtle)', border: 'var(--border)' },
  }

  return (
    <div ref={ref} style={{ padding: '5rem 2rem' }}>
      <div style={{
        maxWidth: '56rem', margin: '0 auto', textAlign: 'center',
        ...revealStyle(visible),
      }}>
        {sectionLabel('What\'s next')}
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.625rem, 3.5vw, 2.125rem)',
          fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.25,
          color: 'var(--text-primary)', marginBottom: '0.875rem',
        }}>
          Wrestling first. The rest is coming.
        </h2>
        <p style={{
          fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.75,
          maxWidth: '36rem', margin: '0 auto 3rem',
        }}>
          Same app. Same architecture. One product built for grappling sports — not
          a wrestling tool with a BJJ skin bolted on.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))',
          gap: '0.75rem',
        }}>
          {sports.map((s, i) => {
            const meta = statusMeta[s.status]
            return (
              <div key={i} style={{
                background: 'var(--bg-surface)',
                border: `0.5px solid ${meta.border}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                opacity: s.status === 'soon' ? 0.55 : 1,
                textAlign: 'left',
                transition: 'opacity 0.15s',
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em',
                  color: meta.color, background: meta.bg,
                  borderRadius: '99px', padding: '0.25rem 0.625rem',
                  marginBottom: '0.875rem',
                }}>
                  {s.status === 'live' && (
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: 'var(--success)',
                      boxShadow: '0 0 5px rgba(34,197,94,0.6)',
                      display: 'inline-block',
                      animation: 'mbPulse 2s ease-in-out infinite',
                    }} />
                  )}
                  {meta.label}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '0.9375rem',
                  fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem',
                }}>{s.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.sub}</div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`@keyframes mbPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </div>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA({ navigate }) {
  const [ref, visible] = useReveal()
  return (
    <div ref={ref} style={{
      borderTop: '0.5px solid var(--border)',
      padding: '7rem 2rem',
      textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', bottom: '-100px', left: '50%',
        transform: 'translateX(-50%)',
        width: '500px', height: '500px',
        background: 'radial-gradient(ellipse, rgba(220,38,38,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        maxWidth: '36rem', margin: '0 auto',
        position: 'relative',
        ...revealStyle(visible),
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 4.5vw, 2.75rem)',
          fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1,
          color: 'var(--text-primary)', marginBottom: '1.25rem',
        }}>
          Know what each athlete needs.<br />At a glance.
        </h2>
        <p style={{
          fontSize: '1rem', color: 'var(--text-secondary)',
          lineHeight: 1.8, marginBottom: '2.5rem',
        }}>
          Set up your squad in one practice. Athletes rate themselves before you leave the room.
          You walk in tomorrow knowing exactly what to coach.
        </p>

        <button onClick={() => navigate('/login?tab=signup')} style={{
          padding: '1.0625rem 2.75rem', fontSize: '1.0625rem', fontWeight: 700,
          background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 'var(--radius-md)',
          cursor: 'pointer', fontFamily: 'var(--font-display)',
          boxShadow: '0 4px 20px rgba(220,38,38,0.28)',
          display: 'block', margin: '0 auto 1.125rem',
          transition: 'transform 0.12s ease, box-shadow 0.12s ease',
        }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(220,38,38,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(220,38,38,0.28)'
          }}
        >Set up your squad — free</button>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Free during early access · No credit card · 2 minutes to set up
        </div>
      </div>
    </div>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <div style={{
      borderTop: '0.5px solid var(--border)',
      padding: '1.5rem 2rem',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '0.75rem',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '1rem',
        fontWeight: 700, letterSpacing: '-0.3px',
      }}>
        Mat<span style={{ color: 'var(--accent)' }}>board</span>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Wrestling · BJJ · Judo
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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

      {/* Feature 1 — Technique Graph */}
      <FeatureBlock
        labelText="Technique Graph"
        labelColor="var(--move-color)"
        headline={<>See where the chain breaks,<br />not just where it starts.</>}
        para1="A shot means nothing if the finish isn't there. Without a map of the whole chain — from the neutral position through the takedown to the pin — you can't see where your athletes are actually losing. You feel it when a match slips away. But you can't point to it on Monday."
        para2="Matboard maps every position and technique as a connected graph. 20 positions. 124 techniques. Every edge between them. Coloured by your squad's confidence. See the full chain in one view — so you know whether the problem is the move or everything that follows it."
        graphic={<GraphSVG />}
        reverse={false}
      />

      {/* Feature 2 — Squad Matrix */}
      <FeatureBlock
        labelText="Squad Matrix"
        labelColor="var(--accent)"
        headline={<>Every athlete. Every technique.<br />One view.</>}
        para1="You know your top wrestlers. You know your newest kids. The ones you're not sure about — the middle of the roster, the ones who look fine in practice — those are the athletes who hurt you. You don't know what you don't know about them."
        para2="The squad matrix puts every athlete on a row and every technique on a column. Each cell is colour-coded — red to green, 1 to 5. The whole squad, the whole curriculum, at a glance. Filter by position, sort by squad average, and see instantly who's been carrying a weakness you haven't had time to catch."
        graphic={<MatrixSVG />}
        reverse={true}
      />

      {/* Feature 3 — Squad Insights */}
      <FeatureBlock
        labelText="Squad Insights"
        labelColor="var(--success)"
        headline="The weakest link surfaces automatically."
        para1="The matrix shows you everything. Insights tell you what to look at first. The weakest technique across the whole squad. The most inconsistent move — the one where half your team is a 4 and the other half is a 1. The athletes who are falling behind across enough moves that you need to act now."
        para2="None of this is generated advice. It's computed directly from your athletes' numbers. Matboard runs the averages, flags the variance, surfaces the names. You decide what to do. But you're deciding with real data — not instinct."
        graphic={<InsightsSVG />}
        reverse={false}
      />

      <BuiltByWrestlers />

      <Roadmap />

      <FinalCTA navigate={navigate} />

      <Footer />
    </div>
  )
}