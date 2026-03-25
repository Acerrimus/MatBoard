import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { Link, useNavigate } from 'react-router-dom'
import { getClubDashboard, getAthleteInsights } from '../api'
import { confidenceColor, confidenceBg } from '../components/MoveCard'

// ── Confidence bar ─────────────────────────────────────────────────────────────
// A simple horizontal bar that fills proportionally to a 1-5 confidence value.
function ConfidenceBar({ value, max = 5, color }) {
  const pct = value ? Math.round((value / max) * 100) : 0
  return (
    <div style={{
      height: 5,
      borderRadius: 99,
      background: 'var(--bg-subtle)',
      overflow: 'hidden',
      flex: 1,
    }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        borderRadius: 99,
        background: color || 'var(--accent)',
        transition: 'width 0.6s ease',
      }} />
    </div>
  )
}

// ── Section label ──────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: '0.625rem',
      fontWeight: 600,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginBottom: '0.75rem',
    }}>
      {children}
    </div>
  )
}

// ── Stat pill ──────────────────────────────────────────────────────────────────
function StatPill({ label, value, accent, gold, loading }) {
  const borderColor = gold
    ? '#F59E0B'
    : accent
    ? 'var(--border-accent)'
    : 'var(--border)'
  const bg = gold
    ? '#F59E0B0E'
    : accent
    ? 'var(--accent-soft)'
    : 'var(--bg-surface)'
  const textColor = gold
    ? '#F59E0B'
    : accent
    ? 'var(--text-accent)'
    : 'var(--text-primary)'

  return (
    <div style={{
      background: bg,
      border: `0.5px solid ${borderColor}`,
      borderRadius: 'var(--radius-lg)',
      padding: '0.875rem 1.125rem',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      flex: 1,
      minWidth: '5.5rem',
    }}>
      {loading ? (
        <div style={{
          width: 40, height: 26,
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-sm)',
        }} />
      ) : (
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.625rem',
          fontWeight: 700,
          color: textColor,
          lineHeight: 1,
        }}>
          {value ?? '—'}
        </div>
      )}
      <div style={{
        fontSize: '0.625rem',
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
      }}>
        {label}
      </div>
    </div>
  )
}

// ── Insight card ───────────────────────────────────────────────────────────────
function InsightCard({ icon, label, moveName, confidence, squadAvg, fromPosition, variant }) {
  const colors = {
    danger:  { border: '#EF4444', bg: '#EF444408', badge: '#EF4444', badgeBg: '#EF444415' },
    success: { border: '#22C55E', bg: '#22C55E08', badge: '#22C55E', badgeBg: '#22C55E15' },
    focus:   { border: '#7C3AED', bg: '#7C3AED08', badge: '#7C3AED', badgeBg: '#7C3AED15' },
  }
  const c = colors[variant] || colors.focus

  return (
    <div style={{
      background: c.bg,
      border: `0.5px solid ${c.border}`,
      borderRadius: 'var(--radius-md)',
      padding: '0.875rem 1rem',
      flex: 1,
      minWidth: '9rem',
    }}>
      <div style={{
        fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
        marginBottom: '0.375rem',
        display: 'flex', alignItems: 'center', gap: '0.3rem',
      }}>
        <span>{icon}</span> {label}
      </div>

      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
        color: 'var(--text-primary)', marginBottom: '0.25rem', lineHeight: 1.3,
      }}>
        {moveName}
      </div>

      {fromPosition && (
        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
          from {fromPosition.name}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '0.6875rem', fontWeight: 700,
          color: c.badge,
          background: c.badgeBg,
          border: `0.5px solid ${c.border}`,
          borderRadius: 'var(--radius-sm)',
          padding: '2px 7px',
          fontFamily: 'var(--font-display)',
        }}>
          {confidence}/5
        </span>
        {squadAvg != null && (
          <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
            Squad avg: <strong style={{ color: 'var(--text-secondary)' }}>{squadAvg}</strong>
          </span>
        )}
      </div>
    </div>
  )
}

