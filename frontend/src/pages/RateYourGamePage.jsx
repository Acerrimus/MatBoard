import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { getGraph, getMyProgress, bulkRateProgress } from '../api'
import { confidenceColor, confidenceBg } from '../components/MoveCard'

// ── Position tier ordering (mirrors GraphPage wrestling flow) ─────────────────
const TIER_ORDER = [
  {
    label: 'Entry',
    slugs: ['neutral'],
  },
  {
    label: 'Ties & Setups',
    slugs: ['collar-tie', 'inside-tie', 'underhook', 'double-underhooks', 'overhook', '2-on-1', 'clinch-bodylock'],
  },
  {
    label: 'Attacks',
    slugs: ['double-leg-shot', 'high-crotch', 'single-leg', 'front-headlock'],
  },
  {
    label: 'Control',
    slugs: ['back-control-standing', 'back-control-top', 'referees-top', 'par-terre-top'],
  },
  {
    label: 'Ground',
    slugs: ['referees-bottom', 'par-terre-bottom', 'turtle', 'scramble'],
  },
]

const STYLE_OPTIONS = ['all', 'folkstyle', 'freestyle']

export default function RateYourGamePage() {
  const navigate = useNavigate()

  // ── Data state ──────────────────────────────────────────────────────────────
  const [positions, setPositions] = useState([])
  const [moves, setMoves] = useState([])
  const [existingProgress, setExistingProgress] = useState({})  // { moveId: confidence }
  const [ratings, setRatings] = useState({})                     // { moveId: confidence }
  const [styleFilter, setStyleFilter] = useState('all')
  const [expandedSlug, setExpandedSlug] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const didAutoExpand = useRef(false)

  // ── Auth check + data fetch ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login', { replace: true })
        return
      }
      try {
        const [graphData, progressData] = await Promise.all([
          getGraph(),
          getMyProgress(),
        ])
        if (cancelled) return

        setPositions(graphData.positions || [])
        setMoves(graphData.moves || [])

        // Build existing progress lookup
        const prog = {}
        for (const p of (progressData || [])) {
          if (p.confidence) prog[p.move_id] = p.confidence
        }
        setExistingProgress(prog)
      } catch (e) {
        console.error('Failed to load rate-your-game data:', e)
        if (!cancelled) setError('Failed to load data. Please refresh.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [navigate])

  // ── Lookups ─────────────────────────────────────────────────────────────────
  const positionBySlug = useMemo(() => {
    const map = {}
    for (const p of positions) map[p.slug] = p
    return map
  }, [positions])

  // Moves grouped by from_position slug
  const movesByPositionSlug = useMemo(() => {
    const posIdToSlug = {}
    for (const p of positions) posIdToSlug[p.id] = p.slug

    const map = {}
    for (const m of moves) {
      const slug = posIdToSlug[m.from_position_id]
      if (!slug) continue
      // Apply style filter
      if (styleFilter !== 'all') {
        if (!m.styles || !m.styles.includes(styleFilter)) continue
      }
      if (!map[slug]) map[slug] = []
      map[slug].push(m)
    }
    // Sort moves alphabetically within each position
    for (const slug in map) {
      map[slug].sort((a, b) => a.name.localeCompare(b.name))
    }
    return map
  }, [positions, moves, styleFilter])

  // Filtered tier structure — only tiers/positions that have moves
  const filteredTiers = useMemo(() => {
    const result = []
    for (const tier of TIER_ORDER) {
      const visibleSlugs = tier.slugs.filter(slug => {
        const pos = positionBySlug[slug]
        if (!pos) return false
        // Filter position by style
        if (styleFilter !== 'all') {
          if (!pos.styles || !pos.styles.includes(styleFilter)) return false
        }
        // Only show if it has moves after filtering
        return (movesByPositionSlug[slug] || []).length > 0
      })
      if (visibleSlugs.length > 0) {
        result.push({ label: tier.label, slugs: visibleSlugs })
      }
    }
    return result
  }, [positionBySlug, movesByPositionSlug, styleFilter])

  // ── Auto-expand neutral on first load ───────────────────────────────────────
  useEffect(() => {
    if (!loading && !didAutoExpand.current && filteredTiers.length > 0) {
      const firstSlug = filteredTiers[0]?.slugs[0]
      if (firstSlug) setExpandedSlug(firstSlug)
      didAutoExpand.current = true
    }
  }, [loading, filteredTiers])

  // ── Collapse expanded position if it becomes invisible after filter change ──
  useEffect(() => {
    if (!expandedSlug) return
    const allVisibleSlugs = filteredTiers.flatMap(t => t.slugs)
    if (!allVisibleSlugs.includes(expandedSlug)) {
      setExpandedSlug(null)
    }
  }, [filteredTiers, expandedSlug])

  // ── Rating helpers ──────────────────────────────────────────────────────────
  const getConfidence = useCallback((moveId) => {
    if (ratings[moveId] !== undefined) return ratings[moveId]
    if (existingProgress[moveId] !== undefined) return existingProgress[moveId]
    return null
  }, [ratings, existingProgress])

  const handleRate = useCallback((moveId, confidence) => {
    setRatings(prev => {
      const next = { ...prev }
      // Toggle off if tapping same value (only removes session rating)
      if (prev[moveId] === confidence) {
        delete next[moveId]
      } else {
        next[moveId] = confidence
      }
      return next
    })
  }, [])

  // ── Stats ───────────────────────────────────────────────────────────────────
  const allVisibleMoveIds = useMemo(() => {
    const ids = new Set()
    for (const slug in movesByPositionSlug) {
      for (const m of movesByPositionSlug[slug]) ids.add(m.id)
    }
    return ids
  }, [movesByPositionSlug])

  const totalVisible = allVisibleMoveIds.size

  const totalRated = useMemo(() => {
    let count = 0
    for (const id of allVisibleMoveIds) {
      if (ratings[id] !== undefined || existingProgress[id] !== undefined) count++
    }
    return count
  }, [allVisibleMoveIds, ratings, existingProgress])

  const newRatingsCount = Object.keys(ratings).length

  // ── Position stats helper ───────────────────────────────────────────────────
  const getPositionStats = useCallback((slug) => {
    const posMoves = movesByPositionSlug[slug] || []
    let rated = 0
    let sum = 0
    for (const m of posMoves) {
      const c = getConfidence(m.id)
      if (c !== null) {
        rated++
        sum += c
      }
    }
    return {
      total: posMoves.length,
      rated,
      avg: rated > 0 ? (sum / rated).toFixed(1) : null,
    }
  }, [movesByPositionSlug, getConfidence])

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const ratingsArray = Object.entries(ratings).map(([move_id, confidence]) => ({
      move_id,
      confidence,
    }))

    if (ratingsArray.length === 0) {
      navigate('/home', { replace: true })
      return
    }

    setSaving(true)
    setError(null)
    try {
      await bulkRateProgress(ratingsArray)
      navigate('/home', { replace: true })
    } catch (e) {
      console.error('Failed to save ratings:', e)
      setError('Failed to save — please try again.')
      setSaving(false)
    }
  }

  // ── Toggle position ─────────────────────────────────────────────────────────
  const togglePosition = (slug) => {
    setExpandedSlug(prev => prev === slug ? null : slug)
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-page)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700,
            letterSpacing: '-0.3px', color: 'var(--text-primary)',
          }}>
            Mat<span style={{ color: 'var(--accent)' }}>board</span>
          </div>
          <div style={{
            width: 24, height: 24,
            border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
          }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-page)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '32px 24px 0', maxWidth: 600,
        margin: '0 auto', width: '100%',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
          letterSpacing: '-0.3px', color: 'var(--text-primary)',
          marginBottom: 4, textAlign: 'center',
        }}>
          Rate Your Game
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-muted)',
          textAlign: 'center', marginBottom: 24, lineHeight: 1.5,
        }}>
          Tap each position to see its moves. Rate your confidence 1–5.<br />
          This builds your technique map instantly.
        </div>

        {/* Style filter */}
        <div style={{
          display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16,
        }}>
          {STYLE_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStyleFilter(s)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-md)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: styleFilter === s ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: styleFilter === s ? 'var(--accent-soft)' : 'var(--bg-surface)',
                color: styleFilter === s ? 'var(--accent)' : 'var(--text-secondary)',
                textTransform: 'capitalize',
              }}
            >
              {s === 'all' ? 'All Styles' : s}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{
          background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, height: 6, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: totalVisible > 0 ? `${(totalRated / totalVisible) * 100}%` : '0%',
              height: '100%', background: 'var(--accent)',
              borderRadius: 3, transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {totalRated} / {totalVisible} rated
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
            borderRadius: 'var(--radius-md)', padding: '10px 14px',
            fontSize: 12, color: 'var(--accent)',
            marginBottom: 16, textAlign: 'center',
          }}>{error}</div>
        )}
      </div>

      {/* Position groups */}
      <div style={{
        flex: 1, padding: '0 24px 120px', maxWidth: 600,
        margin: '0 auto', width: '100%',
      }}>
        {filteredTiers.map(tier => (
          <div key={tier.label} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--text-muted)',
              marginBottom: 8, paddingLeft: 2,
            }}>
              {tier.label}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tier.slugs.map(slug => {
                const pos = positionBySlug[slug]
                if (!pos) return null
                const stats = getPositionStats(slug)
                const isExpanded = expandedSlug === slug
                const posMoves = movesByPositionSlug[slug] || []

                return (
                  <div key={slug}>
                    {/* Position card header */}
                    <button
                      onClick={() => togglePosition(slug)}
                      style={{
                        width: '100%', textAlign: 'left', cursor: 'pointer',
                        background: isExpanded ? 'var(--bg-surface)' : 'var(--bg-surface)',
                        border: isExpanded ? '1px solid var(--border-strong)' : '0.5px solid var(--border)',
                        borderRadius: isExpanded ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
                        padding: '12px 14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        fontFamily: 'var(--font-body)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{
                          fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                          marginBottom: 2,
                        }}>
                          {pos.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {stats.rated} of {stats.total} rated
                          {stats.avg && (
                            <span style={{
                              marginLeft: 8,
                              color: confidenceColor(Math.round(parseFloat(stats.avg))),
                            }}>
                              avg {stats.avg}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 16, color: 'var(--text-muted)',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}>
                        ▾
                      </div>
                    </button>

                    {/* Expanded move list */}
                    {isExpanded && (
                      <div style={{
                        border: '1px solid var(--border-strong)',
                        borderTop: 'none',
                        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                        background: 'var(--bg-surface)',
                        overflow: 'hidden',
                      }}>
                        {posMoves.map((move, i) => {
                          const conf = getConfidence(move.id)
                          return (
                            <div
                              key={move.id}
                              style={{
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                borderTop: i > 0 ? '0.5px solid var(--border)' : 'none',
                              }}
                            >
                              <div style={{
                                fontSize: 13, color: 'var(--text-primary)',
                                flex: 1, marginRight: 12,
                              }}>
                                {move.name}
                              </div>

                              {/* 1-5 rating buttons */}
                              <div style={{ display: 'flex', gap: 4 }}>
                                {[1, 2, 3, 4, 5].map(n => {
                                  const isSelected = conf === n
                                  return (
                                    <button
                                      key={n}
                                      onClick={() => handleRate(move.id, n)}
                                      style={{
                                        width: 30, height: 28,
                                        borderRadius: 'var(--radius-sm)',
                                        border: isSelected
                                          ? `1.5px solid ${confidenceColor(n)}`
                                          : '1px solid var(--border)',
                                        background: isSelected ? confidenceBg(n) : 'var(--bg-subtle)',
                                        color: isSelected ? confidenceColor(n) : 'var(--text-muted)',
                                        fontSize: 12, fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.1s ease',
                                        fontFamily: 'var(--font-body)',
                                      }}
                                    >
                                      {n}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar — fixed */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-surface)',
        borderTop: '0.5px solid var(--border)',
        padding: '14px 24px',
        display: 'flex', justifyContent: 'center', gap: 12,
        zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/home', { replace: true })}
          disabled={saving}
          style={{
            padding: '10px 20px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          Skip for now
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px', borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving
            ? 'Saving…'
            : newRatingsCount > 0
              ? `Save ${newRatingsCount} rating${newRatingsCount !== 1 ? 's' : ''} & continue`
              : 'Continue'
          }
        </button>
      </div>
    </div>
  )
}