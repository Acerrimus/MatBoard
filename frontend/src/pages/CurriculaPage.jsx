import { useState, useEffect } from 'react'
import {
  getCurricula,
  getCurriculum,
  createCurriculum,
  deleteCurriculum,
  addCurriculumItem,
  removeCurriculumItem,
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
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
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
          transition: 'all var(--transition)',
        }}
      >
        Delete
      </button>
    </div>
  )
}

// ── Move item in curriculum ───────────────────────────────────────────────────

function CurriculumMoveRow({ item, onRemove }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      marginBottom: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--move-soft)',
          border: '0.5px solid var(--move-color)',
          color: 'var(--move-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          flexShrink: 0,
        }}>
          {item.position + 1}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {item.move?.name || 'Unknown move'}
          </div>
          {item.notes && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              {item.notes}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={() => onRemove(item.move_id)}
        style={{
          background: 'var(--bg-subtle)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 8px',
          fontSize: 11,
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}
      >
        ✕
      </button>
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
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: 10,
      }}>
        Add moves
      </div>

      {/* Position selector */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {positions.map(pos => (
          <button
            key={pos.slug}
            onClick={() => setSelectedPos(pos.slug === selectedPos ? null : pos.slug)}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 500,
              borderRadius: 'var(--radius-sm)',
              border: `0.5px solid ${selectedPos === pos.slug ? 'var(--move-color)' : 'var(--border)'}`,
              background: selectedPos === pos.slug ? 'var(--move-soft)' : 'var(--bg-subtle)',
              color: selectedPos === pos.slug ? 'var(--move-color)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all var(--transition)',
            }}
          >
            {pos.name}
          </button>
        ))}
      </div>

      {/* Move list */}
      {selectedPos && (
        loadingMoves ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Loading…</div>
        ) : available.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
            {moves.length === 0 ? 'No moves from this position' : 'All moves already added'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {available.map(move => (
              <button
                key={move.id}
                onClick={() => onAdd(move.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-subtle)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'all var(--transition)',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {move.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--move-color)', fontWeight: 600 }}>
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
  const [selected, setSelected] = useState(null) // full curriculum with items
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  // Load list
  useEffect(() => {
    getCurricula()
      .then(setCurricula)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Select a curriculum
  const handleSelect = async (id) => {
    try {
      const data = await getCurriculum(id)
      setSelected(data)
    } catch (err) {
      setError(err.message)
    }
  }

  // Create
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

  // Delete
  const handleDelete = async (id) => {
    try {
      await deleteCurriculum(id)
      setCurricula(prev => prev.filter(c => c.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (err) {
      setError(err.message)
    }
  }

  // Add move
  const handleAddMove = async (moveId) => {
    if (!selected) return
    const position = selected.items?.length || 0
    try {
      await addCurriculumItem(selected.id, moveId, position)
      const updated = await getCurriculum(selected.id)
      setSelected(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  // Remove move
  const handleRemoveMove = async (moveId) => {
    if (!selected) return
    try {
      await removeCurriculumItem(selected.id, moveId)
      const updated = await getCurriculum(selected.id)
      setSelected(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  const existingMoveIds = new Set((selected?.items || []).map(i => i.move_id))

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
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.4; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 4,
        }}>
          Coach Tools
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '-0.5px',
          color: 'var(--text-primary)',
          margin: 0,
        }}>
          Curricula
        </h1>
      </div>

      {error && (
        <div style={{
          background: 'var(--accent-soft)',
          border: '0.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          fontSize: 13,
          color: 'var(--accent)',
          marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {/* Back button when viewing a curriculum */}
      {selected && (
        <button
          onClick={() => setSelected(null)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            padding: '0 0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ← All curricula
        </button>
      )}

      {!selected ? (
        <>
          {/* Create button / form */}
          {creating ? (
            <div style={{
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              marginBottom: 16,
              display: 'flex',
              gap: 8,
            }}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Curriculum name…"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: 13,
                  fontFamily: 'var(--font-body)',
                  background: 'var(--bg-subtle)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleCreate}
                style={{
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'white',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Create
              </button>
              <button
                onClick={() => { setCreating(false); setNewName('') }}
                style={{
                  padding: '8px 12px',
                  fontSize: 12,
                  borderRadius: 'var(--radius-md)',
                  border: '0.5px solid var(--border)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              style={{
                padding: '10px 18px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--accent)',
                color: 'white',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                marginBottom: 20,
              }}
            >
              + New Curriculum
            </button>
          )}

          {/* List */}
          <SectionLabel count={curricula.length}>Your Curricula</SectionLabel>

          {curricula.length === 0 ? (
            <div style={{
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '40px 24px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 6,
              }}>
                No curricula yet
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Create a curriculum to group moves and track your squad's progress against it.
              </div>
            </div>
          ) : (
            curricula.map(c => (
              <CurriculumCard
                key={c.id}
                curriculum={c}
                onSelect={handleSelect}
                onDelete={handleDelete}
              />
            ))
          )}
        </>
      ) : (
        <>
          {/* Curriculum detail */}
          <div style={{ marginBottom: 20 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 4px',
            }}>
              {selected.name}
            </h2>
            {selected.description && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {selected.description}
              </div>
            )}
          </div>

          {/* Items */}
          <SectionLabel count={selected.items?.length || 0}>Moves in Curriculum</SectionLabel>

          {(selected.items?.length || 0) === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--text-muted)',
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 20,
            }}>
              No moves added yet. Use the picker below.
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              {selected.items.map(item => (
                <CurriculumMoveRow
                  key={item.move_id}
                  item={item}
                  onRemove={handleRemoveMove}
                />
              ))}
            </div>
          )}

          {/* Move picker */}
          <MovePicker
            existingMoveIds={existingMoveIds}
            onAdd={handleAddMove}
          />
        </>
      )}
    </div>
  )
}