// ── Athlete attention card (coach view) ────────────────────────────────────────
// Shows one athlete who needs attention, with their avg confidence and a reason.
function AthleteAttentionCard({ athlete, avgConfidence, ratedCount, totalMoves, navigate }) {
  const pct = totalMoves > 0 ? Math.round((ratedCount / totalMoves) * 100) : 0
  const confColor = avgConfidence
    ? confidenceColor(Math.round(avgConfidence))
    : 'var(--text-muted)'

  return (
    <div
      onClick={() => navigate(`/athletes/${athlete.id}`)}
      style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.875rem 1rem',
        cursor: 'pointer',
        transition: 'border-color var(--transition)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
      }}
    >
      {/* Avatar initial */}
      <div style={{
        width: '2.25rem', height: '2.25rem',
        borderRadius: '50%',
        background: 'var(--bg-subtle)',
        border: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontSize: '0.875rem', fontWeight: 700,
        color: 'var(--text-secondary)',
        flexShrink: 0,
      }}>
        {(athlete.display_name || '?')[0].toUpperCase()}
      </div>

      {/* Name + progress bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.875rem', fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '0.25rem',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {athlete.display_name || 'Unnamed Athlete'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ConfidenceBar value={avgConfidence} color={confColor} />
          <span style={{
            fontSize: '0.625rem', color: 'var(--text-muted)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {pct}% rated
          </span>
        </div>
      </div>

      {/* Avg confidence badge */}
      <div style={{
        flexShrink: 0,
        width: '2.25rem', height: '2.25rem',
        borderRadius: 'var(--radius-sm)',
        border: avgConfidence
          ? `1.5px solid ${confColor}`
          : '0.5px solid var(--border)',
        background: avgConfidence
          ? confidenceBg(Math.round(avgConfidence))
          : 'var(--bg-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontSize: '0.8125rem', fontWeight: 700,
        color: avgConfidence ? confColor : 'var(--text-muted)',
      }}>
        {avgConfidence ?? '—'}
      </div>
    </div>
  )
}

// ── Squad insight strip (coach view) ──────────────────────────────────────────
function SquadInsightStrip({ insights, movesMap }) {
  if (!insights) return null
  const { weakest, strongest, most_inconsistent } = insights
  if (!weakest && !strongest && !most_inconsistent) return null

  return (
    <div style={{
      display: 'flex', gap: '0.625rem', flexWrap: 'wrap',
      marginBottom: '1.75rem',
    }}>
      {weakest && (
        <div style={{
          flex: 1, minWidth: '9rem',
          background: '#EF444408',
          border: '0.5px solid #EF4444',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
        }}>
          <div style={{
            fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#EF4444', marginBottom: '0.375rem',
          }}>
            ⚠️ Squad weakness
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700,
            color: 'var(--text-primary)', marginBottom: '0.2rem',
          }}>
            {weakest.move_name}
          </div>
          <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
            avg {weakest.avg_confidence}/5 across squad
          </div>
        </div>
      )}

      {strongest && (
        <div style={{
          flex: 1, minWidth: '9rem',
          background: '#22C55E08',
          border: '0.5px solid #22C55E',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
        }}>
          <div style={{
            fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#22C55E', marginBottom: '0.375rem',
          }}>
            💪 Squad strength
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700,
            color: 'var(--text-primary)', marginBottom: '0.2rem',
          }}>
            {strongest.move_name}
          </div>
          <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
            avg {strongest.avg_confidence}/5 across squad
          </div>
        </div>
      )}

      {most_inconsistent && (
        <div style={{
          flex: 1, minWidth: '9rem',
          background: '#F59E0B08',
          border: '0.5px solid #F59E0B',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
        }}>
          <div style={{
            fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#F59E0B', marginBottom: '0.375rem',
          }}>
            📊 Most inconsistent
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700,
            color: 'var(--text-primary)', marginBottom: '0.2rem',
          }}>
            {most_inconsistent.move_name}
          </div>
          <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
            {most_inconsistent.spread} point spread across squad
          </div>
        </div>
      )}
    </div>
  )
}

