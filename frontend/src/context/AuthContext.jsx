import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(undefined)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data ?? null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  useEffect(() => {
    // Use ONLY onAuthStateChange — it fires INITIAL_SESSION on page load
    // with the restored session, so we never need getSession separately.
    // This eliminates the dual-fetch race entirely.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        await fetchProfile(session?.user?.id)

        // Only set loading=false after the INITIAL_SESSION event resolves.
        // Subsequent events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED) don't
        // touch loading.
        if (event === 'INITIAL_SESSION') {
          setLoading(false)
        }
      }
    )

    // Fallback: if INITIAL_SESSION never fires (e.g. network issue),
    // unblock after 10s. Don't reset profile — just unblock loading.
    const timeout = setTimeout(() => setLoading(false), 10000)

    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [fetchProfile])

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })

  const signInWithEmail = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password })

  const signOut = () => supabase.auth.signOut()

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