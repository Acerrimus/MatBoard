import { supabase } from './supabase'

const BASE_URL = import.meta.env.DEV
  ? 'http://localhost:8000'
  : 'https://matboard.onrender.com'

async function request(path) {
  const isDev = import.meta.env.DEV

  let headers = { 'Content-Type': 'application/json' }

  if (!isDev) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, { headers })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const getPositions         = ()     => request('/positions')
export const getPosition          = (slug) => request(`/positions/${slug}`)
export const getMovesFromPosition = (slug) => request(`/positions/${slug}/moves`)
export const getMove              = (slug) => request(`/moves/${slug}`)