import { useState, useEffect } from 'react'
import { getMyBoard, upsertProgress, deleteProgress, getMyChains, deleteChain, createPersonalMove, addToBoard, getPositions } from '../api'
import { confidenceColor, confidenceBg, moveType, moveTypeColor } from '../components/MoveCard'

function avg(nums) {
  if (!nums.length) return null
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)
}

function truncateName(name, max = 22) {
  if (!name || name.length <= max) return name
  const half = Math.floor((max - 3) / 2)
  return `${name.slice(0, half + 2)}…${name.slice(-half)}`
}

function StatPill({ label, value, accent }) {
  return (
    <div style={{
      background: accent ? 'var(--accent-soft)' : 'var(--stat-bg)',
      border: `0.5px solid ${accent ? 'var(--border-accent)' : 'var(--stat-border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '14px 20px',
      display: 'flex', flexDirection: 'column', gap: 4,
      flex: 1, minWidth: 100,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
        color: accent ? 'var(--accent)' : 'var(--text-primary)', lineHeight: 1,
      }}>{value ?? '—'}</div>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>{label}</div>
    </div>
  )
}

function SectionLabel({ children, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>{children}</div>
      {count !== undefined && (
        <div style={{
          fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
          background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
          borderRadius: 20, padding: '1px 7px',
        }}>{count}</div>
      )}
    </div>
  )
}

function InlineConfidence({ value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          onClick={() => !disabled && onChange(i)}
          title={['', 'Beginner', 'Developing', 'Competent', 'Proficient', 'Expert'][i]}
          style={{
            width: 26, height: 26,
            borderRadius: 'var(--radius-sm)',
            border: `1.5px solid ${i === value ? confidenceColor(i) : 'var(--border)'}`,
            background: i === value ? confidenceBg(i) : 'var(--bg-subtle)',
            color: i === value ? confidenceColor(i) : 'var(--text-muted)',
            fontSize: 11, fontWeight: 700,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all var(--transition)',
            fontFamily: 'var(--font-display)', flexShrink: 0,
          }}
        >{i}</button>
      ))}
    </div>
  )
}

function MoveRow({ item, onProgressChange }) {
  const [saving, setSaving] = useState(false)
  const move       = item.move
  const confidence = item.progress?.confidence   ?? null
  const isFav      = item.progress?.is_favourite ?? false
  const tc         = moveTypeColor(move)
  const tt         = moveType(move)

  const handleConfidence = async (val) => {
    setSaving(true)
    try {
      if (val === confidence) {
        if (isFav) {
          const updated = await upsertProgress(move.id, null, true)
          onProgressChange(move.id, updated)
        } else {
          await deleteProgress(move.id)
          onProgressChange(move.id, null)
        }
      } else {
        const updated = await upsertProgress(move.id, val, isFav)
        onProgressChange(move.id, updated)
      }
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleFav = async () => {
    setSaving(true)
    try {
      const newFav = !isFav
      if (!newFav && confidence === null) {
        await deleteProgress(move.id)
        onProgressChange(move.id, null)
      } else {
        const updated = await upsertProgress(move.id, confidence, newFav)
        onProgressChange(move.id, updated)
      }
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const borderLeft = `3px solid ${confidence ? confidenceColor(confidence) : 'var(--border)'}`

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
      borderLeft, borderRadius: 'var(--radius-md)',
      padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12,
      marginBottom: 6, transition: 'border-color var(--transition)',
      opacity: saving ? 0.6 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{move.name}</div>
          {tt !== 'global' && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: tc,
              background: `${tc}18`, border: `0.5px solid ${tc}44`,
              borderRadius: 3, padding: '1px 4px',
              letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0,
            }}>{tt === 'personal' ? 'Mine' : 'Club'}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {move.from_position?.name ?? '—'} → {move.to_position?.name ?? '—'}
        </div>
      </div>
      <InlineConfidence value={confidence} onChange={handleConfidence} disabled={saving} />
      <button
        onClick={handleFav} disabled={saving}
        style={{
          background: isFav ? '#FEF9C3' : 'var(--bg-subtle)',
          border: `0.5px solid ${isFav ? '#FDE047' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)', width: 28, height: 28,
          fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
          transition: 'all var(--transition)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >{isFav ? '★' : '☆'}</button>
    </div>
  )
}

function ChainCard({ chain, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    setDeleting(true)
    try {
      await onDelete(chain.id)
    } catch (e) {
      console.error(e)
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '0.875rem 1rem',
      marginBottom: '0.625rem', opacity: deleting ? 0.5 : 1,
      transition: 'opacity var(--transition)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: '0.625rem',
      }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {chain.name}
        </div>
        <button
          onClick={handleDelete} disabled={deleting}
          style={{
            padding: '0.25rem 0.625rem', fontSize: '0.6875rem', fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            border: `0.5px solid ${confirming ? 'var(--accent)' : 'var(--border)'}`,
            background: confirming ? 'var(--accent-soft)' : 'var(--bg-subtle)',
            color: confirming ? 'var(--accent)' : 'var(--text-muted)',
            cursor: deleting ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)', transition: 'all var(--transition)',
            flexShrink: 0,
          }}
        >{deleting ? '...' : confirming ? 'Confirm delete' : 'Delete'}</button>
      </div>

      {chain.moves.length === 0 ? (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No moves added yet
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
          {chain.moves.map((item, i) => {
            const confidence = item.progress?.confidence ?? null
            const color      = confidenceColor(confidence)
            const bg         = confidence ? confidenceBg(confidence) : 'var(--bg-subtle)'
            const tc         = moveTypeColor(item.move)
            const tt         = moveType(item.move)
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  title={item.move.name}
                  style={{
                    background: bg, border: `1.5px solid ${color}`,
                    borderRadius: 'var(--radius-sm)', padding: '0.3125rem 0.625rem',
                    fontSize: '0.75rem', fontWeight: 500,
                    color: confidence ? color : 'var(--text-secondary)',
                    whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {truncateName(item.move.name)}
                  {tt !== 'global' && (
                    <span style={{
                      fontSize: 8, fontWeight: 700, color: tc,
                      background: `${tc}18`, border: `0.5px solid ${tc}44`,
                      borderRadius: 3, padding: '1px 3px',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>{tt === 'personal' ? 'P' : 'C'}</span>
                  )}
                  {confidence && (
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, opacity: 0.8 }}>
                      {confidence}
                    </span>
                  )}
                </div>
                {i < chain.moves.length - 1 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0 0.25rem', flexShrink: 0 }}>→</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {chain.moves.length > 0 && (() => {
        const weakLink = chain.moves.find(m => m.progress?.confidence && m.progress.confidence <= 2)
        const unrated  = chain.moves.filter(m => !m.progress?.confidence).length
        if (!weakLink && !unrated) return null
        return (
          <div style={{
            marginTop: '0.625rem', fontSize: '0.6875rem',
            color: weakLink ? '#EF4444' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {weakLink
              ? `⚠ Weak link: ${weakLink.move.name} (${weakLink.progress.confidence}/5)`
              : `${unrated} move${unrated > 1 ? 's' : ''} unrated`}
          </div>
        )
      })()}
    </div>
  )
}

// ── Create personal move form ─────────────────────────────────────────────────
function CreatePersonalMoveForm({ onCreated, onCancel }) {
  const [positions, setPositions] = useState([])
  const [name, setName]           = useState('')
  const [fromPos, setFromPos]     = useState('')
  const [toPos, setToPos]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)

  useEffect(() => {
    getPositions().then(setPositions).catch(console.error)
  }, [])

  const handleSubmit = async () => {
    if (!name.trim() || !fromPos || !toPos) {
      setError('All fields are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const from = positions.find(p => p.slug === fromPos)
      const to   = positions.find(p => p.slug === toPos)
      if (!from || !to) { setError('Invalid positions.'); setSaving(false); return }
      const created = await createPersonalMove(name.trim(), from.id, to.id)
      await addToBoard(created.id)
      onCreated(created)
    } catch (e) {
      setError('Failed to create move.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid #0D9488',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px', marginBottom: 12,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: '#0D9488', marginBottom: 12,
      }}>New Personal Move</div>

      {error && (
        <div style={{
          fontSize: 11, color: 'var(--accent)', marginBottom: 8,
          background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-sm)', padding: '4px 8px',
        }}>{error}</div>
      )}

      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Move name…"
        style={{
          width: '100%', padding: '8px 12px', fontSize: 13,
          fontFamily: 'var(--font-body)', background: 'var(--bg-subtle)',
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)', outline: 'none', marginBottom: 8,
        }}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 10, color: 'var(--text-muted)', marginBottom: 4,
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>From</div>
          <select
            value={fromPos}
            onChange={e => setFromPos(e.target.value)}
            style={{
              width: '100%', padding: '7px 8px', fontSize: 12,
              fontFamily: 'var(--font-body)', background: 'var(--bg-subtle)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)', outline: 'none',
            }}
          >
            <option value="">Select…</option>
            {positions.map(p => <option key={p.id} value={p.slug}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 10, color: 'var(--text-muted)', marginBottom: 4,
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>To</div>
          <select
            value={toPos}
            onChange={e => setToPos(e.target.value)}
            style={{
              width: '100%', padding: '7px 8px', fontSize: 12,
              fontFamily: 'var(--font-body)', background: 'var(--bg-subtle)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)', outline: 'none',
            }}
          >
            <option value="">Select…</option>
            {positions.map(p => <option key={p.id} value={p.slug}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleSubmit} disabled={saving}
          style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 600,
            borderRadius: 'var(--radius-md)', border: 'none',
            background: '#0D9488', color: 'white',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)', opacity: saving ? 0.6 : 1,
          }}
        >{saving ? 'Creating…' : 'Create move'}</button>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 12px', fontSize: 12, borderRadius: 'var(--radius-md)',
            border: '0.5px solid var(--border)', background: 'var(--bg-subtle)',
            color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >Cancel</button>
      </div>
    </div>
  )
}

function EmptyBoard() {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600,
        color: 'var(--text-primary)', marginBottom: 6,
      }}>Your board is empty</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Head to the Graph and add moves to your board to start tracking your progress.
      </div>
    </div>
  )
}

export default function ProgressPage() {
  const [boardItems, setBoardItems]         = useState([])
  const [chains, setChains]                 = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)
  const [filter, setFilter]                 = useState('all')
  const [creatingMove, setCreatingMove]     = useState(false)

  useEffect(() => {
    Promise.all([getMyBoard(), getMyChains()])
      .then(([board, chains]) => { setBoardItems(board); setChains(chains) })
      .catch(() => setError('Could not load progress data.'))
      .finally(() => setLoading(false))
  }, [])

  const handleProgressChange = (moveId, progressData) => {
    setBoardItems(prev => prev.map(item =>
      item.move.id !== moveId ? item : { ...item, progress: progressData }
    ))
    setChains(prev => prev.map(chain => ({
      ...chain,
      moves: chain.moves.map(m =>
        m.move.id === moveId ? { ...m, progress: progressData } : m
      ),
    })))
  }

  const handleDeleteChain = async (chainId) => {
    try {
      await deleteChain(chainId)
      setChains(prev => prev.filter(c => c.id !== chainId))
    } catch (e) { console.error('Failed to delete chain', e) }
  }

  const handlePersonalMoveCreated = (newMove) => {
    // Add to board items with no progress yet
    setBoardItems(prev => [...prev, { move: newMove, progress: null }])
    setCreatingMove(false)
  }

  const rated      = boardItems.filter(i => i.progress?.confidence)
  const unrated    = boardItems.filter(i => !i.progress?.confidence)
  const weak       = boardItems.filter(i => i.progress?.confidence <= 2)
  const favourites = boardItems.filter(i => i.progress?.is_favourite)
  const avgConf    = avg(rated.map(i => i.progress.confidence))

  const filteredItems = (() => {
    if (filter === 'rated')   return rated
    if (filter === 'unrated') return unrated
    if (filter === 'weak')    return weak
    return boardItems
  })()

  const grouped = filteredItems.reduce((acc, item) => {
    const key = item.move.from_position?.name ?? 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  if (loading) return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            height: 52, background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            animation: 'pulse 1.4s ease infinite',
            animationDelay: `${i * 0.1}s`,
          }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
        }}>My Progress</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
          letterSpacing: '-0.5px', color: 'var(--text-primary)',
        }}>Technique Tracker</h1>
      </div>

      {error && (
        <div style={{
          background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px',
          fontSize: 13, color: 'var(--accent)', marginBottom: 20,
        }}>{error}</div>
      )}

      {boardItems.length === 0 && !loading ? (
        <>
          <EmptyBoard />
          <div style={{ marginTop: 16 }}>
            {creatingMove ? (
              <CreatePersonalMoveForm
                onCreated={handlePersonalMoveCreated}
                onCancel={() => setCreatingMove(false)}
              />
            ) : (
              <button
                onClick={() => setCreatingMove(true)}
                style={{
                  padding: '8px 16px', fontSize: 12, fontWeight: 600,
                  borderRadius: 'var(--radius-md)', border: '0.5px solid #0D9488',
                  background: 'rgba(13,148,136,0.08)', color: '#0D9488',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  transition: 'all var(--transition)',
                }}
              >+ Create personal move</button>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
            <StatPill label="On board"       value={boardItems.length} />
            <StatPill label="Rated"          value={rated.length} />
            <StatPill label="Avg confidence" value={avgConf} />
            <StatPill label="Favourites"     value={favourites.length} />
            {weak.length > 0 && <StatPill label="Needs work" value={weak.length} accent />}
          </div>

          {/* Chains */}
          {chains.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <SectionLabel count={chains.length}>My Chains</SectionLabel>
              {chains.map(chain => (
                <ChainCard key={chain.id} chain={chain} onDelete={handleDeleteChain} />
              ))}
            </div>
          )}

          {/* Favourites */}
          {favourites.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <SectionLabel count={favourites.length}>Favourites</SectionLabel>
              {favourites.map(item => (
                <MoveRow key={item.move.id} item={item} onProgressChange={handleProgressChange} />
              ))}
            </div>
          )}

          {/* Create personal move */}
          <div style={{ marginBottom: 20 }}>
            {creatingMove ? (
              <CreatePersonalMoveForm
                onCreated={handlePersonalMoveCreated}
                onCancel={() => setCreatingMove(false)}
              />
            ) : (
              <button
                onClick={() => setCreatingMove(true)}
                style={{
                  padding: '6px 14px', fontSize: 11, fontWeight: 600,
                  borderRadius: 'var(--radius-md)', border: '0.5px solid #0D9488',
                  background: 'rgba(13,148,136,0.08)', color: '#0D9488',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  transition: 'all var(--transition)',
                }}
              >+ Create personal move</button>
            )}
          </div>

          {/* Board with filter tabs */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 12, flexWrap: 'wrap', gap: 8,
            }}>
              <SectionLabel count={filteredItems.length}>All Board Moves</SectionLabel>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { key: 'all',     label: 'All'        },
                  { key: 'unrated', label: 'Unrated'    },
                  { key: 'weak',    label: 'Needs work' },
                  { key: 'rated',   label: 'Rated'      },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    style={{
                      padding: '4px 10px', fontSize: 11, fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: `0.5px solid ${filter === tab.key ? 'var(--accent)' : 'var(--border)'}`,
                      background: filter === tab.key ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                      color: filter === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                      transition: 'all var(--transition)',
                    }}
                  >{tab.label}</button>
                ))}
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div style={{
                padding: '20px', textAlign: 'center', fontSize: 13,
                color: 'var(--text-muted)', background: 'var(--bg-surface)',
                border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
              }}>No moves in this category</div>
            ) : (
              Object.entries(grouped).map(([positionName, items]) => (
                <div key={positionName} style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    marginBottom: 8, paddingLeft: 4,
                  }}>From {positionName}</div>
                  {items.map(item => (
                    <MoveRow key={item.move.id} item={item} onProgressChange={handleProgressChange} />
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}