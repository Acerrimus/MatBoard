import { supabase } from './supabase'

const BASE_URL = 'http://localhost:8000'

async function request(path) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  })

  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const getPositions         = ()     => request('/positions')
export const getPosition          = (slug) => request(`/positions/${slug}`)
export const getMovesFromPosition = (slug) => request(`/positions/${slug}/moves`)
export const getMove              = (slug) => request(`/moves/${slug}`)