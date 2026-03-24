import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { Link } from 'react-router-dom'

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, icon, value, loading }) {
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
        <span style={{ fontSize: 16, opacity: 0.6 }}>{icon}</span>
      </div>

      {loading ? (
        <div style={{
          width: 48,
          height: 28,
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-sm)',
        }} />
      ) : (
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          fontWeight: 700,
          color: 'var(--text-primary)',
        }}>
          {value}
        </div>
      )}
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
        transition: 'border-color var(--transition)',
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
      <div style={{
        fontSize: 12,
        color: 'var(--text-muted)',
        lineHeight: 1.5,
      }}>
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, profile } = useAuth()

  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Wrestler'

  const role = profile?.role ?? null
  const isCoach = role === 'coach' || role === 'admin'

  // ── Load stats ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile || !user) return

    async function loadStats() {
      setLoadingStats(true)

      try {
        if (isCoach) {
          const { data: membership } = await supabase
            .from('club_memberships')
            .select('club_id')
            .eq('user_id', user.id)
            .maybeSingle()

          if (!membership) {
            setStats(null)
            setLoadingStats(false)
            return
          }

          const clubId = membership.club_id

          const [{ count: athleteCount }, { count: curriculumCount }] =
            await Promise.all([
              supabase
                .from('club_memberships')
                .select('*', { count: 'exact', head: true })
                .eq('club_id', clubId)
                .eq('role', 'athlete'),

              supabase
                .from('curricula')
                .select('*', { count: 'exact', head: true })
                .eq('club_id', clubId),
            ])

          setStats({
            athleteCount: athleteCount || 0,
            curriculumCount: curriculumCount || 0,
          })

        } else if (role === 'athlete') {

          const { data: progress } = await supabase
            .from('user_move_progress')
            .select('confidence')
            .eq('user_id', user.id)

          const moveCount = progress?.length || 0

          const avgConfidence =
            moveCount > 0
              ? (
                  progress.reduce((sum, m) => sum + m.confidence, 0) / moveCount
                ).toFixed(1)
              : 0

          setStats({ moveCount, avgConfidence })
        }

      } catch (err) {
        console.error(err)
        setStats(null)
      }

      setLoadingStats(false)
    }

    loadStats()
  }, [profile, user, isCoach, role])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 32px' }}>

      {/* Header */}
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
            background: isCoach ? 'var(--accent-soft)' : 'var(--bg-subtle)',
            border: `0.5px solid ${isCoach ? 'var(--border-accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 600,
            color: isCoach ? 'var(--text-accent)' : 'var(--text-secondary)',
            letterSpacing: '0.06em',
            textTransform: 'capitalize',
          }}>
            {role}
          </div>
        )}
      </div>

      {/* ── Coach View ───────────────────────────────────────────── */}
      {isCoach && (
        <>
          <SectionLabel>Club overview</SectionLabel>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12,
            marginBottom: 32,
          }}>
            <StatCard
              label="Athletes"
              icon="🤼"
              value={stats?.athleteCount ?? 0}
              loading={loadingStats}
            />

            <StatCard
              label="Curricula"
              icon="📋"
              value={stats?.curriculumCount ?? 0}
              loading={loadingStats}
            />
          </div>

          <SectionLabel>Quick links</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <QuickLink to="/dashboard" label="Athletes" description="Track squad progress across moves" accent />
            <QuickLink to="/curricula" label="Curricula" description="Build and assign structured training" />
            <QuickLink to="/explore"   label="Technique Graph" description="Explore all positions and move chains" />
            <QuickLink to="/club"      label="Club Settings" description="Manage members and invite athletes" />
          </div>
        </>
      )}

      {/* ── Athlete View ─────────────────────────────────────────── */}
      {role === 'athlete' && (
        <>
          <SectionLabel>Your progress</SectionLabel>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12,
            marginBottom: 32,
          }}>
            <StatCard
              label="Moves rated"
              icon="✅"
              value={stats?.moveCount ?? 0}
              loading={loadingStats}
            />

            <StatCard
              label="Avg confidence"
              icon="📈"
              value={stats?.avgConfidence ?? 0}
              loading={loadingStats}
            />
          </div>

          <SectionLabel>Quick links</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <QuickLink to="/progress" label="My Progress" description="Rate your confidence across techniques" accent />
            <QuickLink to="/explore"  label="Technique Graph" description="Explore positions and move chains" />
            <QuickLink to="/club"     label="My Club" description="View your club and assigned curricula" />
          </div>
        </>
      )}
    </div>
  )
}