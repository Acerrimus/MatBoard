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
} from '../api'
import { confidenceColor, confidenceBg } from '../components/MoveCard'

// ── Shared components ─────────────────────────────────────────────────────────

function SectionLabel({ children, count }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
      }}>
        {children}
      </div>
      {count !== undefined && (
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-muted)',
          background: 'var(--bg-subtle)',
          border: '0.5px solid var(--border)',
          borderRadius: 20,
          padding: '1px 7px',
        }}>
          {count}
        </div>
      )}
    </div>
  )
}

// ── Curriculum list card ──────────────────────────────────────────────────────

function CurriculumCard({ curriculum, onSelect, onDelete }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderLeft: '3px solid var(--move-color)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      marginBottom: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      transition: 'border-color var(--transition)',
    }}
      onClick={() => onSelect(curriculum.id)}
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
        onClick={(e) => { e.stopPropagation(); onDelete(curriculum.id) }}
        style={{
          background: 'var(--bg-subtle)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 10px',
          fontSize: 11,
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}
      >
        Delete
      </button>
    </div>
  )
}

// ── Chain card within curriculum detail ────────────────────────────────────────

function ChainCard({ chain, curriculumId, onAddMove, onRemoveMove, onDeleteChain }) {
  const [picking, setPicking] = useState(false)

  const existingIds = new Set(chain.moves.map(m => m.id))

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      marginBottom: 10,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {chain.name}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setPicking(!picking)}
            style={{
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: `0.5px solid ${picking ? 'var(--move-color)' : 'var(--border)'}`,
              background: picking ? 'var(--move-soft)' : 'var(--bg-subtle)',
              color: picking ? 'var(--move-color)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {picking ? 'Done' : '+ Move'}
          </button>
          <button
            onClick={() => onDeleteChain(chain.id)}
            style={{
              padding: '3px 8px',
              fontSize: 11,
              borderRadius: 'var(--radius-sm)',
              border: '0.5px solid var(--border)',
              background: 'var(--bg-subtle)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Chain moves as flow */}
      {chain.moves.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No moves yet — add some below
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', marginBottom: picking ? 12 : 0 }}>
          {chain.moves.map((move, i) => (
            <div key={move.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--move-soft)',
                border: '1.5px solid var(--move-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-move)',
                whiteSpace: 'nowrap',
              }}>
                {move.name}
                <button
                  onClick={() => onRemoveMove(chain.id, move.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 10,
                    cursor: 'pointer',
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
              {i < chain.moves.length - 1 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 4px', flexShrink: 0 }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Inline move picker */}
      {picking && (
        <MovePicker
          existingMoveIds={existingIds}
          onAdd={(moveId) => onAddMove(chain.id, moveId)}
        />
      )}
    </div>
  )
}

// ── Move picker ───────────────────────────────────────────────────────────────

function MovePicker({ existingMoveIds, onAdd }) {
  const [positions, setPositions] = useState([])
  const [selectedPos, setSelectedPos] = useState(null)
  const [moves, setMoves] = useState([])
  const [loadingMoves, setLoadingMoves] = useState(false)

  useEffect(() => {
    getPositions().then(setPositions).catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedPos) { setMoves([]); return }
    setLoadingMoves(true)
    getMovesFromPosition(selectedPos)
      .then(data => setMoves(data.moves || []))
      .catch(console.error)
      .finally(() => setLoadingMoves(false))
  }, [selectedPos])

  const available = moves.filter(m => !existingMoveIds.has(m.id))

  return (
    <div style={{
      background: 'var(--bg-subtle)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
      marginTop: 8,
    }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {positions.map(pos => (
          <button
            key={pos.slug}
            onClick={() => setSelectedPos(pos.slug === selectedPos ? null : pos.slug)}
            style={{
              padding: '3px 8px',
              fontSize: 10,
              fontWeight: 500,
              borderRadius: 'var(--radius-sm)',
              border: `0.5px solid ${selectedPos === pos.slug ? 'var(--move-color)' : 'var(--border)'}`,
              background: selectedPos === pos.slug ? 'var(--move-soft)' : 'var(--bg-surface)',
              color: selectedPos === pos.slug ? 'var(--move-color)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {pos.name}
          </button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {available.map(move => (
              <button
                key={move.id}
                onClick={() => onAdd(move.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'var(--bg-surface)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {move.name}
                </span>
                <span style={{ fontSize: 10, color: 'var(--move-color)', fontWeight: 600 }}>
                  + Add
                </span>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CurriculaPage() {
  const [curricula, setCurricula] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [addingChain, setAddingChain] = useState(false)
  const [newChainName, setNewChainName] = useState('')

  useEffect(() => {
    getCurricula()
      .then(setCurricula)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (id) => {
    try {
      const data = await getCurriculum(id)
      setSelected(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const reload = async () => {
    if (selected) {
      const data = await getCurriculum(selected.id)
      setSelected(data)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const created = await createCurriculum(newName.trim())
      setCurricula(prev => [created, ...prev])
      setNewName('')
      setCreating(false)
      handleSelect(created.id)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteCurriculum(id)
      setCurricula(prev => prev.filter(c => c.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddChain = async () => {
    if (!newChainName.trim() || !selected) return
    try {
      await addCurriculumChain(selected.id, newChainName.trim())
      setNewChainName('')
      setAddingChain(false)
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteChain = async (chainId) => {
    if (!selected) return
    try {
      await deleteCurriculumChain(selected.id, chainId)
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddMove = async (chainId, moveId) => {
    if (!selected) return
    try {
      await addMoveToChain(selected.id, chainId, moveId)
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRemoveMove = async (chainId, moveId) => {
    if (!selected) return
    try {
      await removeMoveFromChain(selected.id, chainId, moveId)
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 52,
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              animation: 'pulse 1.4s ease infinite',
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4,
        }}>
          Coach Tools
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
          letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0,
        }}>
          Curricula
        </h1>
      </div>

      {error && (
        <div style={{
          background: 'var(--accent-soft)', border: '0.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 13,
          color: 'var(--accent)', marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {selected && (
        <button
          onClick={() => setSelected(null)}
          style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
            padding: '0 0 12px', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          ← All curricula
        </button>
      )}

      {!selected ? (
        <>
          {/* Create form */}
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
                  flex: 1, padding: '8px 12px', fontSize: 13, fontFamily: 'var(--font-body)',
                  background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none',
                }}
              />
              <button onClick={handleCreate} style={{
                padding: '8px 16px', fontSize: 12, fontWeight: 600,
                borderRadius: 'var(--radius-md)', border: 'none',
                background: 'var(--accent)', color: 'white', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
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
              background: 'var(--accent)', color: 'white', cursor: 'pointer',
              fontFamily: 'var(--font-body)', marginBottom: 20,
            }}>+ New Curriculum</button>
          )}

          <SectionLabel count={curricula.length}>Your Curricula</SectionLabel>

          {curricula.length === 0 ? (
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
          ) : (
            curricula.map(c => (
              <CurriculumCard key={c.id} curriculum={c} onSelect={handleSelect} onDelete={handleDelete} />
            ))
          )}
        </>
      ) : (
        <>
          {/* Detail view */}
          <div style={{ marginBottom: 20 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
              color: 'var(--text-primary)', margin: '0 0 4px',
            }}>{selected.name}</h2>
            {selected.description && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selected.description}</div>
            )}
          </div>

          {/* Add chain */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {addingChain ? (
              <>
                <input
                  autoFocus value={newChainName}
                  onChange={e => setNewChainName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddChain()}
                  placeholder="Chain name…"
                  style={{
                    flex: 1, padding: '8px 12px', fontSize: 13, fontFamily: 'var(--font-body)',
                    background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none',
                  }}
                />
                <button onClick={handleAddChain} style={{
                  padding: '8px 14px', fontSize: 12, fontWeight: 600,
                  borderRadius: 'var(--radius-md)', border: 'none',
                  background: 'var(--move-color)', color: 'white', cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
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
                background: 'var(--move-color)', color: 'white', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}>+ Add Chain</button>
            )}
          </div>

          <SectionLabel count={selected.chains?.length || 0}>Chains</SectionLabel>

          {(selected.chains?.length || 0) === 0 ? (
            <div style={{
              padding: '20px', textAlign: 'center', fontSize: 13,
              color: 'var(--text-muted)', background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
            }}>
              No chains yet. Add one above.
            </div>
          ) : (
            selected.chains.map(chain => (
              <ChainCard
                key={chain.id}
                chain={chain}
                curriculumId={selected.id}
                onAddMove={handleAddMove}
                onRemoveMove={handleRemoveMove}
                onDeleteChain={handleDeleteChain}
              />
            ))
          )}
        </>
      )}
    </div>
  )
}