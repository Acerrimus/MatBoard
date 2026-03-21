import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

// ── Skeleton block ────────────────────────────────────────────────────────────
function Skeleton({ width = '100%', height = 16, radius = 'var(--radius-sm)' }) {
  return (
    <div style={{
      width,
      height,
      background: 'var(--bg-subtle)',
      borderRadius: radius,
      animation: 'pulse 1.4s ease infinite',
    }} />
  )
}

// ── Stat card — always skeleton on this page (no backend yet) ─────────────────
function StatCard({ label, icon }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}>
          {label}
        </span>
        <span style={{ fontSize: 16, opacity: 0.5 }}>{icon}</span>
      </div>
      <Skeleton width="48px" height={28} radius="var(--radius-sm)" />
    </div>
  )
}

// ── Quick link card ───────────────────────────────────────────────────────────
function QuickLink({ to, label, description, accent = false }) {
  return (
    <Link
      to={to}
      style={{
        display: 'block',
        background: accent ? 'var(--accent-soft)' : 'var(--bg-surface)',
        border: `0.5px solid ${accent ? 'var(--border-accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        textDecoration: 'none',
        transition: 'border-color var(--transition), background var(--transition)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accent ? 'var(--accent)' : 'var(--border-strong)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = accent ? 'var(--border-accent)' : 'var(--border)'
      }}
    >
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 14,
        fontWeight: 600,
        color: accent ? 'var(--text-accent)' : 'var(--text-primary)',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {description}
      </div>
    </Link>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

// ── Activity row skeleton ─────────────────────────────────────────────────────
function ActivityRowSkeleton() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 0',
      borderBottom: '0.5px solid var(--border)',
    }}>
      <Skeleton width={32} height={32} radius="50%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton width="55%" height={12} />
        <Skeleton width="35%" height={10} />
      </div>
      <Skeleton width={48} height={10} />
    </div>
  )
}

// ── Coach view ────────────────────────────────────────────────────────────────
function CoachHome({ profile }) {
  return (
    <>
      {/* Stats row */}
      <SectionLabel>Club overview</SectionLabel>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12,
        marginBottom: 32,
      }}>
        <StatCard label="Athletes"   icon="🤼" />
        <StatCard label="Curricula"  icon="📋" />
        <StatCard label="Moves mapped" icon="🗺️" />
      </div>

      {/* Recent activity */}
      <SectionLabel>Recent athlete activity</SectionLabel>
      <div style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '4px 20px 4px',
        marginBottom: 32,
      }}>
        <ActivityRowSkeleton />
        <ActivityRowSkeleton />
        <ActivityRowSkeleton />
        <div style={{ padding: '12px 0 8px' }}>
          <Skeleton width="160px" height={10} />
        </div>
      </div>

      {/* Quick links */}
      <SectionLabel>Quick links</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <QuickLink to="/graph"     label="Technique Graph"  description="Explore all positions and move chains" accent />
        <QuickLink to="/club"      label="My Club"          description="Manage your club settings and members" />
        <QuickLink to="/athletes"  label="Athletes"         description="Track squad progress across moves" />
        <QuickLink to="/curricula" label="Curricula"        description="Build and assign training plans" />
      </div>
    </>
  )
}

// ── Athlete view ──────────────────────────────────────────────────────────────
function AthleteHome({ profile }) {
  return (
    <>
      {/* Stats row */}
      <SectionLabel>Your progress</SectionLabel>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12,
        marginBottom: 32,
      }}>
        <StatCard label="Moves rated"     icon="✅" />
        <StatCard label="Avg confidence"  icon="📈" />
        <StatCard label="Drill sessions"  icon="🔁" />
      </div>

      {/* Recent drills */}
      <SectionLabel>Recent drill sessions</SectionLabel>
      <div style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '4px 20px 4px',
        marginBottom: 32,
      }}>
        <ActivityRowSkeleton />
        <ActivityRowSkeleton />
        <div style={{ padding: '12px 0 8px' }}>
          <Skeleton width="140px" height={10} />
        </div>
      </div>

      {/* Quick links */}
      <SectionLabel>Quick links</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <QuickLink to="/graph"    label="Technique Graph" description="Explore positions and move chains" accent />
        <QuickLink to="/progress" label="My Progress"     description="Rate your confidence on each move" />
      </div>
    </>
  )
}

// ── No profile fallback ───────────────────────────────────────────────────────
function NoProfileHome() {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '28px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, marginBottom: 12 }}>🤼</div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 8,
      }}>
        Profile not set up yet
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
        Your profile hasn't been created. Head to the graph to start exploring, and check back once your profile is ready.
      </div>
      <Link
        to="/graph"
        style={{
          display: 'inline-block',
          padding: '9px 20px',
          background: 'var(--accent)',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          textDecoration: 'none',
        }}
      >
        Explore the graph
      </Link>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, profile } = useAuth()

  const displayName = profile?.display_name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'Wrestler'

  const role = profile?.role ?? null  // 'athlete' | 'coach' | 'admin' | null

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 32px' }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 4,
        }}>
          Dashboard
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '-0.5px',
          color: 'var(--text-primary)',
          marginBottom: 6,
        }}>
          Welcome back, {displayName}
        </h1>
        {role && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: role === 'coach' ? 'var(--accent-soft)' : 'var(--bg-subtle)',
            border: `0.5px solid ${role === 'coach' ? 'var(--border-accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 600,
            color: role === 'coach' ? 'var(--text-accent)' : 'var(--text-secondary)',
            letterSpacing: '0.06em',
            textTransform: 'capitalize',
          }}>
            {role}
          </div>
        )}
      </div>

      {/* Role-aware content */}
      {!profile && <NoProfileHome />}
      {profile?.role === 'coach' && <CoachHome profile={profile} />}
      {profile?.role === 'admin'  && <CoachHome profile={profile} />}
      {profile?.role === 'athlete' && <AthleteHome profile={profile} />}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}