import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(undefined)
  const [loading, setLoading] = useState(true)

const fetchProfile = useCallback(async (userId) => {
  if (!userId) {
    setProfile(null)
    return
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // Real error
      console.error('Profile fetch error:', error)
      setProfile(undefined) // treat as loading failure, not no-profile
      return
    }

    setProfile(data ?? null)
  } catch (err) {
    console.error('Profile fetch failed:', err)
    setProfile(undefined) // do NOT treat failure as no profile
  }
}, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

useEffect(() => {
  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()

    setSession(session)
    setUser(session?.user ?? null)

    if (session?.user) {
      await fetchProfile(session.user.id)
    } else {
      setProfile(null)
    }

    setLoading(false)
  }

  init()

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
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