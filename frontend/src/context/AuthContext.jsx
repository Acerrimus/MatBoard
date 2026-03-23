import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

// How long to wait on profile fetch before giving up
const PROFILE_TIMEOUT_MS = 8000

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ])
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(undefined)
  const [loading, setLoading] = useState(true)

  // Prevent the auth state change handler from stomping on init
  const initialised = useRef(false)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        PROFILE_TIMEOUT_MS
      )

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error)
        // Fail open — treat as no profile rather than stuck loading
        // User will be sent to onboarding which is recoverable
        setProfile(null)
        return
      }

      setProfile(data ?? null)
    } catch (err) {
      console.error('Profile fetch failed:', err.message)
      // Timeout or network error — fail open, don't leave user stuck
      setProfile(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
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
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Auth init failed:', err.message)
        // Clear everything and let user log in fresh
        setSession(null)
        setUser(null)
        setProfile(null)
      } finally {
        initialised.current = true
        setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip if init hasn't finished yet — init already handles the
        // initial session. This prevents the race condition on mobile.
        if (!initialised.current) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchProfile(session.user.id)
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

  const signInWithEmail  = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp           = (email, password) =>
    supabase.auth.signUp({ email, password })

  const signOut          = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      setProfile,
      loading,
      refreshProfile,
      signInWithGoogle,
      signInWithEmail,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)