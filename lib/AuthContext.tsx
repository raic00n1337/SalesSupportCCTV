import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { useRouter } from 'next/router'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Try to restore from session storage FIRST (instant, no network)
    const cachedUser = sessionStorage.getItem('sb_user')
    const cachedAdmin = sessionStorage.getItem('sb_isAdmin')
    
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser))
        setIsAdmin(cachedAdmin === 'true')
        setLoading(false) // Immediately ready with cached data
      } catch (e) {
        console.error('Error parsing cached user:', e)
      }
    }

    // Then validate/update from Supabase in background (no blocking)
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        
        if (initialSession?.user) {
          setSession(initialSession)
          setUser(initialSession.user)
          sessionStorage.setItem('sb_user', JSON.stringify(initialSession.user))
          await checkAdminStatus(initialSession.user.id)
        } else {
          // No session - clear cache
          setUser(null)
          setSession(null)
          setIsAdmin(false)
          sessionStorage.removeItem('sb_user')
          sessionStorage.removeItem('sb_isAdmin')
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        // Keep cached data on error, don't force logout
      } finally {
        setLoading(false)
      }
    }

    // Only call Supabase if no cache or after cache is loaded
    if (!cachedUser) {
      initializeAuth()
    } else {
      // Validate in background without blocking UI
      setTimeout(initializeAuth, 100)
    }

    // Listen for auth changes (login/logout events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log(`Auth event: ${event}`)
        
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setIsAdmin(false)
          sessionStorage.removeItem('sb_user')
          sessionStorage.removeItem('sb_isAdmin')
        } else if (currentSession?.user) {
          setSession(currentSession)
          setUser(currentSession.user)
          sessionStorage.setItem('sb_user', JSON.stringify(currentSession.user))
          await checkAdminStatus(currentSession.user.id)
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', userId)
        .single()
      
      const adminStatus = !!data
      setIsAdmin(adminStatus)
      sessionStorage.setItem('sb_isAdmin', String(adminStatus))
    } catch (error) {
      setIsAdmin(false)
      sessionStorage.setItem('sb_isAdmin', 'false')
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
        },
      },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  const value = {
    user,
    session,
    loading,
    isAdmin,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