// ── Quick link ─────────────────────────────────────────────────────────────────
function QuickLink({ to, label, description, accent }) {
  return (
    <Link
      to={to}
      style={{
        display: 'block',
        background: accent ? 'var(--accent-soft)' : 'var(--bg-surface)',
        border: `0.5px solid ${accent ? 'var(--border-accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.125rem',
        textDecoration: 'none',
        transition: 'border-color var(--transition)',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.875rem', fontWeight: 600,
        color: accent ? 'var(--text-accent)' : 'var(--text-primary)',
        marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {description}
      </div>
    </Link>
  )
}

// ── Skeleton block ─────────────────────────────────────────────────────────────
function Skeleton({ height = 60, delay = 0 }) {
  return (
    <div style={{
      height,
      background: 'var(--bg-subtle)',
      borderRadius: 'var(--radius-md)',
      animation: 'pulse 1.4s ease infinite',
      animationDelay: `${delay}s`,
    }} />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [clubId, setClubId] = useState(null)
  const [clubName, setClubName] = useState(null)

  // Coach state
  const [dashboardData, setDashboardData] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  // Athlete state
  const [athleteInsights, setAthleteInsights] = useState(null)
  const [athleteInsightsLoading, setAthleteInsightsLoading] = useState(false)
  const [athleteStats, setAthleteStats] = useState(null)
  const [athleteStatsLoading, setAthleteStatsLoading] = useState(false)

  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Wrestler'

  const role = profile?.role ?? null
  const isCoach = role === 'coach' || role === 'admin'

  // ── Greeting ───────────────────────────────────────────────────────────────
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    'Good evening'

  // ── 1. Resolve club membership ─────────────────────────────────────────────
  useEffect(() => {
    if (!user || !profile) return

    async function resolveClub() {
      const { data: membership } = await supabase
        .from('club_memberships')
        .select('club_id, clubs(name)')
        .eq('user_id', user.id)
        .maybeSingle()

      if (membership?.club_id) {
        setClubId(membership.club_id)
        setClubName(membership.clubs?.name || null)
      }
    }

    resolveClub()
  }, [user, profile])

  // ── 2a. Coach: load dashboard data ────────────────────────────────────────
  useEffect(() => {
    if (!isCoach || !clubId) return

    async function loadDashboard() {
      setDashboardLoading(true)
      try {
        const data = await getClubDashboard(clubId)
        setDashboardData(data)
      } catch (err) {
        console.error('Dashboard load failed:', err)
      } finally {
        setDashboardLoading(false)
      }
    }

    loadDashboard()
  }, [isCoach, clubId])

  // ── 2b. Athlete: load own stats + insights ─────────────────────────────────
  useEffect(() => {
    if (isCoach || !user) return

    async function loadAthleteStats() {
      setAthleteStatsLoading(true)
      try {
        const { data: progress } = await supabase
          .from('user_move_progress')
          .select('confidence, is_favourite')
          .eq('user_id', user.id)

        const moveCount = progress?.length || 0
        const avgConfidence =
          moveCount > 0
            ? parseFloat(
                (progress.reduce((sum, m) => sum + m.confidence, 0) / moveCount).toFixed(1)
              )
            : null
        const favouriteCount = progress?.filter(m => m.is_favourite).length || 0

        setAthleteStats({ moveCount, avgConfidence, favouriteCount })
      } catch (err) {
        console.error('Athlete stats load failed:', err)
      } finally {
        setAthleteStatsLoading(false)
      }
    }

    loadAthleteStats()
  }, [isCoach, user])

  useEffect(() => {
    if (isCoach || !clubId || !user) return

    async function loadAthleteInsights() {
      setAthleteInsightsLoading(true)
      try {
        const data = await getAthleteInsights(clubId, user.id)
        setAthleteInsights(data)
      } catch (err) {
        console.error('Athlete insights load failed:', err)
        setAthleteInsights(null)
      } finally {
        setAthleteInsightsLoading(false)
      }
    }

    loadAthleteInsights()
  }, [isCoach, clubId, user])

  // ── Derived coach data ─────────────────────────────────────────────────────
  const athletes = dashboardData?.athletes || []
  const athleteAggregates = dashboardData?.athlete_aggregates || {}
  const moves = dashboardData?.moves || []
  const squadInsights = dashboardData?.insights || null

  // Rank athletes by avg_confidence ascending (lowest first = needs most attention)
  const athletesNeedingAttention = [...athletes]
    .filter(a => athleteAggregates[a.id]?.rated_count > 0)
    .sort((a, b) => {
      const aConf = athleteAggregates[a.id]?.avg_confidence ?? 99
      const bConf = athleteAggregates[b.id]?.avg_confidence ?? 99
      return aConf - bConf
    })
    .slice(0, 4)

  // Athletes who haven't rated anything yet
  const unratedAthletes = athletes.filter(
    a => !athleteAggregates[a.id] || athleteAggregates[a.id].rated_count === 0
  )

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '28px 24px' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
        }}>
          {isCoach ? (clubName || 'Your Club') : 'Home'}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28, fontWeight: 700,
          letterSpacing: '-0.5px',
          color: 'var(--text-primary)',
          margin: '0 0 8px 0',
        }}>
          {greeting}, {displayName}.
        </h1>
        <p style={{
          fontSize: '0.9375rem',
          color: 'var(--text-muted)',
          margin: 0,
          lineHeight: 1.5,
        }}>
          {isCoach
            ? `Here's where your squad stands today.`
            : `Here's what to focus on today.`}
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* COACH VIEW                                                       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {isCoach && (
        <>
          {/* ── No club yet ─────────────────────────────────────────── */}
          {!clubId && !dashboardLoading && (
            <div style={{
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              textAlign: 'center',
              marginBottom: '2rem',
            }}>
              <div style={{
                fontSize: '1.5rem', marginBottom: '0.75rem',
              }}>🤼</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1rem', fontWeight: 700,
                color: 'var(--text-primary)', marginBottom: '0.5rem',
              }}>
                Set up your club to get started
              </div>
              <div style={{
                fontSize: '0.8125rem', color: 'var(--text-muted)',
                marginBottom: '1rem',
              }}>
                Create a club, invite your athletes, and start tracking squad progress.
              </div>
              <Link to="/club" style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'var(--accent)', color: '#fff',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem 1.25rem',
                fontSize: '0.8125rem', fontWeight: 600,
                textDecoration: 'none',
              }}>
                Create Club →
              </Link>
            </div>
          )}

          {/* ── Squad stats ─────────────────────────────────────────── */}
          {clubId && (
            <>
              <div style={{
                display: 'flex', gap: '0.625rem',
                marginBottom: '1.75rem', flexWrap: 'wrap',
              }}>
                <StatPill
                  label="Athletes"
                  value={athletes.length}
                  loading={dashboardLoading}
                />
                <StatPill
                  label="Curricula"
                  value={dashboardData ? (dashboardData.chains?.length ?? 0) : null}
                  loading={dashboardLoading}
                />
                <StatPill
                  label="Avg Confidence"
                  value={(() => {
                    const aggs = Object.values(athleteAggregates).filter(a => a.avg_confidence != null)
                    if (aggs.length === 0) return null
                    return (aggs.reduce((s, a) => s + a.avg_confidence, 0) / aggs.length).toFixed(1)
                  })()}
                  loading={dashboardLoading}
                  accent
                />
                <StatPill
                  label="Not yet rated"
                  value={unratedAthletes.length}
                  loading={dashboardLoading}
                />
              </div>

              {/* ── Squad insights strip ──────────────────────────── */}
              {dashboardLoading ? (
                <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.75rem' }}>
                  {[1, 2, 3].map(i => <Skeleton key={i} height={78} delay={i * 0.1} />)}
                </div>
              ) : (
                <SquadInsightStrip insights={squadInsights} />
              )}

              {/* ── Athletes needing attention ────────────────────── */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: '0.75rem',
                }}>
                  <SectionLabel>Needs attention</SectionLabel>
                  <Link to="/dashboard" style={{
                    fontSize: '0.6875rem', fontWeight: 600,
                    color: 'var(--text-accent)', textDecoration: 'none',
                  }}>
                    Full dashboard →
                  </Link>
                </div>

                {dashboardLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} height={58} delay={i * 0.08} />)}
                  </div>
                ) : athletesNeedingAttention.length === 0 && unratedAthletes.length === 0 ? (
                  <div style={{
                    background: 'var(--bg-surface)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    textAlign: 'center',
                    fontSize: '0.8125rem', color: 'var(--text-muted)',
                  }}>
                    {athletes.length === 0
                      ? 'No athletes in your club yet — share your invite code to get started.'
                      : 'No athlete data yet — ask your squad to rate their moves.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {athletesNeedingAttention.map(athlete => (
                      <AthleteAttentionCard
                        key={athlete.id}
                        athlete={athlete}
                        avgConfidence={athleteAggregates[athlete.id]?.avg_confidence}
                        ratedCount={athleteAggregates[athlete.id]?.rated_count || 0}
                        totalMoves={moves.length}
                        navigate={navigate}
                      />
                    ))}
                    {/* Show unrated athletes as a nudge */}
                    {unratedAthletes.length > 0 && (
                      <div style={{
                        background: 'var(--bg-surface)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem 1rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                      }}>
                        <span>📋</span>
                        <span>
                          <strong style={{ color: 'var(--text-secondary)' }}>
                            {unratedAthletes.length} {unratedAthletes.length === 1 ? 'athlete' : 'athletes'}
                          </strong>
                          {' '}haven't rated any moves yet:{' '}
                          {unratedAthletes.slice(0, 3).map(a => a.display_name).join(', ')}
                          {unratedAthletes.length > 3 ? ` +${unratedAthletes.length - 3} more` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Quick links ───────────────────────────────────── */}
              <div style={{ marginBottom: '1.75rem' }}>
                <SectionLabel>Quick links</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <QuickLink
                    to="/dashboard"
                    label="Squad Dashboard"
                    description="Full progress matrix across all athletes"
                    accent
                  />
                  <QuickLink
                    to="/curricula"
                    label="Curricula"
                    description="Build and assign structured training"
                  />
                  <QuickLink
                    to="/explore"
                    label="Technique Graph"
                    description="Explore all positions and move chains"
                  />
                  <QuickLink
                    to="/club"
                    label="Club Settings"
                    description="Manage members and invite athletes"
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ATHLETE VIEW                                                     */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {role === 'athlete' && (
        <>
          {/* ── Progress stat pills ─────────────────────────────────── */}
          <div style={{
            display: 'flex', gap: '0.625rem',
            marginBottom: '1.75rem', flexWrap: 'wrap',
          }}>
            <StatPill
              label="Moves Rated"
              value={athleteStats?.moveCount ?? 0}
              loading={athleteStatsLoading}
            />
            <StatPill
              label="Avg Confidence"
              value={athleteStats?.avgConfidence ?? null}
              loading={athleteStatsLoading}
              accent
            />
            <StatPill
              label="Favourites"
              value={athleteStats?.favouriteCount ?? 0}
              loading={athleteStatsLoading}
            />
          </div>

          {/* ── Athlete insights ────────────────────────────────────── */}
          {!clubId && !athleteInsightsLoading && (
            <div style={{
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.75rem',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}>
              Join a club to unlock personalised insights and squad comparisons.{' '}
              <Link to="/club" style={{ color: 'var(--text-accent)', fontWeight: 600 }}>
                Join now →
              </Link>
            </div>
          )}

          {clubId && (
            <div style={{ marginBottom: '1.75rem' }}>
              <SectionLabel>Your focus</SectionLabel>

              {athleteInsightsLoading ? (
                <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                  {[1, 2, 3].map(i => <Skeleton key={i} height={90} delay={i * 0.1} />)}
                </div>
              ) : !athleteInsights || (!athleteInsights.focus && !athleteInsights.weakest && !athleteInsights.strongest) ? (
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  fontSize: '0.8125rem', color: 'var(--text-muted)',
                  textAlign: 'center',
                }}>
                  Rate at least 5 moves to unlock your personalised insights.{' '}
                  <Link to="/explore" style={{ color: 'var(--text-accent)', fontWeight: 600 }}>
                    Start in the graph →
                  </Link>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {athleteInsights.focus && (
                      <InsightCard
                        icon="🎯"
                        label="Focus This Week"
                        moveName={athleteInsights.focus.move_name}
                        confidence={athleteInsights.focus.confidence}
                        squadAvg={athleteInsights.focus.squad_avg}
                        fromPosition={athleteInsights.focus.from_position}
                        variant="focus"
                      />
                    )}
                    {athleteInsights.weakest && (!athleteInsights.focus || athleteInsights.focus.move_id !== athleteInsights.weakest.move_id) && (
                      <InsightCard
                        icon="⚠️"
                        label="Needs Work"
                        moveName={athleteInsights.weakest.move_name}
                        confidence={athleteInsights.weakest.confidence}
                        squadAvg={athleteInsights.weakest.squad_avg}
                        fromPosition={athleteInsights.weakest.from_position}
                        variant="danger"
                      />
                    )}
                    {athleteInsights.strongest && (
                      <InsightCard
                        icon="💪"
                        label="Your Strength"
                        moveName={athleteInsights.strongest.move_name}
                        confidence={athleteInsights.strongest.confidence}
                        squadAvg={athleteInsights.strongest.squad_avg}
                        fromPosition={athleteInsights.strongest.from_position}
                        variant="success"
                      />
                    )}
                  </div>

                  {/* Unrated curriculum moves nudge */}
                  {athleteInsights.unrated_curriculum_moves?.length > 0 && (
                    <div style={{
                      background: 'var(--bg-surface)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 1rem',
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    }}>
                      <span style={{ fontSize: '0.875rem', flexShrink: 0, marginTop: 1 }}>📋</span>
                      <div>
                        <div style={{
                          fontSize: '0.75rem', fontWeight: 600,
                          color: 'var(--text-secondary)', marginBottom: '0.375rem',
                        }}>
                          {athleteInsights.unrated_curriculum_moves.length} curriculum{' '}
                          {athleteInsights.unrated_curriculum_moves.length === 1 ? 'move' : 'moves'} not yet rated
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                          {athleteInsights.unrated_curriculum_moves.slice(0, 5).map(m => (
                            <span key={m.id} style={{
                              fontSize: '0.6875rem', color: 'var(--text-muted)',
                              background: 'var(--bg-subtle)',
                              border: '0.5px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '2px 8px',
                            }}>
                              {m.name}
                            </span>
                          ))}
                          {athleteInsights.unrated_curriculum_moves.length > 5 && (
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', padding: '2px 4px' }}>
                              +{athleteInsights.unrated_curriculum_moves.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Quick links ──────────────────────────────────────────── */}
          <div style={{ marginBottom: '1.75rem' }}>
            <SectionLabel>Quick links</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <QuickLink
                to="/progress"
                label="My Progress"
                description="Rate your confidence across techniques"
                accent
              />
              <QuickLink
                to="/explore"
                label="Technique Graph"
                description="Explore positions and move chains"
              />
              <QuickLink
                to="/club"
                label="My Club"
                description="View your club and assigned curricula"
              />
            </div>
          </div>
        </>
      )}

      {/* Pulse animation */}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}