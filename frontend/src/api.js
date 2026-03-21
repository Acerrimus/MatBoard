import { supabase } from './supabase'

const BASE_URL = import.meta.env.DEV
  ? 'http://localhost:8000'
  : 'https://matboard.onrender.com'

// ── Base fetch ────────────────────────────────────────────────────────────────
async function buildHeaders() {
  const isDev = import.meta.env.DEV
  const headers = { 'Content-Type': 'application/json' }
  if (!isDev) {
    const { data: { session } } = await supabase.auth.getSession()
    headers['Authorization'] = `Bearer ${session?.access_token}`
  }
  return headers
}

async function request(path) {
  const headers = await buildHeaders()
  const res = await fetch(`${BASE_URL}${path}`, { headers })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function requestPost(path, body) {
  const headers = await buildHeaders()
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function requestDelete(path) {
  const headers = await buildHeaders()
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

// ── Endpoints ─────────────────────────────────────────────────────────────────
export const getPositions           = ()        => request('/positions/')
export const getPosition            = (slug)    => request(`/positions/${slug}`)
export const getMovesFromPosition   = (slug)    => request(`/positions/${slug}/moves`)
export const getMove                = (slug)    => request(`/moves/${slug}`)

export const getMyProgress          = ()        => request('/progress/')
export const getProgressForMove     = (moveId)  => request(`/progress/${moveId}`)
export const upsertProgress         = (moveId, confidence, isFavourite = false) =>
  requestPost('/progress/', { move_id: moveId, confidence, is_favourite: isFavourite })
export const deleteProgress         = (moveId)  => requestDelete(`/progress/${moveId}`)