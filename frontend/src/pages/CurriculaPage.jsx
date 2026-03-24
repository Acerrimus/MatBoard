import { useState, useEffect } from 'react'
import {
  getCurricula,
  getCurriculum,
  createCurriculum,
  deleteCurriculum,
  addCurriculumChain,
  deleteCurriculumChain,
  addMoveToChain,
  removeMoveFromChain,
  getPositions,
  getMovesFromPosition,
  createClubMove,
  createClubPosition,
  getMyClub,
} from '../api'
import { moveType, moveTypeColor } from '../components/MoveCard'

// ── Helpers ───────────────────────────────────────────────────────────────────
function truncateName(name, max = 22) {
  if (!name || name.length <= max) return name
  const half = Math.floor((max - 3) / 2)
  return `${name.slice(0, half + 2)}…${name.slice(-half)}`
}

// ── Shared components ─────────────────────────────────────────────────────────
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

// ── Curriculum list card ──────────────────────────────────────────────────────
function CurriculumCard({ curriculum, onSelect, onDelete }) {
  const [confirming, setConfirming] = useState(false)

  const handleDelete = (e) => {
    e.stopPropagation()
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    onDelete(curriculum.id)
  }

  return (
    <div
      onClick={() => onSelect(curriculum.id)}
      style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderLeft: '3px solid var(--move-color)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px', marginBottom: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', transition: 'border-color var(--transition)',
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          {curriculum.name}
        </div>
        {curriculum.description && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {curriculum.description}
          </div>
        )}
      </div>
      <button
        onClick={handleDelete}
        style={{
          background: confirming ? 'var(--accent-soft)' : 'var(--bg-subtle)',
          border: `0.5px solid ${confirming ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '4px 10px', fontSize: 11,
          color: confirming ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer', fontFamily: 'var(--font-body)',
          transition: 'all var(--transition)', flexShrink: 0,
        }}
      >{confirming ? 'Confirm delete' : 'Delete'}</button>
    </div>
  )
}

// ── Create move form (inline inside picker) ───────────────────────────────────
function CreateMoveForm({ clubId, positions, selectedPos, onCreated, onCancel }) {
  const [name, setName]         = useState('')
  const [fromPos, setFromPos]   = useState(selectedPos || '')
  const [toPos, setToPos]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  const handleSubmit = async () => {
    if (!name.trim() || !fromPos || !toPos) {
      setError('Name, from position and to position are all required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const fromPosition = positions.find(p => p.slug === fromPos)
      const toPosition   = positions.find(p => p.slug === toPos)
      if (!fromPosition || !toPosition) {
        setError('Invalid positions selected.')
        setSaving(false)
        return
      }
      const created = await createClubMove(
        clubId,
        name.trim(),
        fromPosition.id,
        toPosition.id,
      )
      onCreated(created)
    } catch (e) {
      setError('Failed to create move.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--move-color)',
      borderRadius: 'var(--radius-md)', padding: '10px 12px', marginTop: 8,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--move-color)', marginBottom: 8,
      }}>New Club Move</div>

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
          width: '100%', padding: '7px 10px', fontSize: 12,
          fontFamily: 'var(--font-body)', background: 'var(--bg-subtle)',
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)', outline: 'none', marginBottom: 6,
        }}
      />

      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 10, color: 'var(--text-muted)', marginBottom: 3,
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>From</div>
          <select
            value={fromPos}
            onChange={e => setFromPos(e.target.value)}
            style={{
              width: '100%', padding: '6px 8px', fontSize: 12,
              fontFamily: 'var(--font-body)', background: 'var(--bg-subtle)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)', outline: 'none',
            }}
          >
            <option value="">Select…</option>
            {positions.map(p => (
              <option key={p.id} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 10, color: 'var(--text-muted)', marginBottom: 3,
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>To</div>
          <select
            value={toPos}
            onChange={e => setToPos(e.target.value)}
            style={{
              width: '100%', padding: '6px 8px', fontSize: 12,
              fontFamily: 'var(--font-body)', background: 'var(--bg-subtle)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)', outline: 'none',
            }}
          >
            <option value="">Select…</option>
            {positions.map(p => (
              <option key={p.id} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            padding: '6px 14px', fontSize: 11, fontWeight: 600,
            borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'var(--move-color)', color: 'white',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)', opacity: saving ? 0.6 : 1,
          }}
        >{saving ? 'Creating…' : 'Create move'}</button>
        <button
          onClick={onCancel}
          style={{
            padding: '6px 10px', fontSize: 11,
            borderRadius: 'var(--radius-sm)',
            border: '0.5px solid var(--border)', background: 'var(--bg-subtle)',
            color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >Cancel</button>
      </div>
    </div>
  )
}

// ── Move Picker ───────────────────────────────────────────────────────────────
function MovePicker({ existingMoveIds, onAdd, autoPositionSlug = null, clubId }) {
  const [positions, setPositions]       = useState([])
  const [selectedPos, setSelectedPos]   = useState(autoPositionSlug)
  const [moves, setMoves]               = useState([])
  const [loadingMoves, setLoadingMoves] = useState(false)
  const [creatingMove, setCreatingMove] = useState(false)

  useEffect(() => {
    getPositions().then(setPositions).catch(console.error)
  }, [])

  useEffect(() => {
    if (autoPositionSlug) setSelectedPos(autoPositionSlug)
  }, [autoPositionSlug])

  useEffect(() => {
    if (!selectedPos) { setMoves([]); return }
    setLoadingMoves(true)
    getMovesFromPosition(selectedPos)
      .then(data => setMoves(data.moves || []))
      .catch(console.error)
      .finally(() => setLoadingMoves(false))
  }, [selectedPos])

  const available = moves.filter(m => !existingMoveIds.has(m.id))

  const handleMoveCreated = async (newMove) => {
    setCreatingMove(false)
    // Refresh moves for current position
    if (selectedPos) {
      const data = await getMovesFromPosition(selectedPos)
      setMoves(data.moves || [])
    }
    // Auto-add the new move to the chain
    onAdd(newMove.id)
  }

  return (
    <div style={{
      background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '10px 12px', marginTop: 8,
    }}>
      {autoPositionSlug && !creatingMove && (
        <div style={{
          fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic',
        }}>
          Showing moves from the last position. Pick a different position to override.
        </div>
      )}

      {!creatingMove && (
        <>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {positions.map(pos => (
              <button
                key={pos.slug}
                onClick={() => setSelectedPos(pos.slug === selectedPos ? null : pos.slug)}
                style={{
                  padding: '3px 8px', fontSize: 10, fontWeight: 500,
                  borderRadius: 'var(--radius-sm)',
                  border: `0.5px solid ${selectedPos === pos.slug ? 'var(--move-color)' : 'var(--border)'}`,
                  background: selectedPos === pos.slug ? 'var(--move-soft)' : 'var(--bg-surface)',
                  color: selectedPos === pos.slug ? 'var(--move-color)' : 'var(--text-muted)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}
              >{pos.name}</button>
            ))}
          </div>

          {selectedPos && (
            loadingMoves ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}>Loading…</div>
            ) : available.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}>
                {moves.length === 0 ? 'No moves from this position' : 'All moves already added'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
                {available.map(move => {
                  const tc = moveTypeColor(move)
                  const tt = moveType(move)
                  return (
                    <button
                      key={move.id}
                      onClick={() => onAdd(move.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 10px', background: 'var(--bg-surface)',
                        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                        textAlign: 'left', width: '100%',
                        transition: 'border-color var(--transition)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {move.name}
                        </span>
                        {tt !== 'global' && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, color: tc,
                            background: `${tc}18`, border: `0.5px solid ${tc}44`,
                            borderRadius: 3, padding: '1px 4px',
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                          }}>{tt === 'club' ? 'Club' : 'Mine'}</span>
                        )}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--move-color)', fontWeight: 600, flexShrink: 0 }}>
                        + Add
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          )}

          {/* Create club move button */}
          {clubId && (
            <button
              onClick={() => setCreatingMove(true)}
              style={{
                padding: '5px 10px', fontSize: 11, fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: '0.5px solid var(--move-color)',
                background: 'var(--move-soft)', color: 'var(--move-color)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                transition: 'all var(--transition)',
              }}
            >+ Create club move</button>
          )}
        </>
      )}

      {creatingMove && (
        <CreateMoveForm
          clubId={clubId}
          positions={positions}
          selectedPos={selectedPos}
          onCreated={handleMoveCreated}
          onCancel={() => setCreatingMove(false)}
        />
      )}
    </div>
  )
}

// ── Chain card within curriculum detail ───────────────────────────────────────
function ChainCard({ chain, onAddMove, onRemoveMove, onDeleteChain, clubId }) {
  const [picking, setPicking]       = useState(false)
  const [confirming, setConfirming] = useState(false)

  const existingIds      = new Set()
  const lastMove         = chain.moves.length > 0 ? chain.moves[chain.moves.length - 1] : null
  const nextPositionSlug = lastMove?.to_position?.slug || null

  const handleDeleteChain = () => {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    onDeleteChain(chain.id)
  }

  const handleAddMove = async (moveId) => {
    await onAddMove(chain.id, moveId)
  }

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 10,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 10,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {chain.name}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setPicking(!picking)}
            style={{
              padding: '3px 8px', fontSize: 11, fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: `0.5px solid ${picking ? 'var(--move-color)' : 'var(--border)'}`,
              background: picking ? 'var(--move-soft)' : 'var(--bg-subtle)',
              color: picking ? 'var(--move-color)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'all var(--transition)',
            }}
          >{picking ? 'Done' : '+ Move'}</button>
          <button
            onClick={handleDeleteChain}
            style={{
              padding: '3px 8px', fontSize: 11, fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: `0.5px solid ${confirming ? 'var(--accent)' : 'var(--border)'}`,
              background: confirming ? 'var(--accent-soft)' : 'var(--bg-subtle)',
              color: confirming ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'all var(--transition)',
            }}
          >{confirming ? 'Confirm' : 'Delete'}</button>
        </div>
      </div>

      {/* Chain flow */}
      {chain.moves.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No moves yet — add some below
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 0, flexWrap: 'wrap',
          marginBottom: picking ? 12 : 0,
        }}>
          {chain.moves.map((move, i) => {
            const tc = moveTypeColor(move)
            const tt = moveType(move)
            return (
              <div key={`${move.id}-${i}`} style={{ display: 'flex', alignItems: 'center' }}>
                {i === 0 && move.from_position && (
                  <>
                    <div style={{
                      fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
                      padding: '3px 6px', background: 'var(--bg-subtle)',
                      border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      marginRight: 4, whiteSpace: 'nowrap',
                    }}>{move.from_position.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 4px' }}>→</div>
                  </>
                )}

                <div
                  title={move.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: `${tc}12`,
                    border: `1.5px solid ${tc}`,
                    borderRadius: 'var(--radius-sm)', padding: '5px 10px',
                    fontSize: 12, fontWeight: 500, color: tc,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {truncateName(move.name)}
                  {tt !== 'global' && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: tc,
                      background: `${tc}20`, border: `0.5px solid ${tc}44`,
                      borderRadius: 3, padding: '1px 4px',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>{tt === 'club' ? 'C' : 'P'}</span>
                  )}
                  <button
                    onClick={() => onRemoveMove(chain.id, move.id)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      fontSize: 10, cursor: 'pointer', padding: 0, lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >✕</button>
                </div>

                {move.to_position && (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 4px' }}>→</div>
                    {i === chain.moves.length - 1 && (
                      <div style={{
                        fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
                        padding: '3px 6px', background: 'var(--bg-subtle)',
                        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        whiteSpace: 'nowrap',
                      }}>{move.to_position.name}</div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {picking && (
        <MovePicker
          existingMoveIds={existingIds}
          onAdd={handleAddMove}
          autoPositionSlug={nextPositionSlug}
          clubId={clubId}
        />
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyCurricula() {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600,
        color: 'var(--text-primary)', marginBottom: 6,
      }}>No curricula yet</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Create a curriculum to build chains and track squad progress.
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CurriculaPage() {
  const [curricula, setCurricula]       = useState([])
  const [selected, setSelected]         = useState(null)
  const [club, setClub]                 = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [creating, setCreating]         = useState(false)
  const [newName, setNewName]           = useState('')
  const [addingChain, setAddingChain]   = useState(false)
  const [newChainName, setNewChainName] = useState('')

  useEffect(() => {
    Promise.all([getCurricula(), getMyClub()])
      .then(([currList, clubData]) => {
        setCurricula(currList)
        setClub(clubData)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (id) => {
    try {
      const data = await getCurriculum(id)
      setSelected(data)
    } catch (err) { setError(err.message) }
  }

  const reload = async () => {
    if (!selected) return
    const data = await getCurriculum(selected.id)
    setSelected(data)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const created = await createCurriculum(newName.trim())
      setCurricula(prev => [created, ...prev])
      setNewName('')
      setCreating(false)
      handleSelect(created.id)
    } catch (err) { setError(err.message) }
  }

  const handleDelete = async (id) => {
    try {
      await deleteCurriculum(id)
      setCurricula(prev => prev.filter(c => c.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (err) { setError(err.message) }
  }

  const handleAddChain = async () => {
    if (!newChainName.trim() || !selected) return
    try {
      await addCurriculumChain(selected.id, newChainName.trim())
      setNewChainName('')
      setAddingChain(false)
      await reload()
    } catch (err) { setError(err.message) }
  }

  const handleDeleteChain = async (chainId) => {
    if (!selected) return
    try {
      await deleteCurriculumChain(selected.id, chainId)
      await reload()
    } catch (err) { setError(err.message) }
  }

  const handleAddMove = async (chainId, moveId) => {
    if (!selected) return
    try {
      await addMoveToChain(selected.id, chainId, moveId)
      await reload()
    } catch (err) { setError(err.message) }
  }

  const handleRemoveMove = async (chainId, moveId) => {
    if (!selected) return
    try {
      await removeMoveFromChain(selected.id, chainId, moveId)
      await reload()
    } catch (err) { setError(err.message) }
  }

  if (loading) return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height: 52, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
            animation: 'pulse 1.4s ease infinite', animationDelay: `${i * 0.1}s`,
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
        }}>Coach Tools</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
          letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0,
        }}>Curricula</h1>
      </div>

      {error && (
        <div style={{
          background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px',
          fontSize: 13, color: 'var(--accent)', marginBottom: 20,
        }}>{error}</div>
      )}

      {selected && (
        <button
          onClick={() => setSelected(null)}
          style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-body)', padding: '0 0 16px',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >← All curricula</button>
      )}

      {!selected ? (
        <>
          {creating ? (
            <div style={{
              background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '14px 16px',
              marginBottom: 16, display: 'flex', gap: 8,
            }}>
              <input
                autoFocus value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Curriculum name…"
                style={{
                  flex: 1, padding: '8px 12px', fontSize: 13,
                  fontFamily: 'var(--font-body)', background: 'var(--bg-subtle)',
                  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', outline: 'none',
                }}
              />
              <button onClick={handleCreate} style={{
                padding: '8px 16px', fontSize: 12, fontWeight: 600,
                borderRadius: 'var(--radius-md)', border: 'none',
                background: 'var(--accent)', color: 'white',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}>Create</button>
              <button onClick={() => { setCreating(false); setNewName('') }} style={{
                padding: '8px 12px', fontSize: 12, borderRadius: 'var(--radius-md)',
                border: '0.5px solid var(--border)', background: 'var(--bg-subtle)',
                color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setCreating(true)} style={{
              padding: '10px 18px', fontSize: 12, fontWeight: 600,
              borderRadius: 'var(--radius-md)', border: 'none',
              background: 'var(--accent)', color: 'white',
              cursor: 'pointer', fontFamily: 'var(--font-body)', marginBottom: 20,
            }}>+ New Curriculum</button>
          )}

          <SectionLabel count={curricula.length}>Your Curricula</SectionLabel>
          {curricula.length === 0 ? <EmptyCurricula /> : (
            curricula.map(c => (
              <CurriculumCard key={c.id} curriculum={c} onSelect={handleSelect} onDelete={handleDelete} />
            ))
          )}
        </>
      ) : (
        <>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
              color: 'var(--text-primary)', margin: '0 0 4px',
            }}>{selected.name}</h2>
            {selected.description && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selected.description}</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {addingChain ? (
              <>
                <input
                  autoFocus value={newChainName}
                  onChange={e => setNewChainName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddChain()}
                  placeholder="Chain name…"
                  style={{
                    flex: 1, padding: '8px 12px', fontSize: 13,
                    fontFamily: 'var(--font-body)', background: 'var(--bg-subtle)',
                    border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)', outline: 'none',
                  }}
                />
                <button onClick={handleAddChain} style={{
                  padding: '8px 14px', fontSize: 12, fontWeight: 600,
                  borderRadius: 'var(--radius-md)', border: 'none',
                  background: 'var(--move-color)', color: 'white',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>Add</button>
                <button onClick={() => { setAddingChain(false); setNewChainName('') }} style={{
                  padding: '8px 12px', fontSize: 12, borderRadius: 'var(--radius-md)',
                  border: '0.5px solid var(--border)', background: 'var(--bg-subtle)',
                  color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setAddingChain(true)} style={{
                padding: '8px 14px', fontSize: 12, fontWeight: 600,
                borderRadius: 'var(--radius-md)', border: 'none',
                background: 'var(--move-color)', color: 'white',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}>+ Add Chain</button>
            )}
          </div>

          <SectionLabel count={selected.chains?.length || 0}>Chains</SectionLabel>

          {(selected.chains?.length || 0) === 0 ? (
            <div style={{
              padding: '20px', textAlign: 'center', fontSize: 13,
              color: 'var(--text-muted)', background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
            }}>No chains yet. Add one above.</div>
          ) : (
            selected.chains.map(chain => (
              <ChainCard
                key={chain.id}
                chain={chain}
                onAddMove={handleAddMove}
                onRemoveMove={handleRemoveMove}
                onDeleteChain={handleDeleteChain}
                clubId={club?.id}
              />
            ))
          )}
        </>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}