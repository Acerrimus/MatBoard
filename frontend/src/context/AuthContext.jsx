import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)
const PROFILE_TIMEOUT_MS = 5000

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ])
}

export function AuthProvider({ children }) {
  const [user, setUser]                 = useState(null)
  const [session, setSession]           = useState(null)
  const [profile, setProfile]           = useState(undefined)
  const [profileError, setProfileError] = useState(false)
  const [loading, setLoading]           = useState(true)
  const initialised                     = useRef(false)

  const fetchProfile = useCallback(async (userId, { silent = false } = {}) => {
    if (!userId) { setProfile(null); return }

    // Only reset to undefined (shows LoadingScreen) when this is NOT a
    // silent background refresh — e.g. token refresh on tab focus.
    // A silent fetch updates profile in place without unmounting the page.
    if (!silent) {
      setProfile(undefined)
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await withTimeout(
          supabase.from('profiles').select('*').eq('id', userId).single(),
          PROFILE_TIMEOUT_MS
        )
        if (error && error.code !== 'PGRST116') throw error
        setProfile(data ?? null)
        setProfileError(false)
        return
      } catch (err) {
        console.warn(`Profile fetch attempt ${attempt} failed:`, err.message)
        if (attempt === 3) {
          setProfileError(true)
          // On a silent refresh failure, don't wipe the profile the user
          // already has — they're still authenticated, just keep what we have.
          if (!silent) setProfile(null)
        } else {
          await new Promise(r => setTimeout(r, 1000 * attempt))
        }
      }
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id, { silent: true })
  }, [user, fetchProfile])

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          PROFILE_TIMEOUT_MS
        )
        if (error) throw error
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          // Initial load — not silent, show LoadingScreen until profile resolves
          await fetchProfile(session.user.id, { silent: false })
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Auth init failed:', err.message)
        setSession(null)
        setUser(null)
        setProfile(null)
        setProfileError(true)
      } finally {
        initialised.current = true
        setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!initialised.current) return

        setSession(session)
        setUser(session?.user ?? null)

        if (event === 'SIGNED_OUT') {
          // Explicit sign-out — clear everything
          setProfile(null)
          setProfileError(false)
          return
        }

        if (event === 'TOKEN_REFRESHED') {
          // Token refresh on tab focus — user is still the same person,
          // profile hasn't changed. Do nothing.
          return
        }

        if (session?.user) {
          // SIGNED_IN or USER_UPDATED — fetch profile.
          // silent = true because the user may already be on a page
          // (e.g. navigating between tabs in the same session).
          await fetchProfile(session.user.id, { silent: true })
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  const signInWithEmail = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email, password, name) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{
      user, session, profile, setProfile,
      loading, profileError, refreshProfile,
      signInWithGoogle, signInWithEmail, signUp, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)