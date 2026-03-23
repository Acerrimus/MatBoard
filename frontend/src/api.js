// frontend/src/api.js

import { supabase } from './supabase'

const BASE_URL = import.meta.env.DEV
  ? 'http://localhost:8000'
  : 'https://matboard.onrender.com'

// ── Base fetch helpers ────────────────────────────────────────────────────────
async function buildHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = { 'Content-Type': 'application/json' }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  return headers
}

function withTimeout(ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, clear: () => clearTimeout(timer) }
}

async function request(path) {
  const { signal, clear } = withTimeout(15000)
  try {
    const headers = await buildHeaders()
    const res = await fetch(`${BASE_URL}${path}`, { headers, signal })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  } finally {
    clear()
  }
}

async function requestPost(path, body) {
  const { signal, clear } = withTimeout(15000)
  try {
    const headers = await buildHeaders()
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST', headers, body: JSON.stringify(body), signal,
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  } finally {
    clear()
  }
}

async function requestPatch(path, body) {
  const { signal, clear } = withTimeout(15000)
  try {
    const headers = await buildHeaders()
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH', headers, body: JSON.stringify(body), signal,
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  } finally {
    clear()
  }
}

async function requestPut(path, body) {
  const { signal, clear } = withTimeout(15000)
  try {
    const headers = await buildHeaders()
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT', headers, body: JSON.stringify(body), signal,
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  } finally {
    clear()
  }
}

async function requestDelete(path) {
  const { signal, clear } = withTimeout(15000)
  try {
    const headers = await buildHeaders()
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE', headers, signal,
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  } finally {
    clear()
  }
}

// ── Positions & moves ─────────────────────────────────────────────────────────
export const getPositions         = ()     => request('/positions/')
export const getPosition          = (slug) => request(`/positions/${slug}`)
export const getMovesFromPosition = (slug) => request(`/positions/${slug}/moves`)
export const getMove              = (slug) => request(`/moves/${slug}`)

// ── Progress ──────────────────────────────────────────────────────────────────
export const getMyProgress        = ()                                        => request('/progress/')
export const getProgressForMove   = (moveId)                                  => request(`/progress/${moveId}`)
export const upsertProgress       = (moveId, confidence, isFavourite = false) => requestPost('/progress/', { move_id: moveId, confidence, is_favourite: isFavourite })
export const deleteProgress       = (moveId)                                  => requestDelete(`/progress/${moveId}`)

// ── Profiles ──────────────────────────────────────────────────────────────────
export const setMyRole            = (role) => requestPatch('/profiles/me/role', { role })
export const skipClubSetup        = ()     => requestPatch('/profiles/me/skip-club-setup', {})

// ── Clubs ─────────────────────────────────────────────────────────────────────
export const createClub           = (name)                       => requestPost('/clubs/', { name })
export const joinClub             = (invite_code)                => requestPost('/clubs/join', { invite_code })
export const getMyClub            = ()                           => request('/clubs/mine')
export const getClubMembers       = (clubId)                     => request(`/clubs/${clubId}/members`)
export const getClubRoster        = (clubId)                     => request(`/clubs/${clubId}/roster`)
export const updateMemberRole     = (clubId, userId, role)       => requestPatch(`/clubs/${clubId}/members/${userId}/role`, { role })

// ── Board ─────────────────────────────────────────────────────────────────────
export const getMyBoard           = ()        => request('/board/')
export const addToBoard           = (moveId)  => requestPost('/board/', { move_id: moveId })
export const removeFromBoard      = (moveId)  => requestDelete(`/board/${moveId}`)

// ── Chains ────────────────────────────────────────────────────────────────────
export const getMyChains          = ()                        => request('/chains/')
export const createChain          = (name)                    => requestPost('/chains/', { name })
export const renameChain          = (chainId, name)           => requestPatch(`/chains/${chainId}/rename`, { name })
export const setChainMoves        = (chainId, moveIds)        => requestPut(`/chains/${chainId}/moves`, { move_ids: moveIds })
export const deleteChain          = (chainId)                 => requestDelete(`/chains/${chainId}`)

// ── Graph ─────────────────────────────────────────────────────────────────────
export const getGraph             = () => request('/graph/')

