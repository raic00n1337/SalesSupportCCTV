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
    // ONLY read from Session Storage - NO Supabase calls
    // This prevents any network requests that could be blocked by tab freezing
    const cachedUser = sessionStorage.getItem('sb_user')
    const cachedSession = sessionStorage.getItem('sb_session')
    const cachedAdmin = sessionStorage.getItem('sb_isAdmin')
    
    if (cachedUser && cachedSession) {
      try {
        setUser(JSON.parse(cachedUser))
        setSession(JSON.parse(cachedSession))
        setIsAdmin(cachedAdmin === 'true')
        console.log('✅ Auth restored from cache (no network call)')
      } catch (e) {
        console.error('❌ Error parsing cached auth data:', e)
        // Clear invalid cache
        sessionStorage.removeItem('sb_user')
        sessionStorage.removeItem('sb_session')
        sessionStorage.removeItem('sb_isAdmin')
      }
    } else {
      console.log('ℹ️ No cached auth data found - user is logged out')
    }
    
    // Always set loading to false immediately (instant load)
    setLoading(false)

    // NO onAuthStateChange listener
    // NO getSession() call
    // NO background validation
    // Auth state is ONLY updated by explicit signIn/signOut calls
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
      console.log(`✅ Admin status checked: ${adminStatus}`)
      return adminStatus
    } catch (error) {
      console.error('❌ Error checking admin status:', error)
      setIsAdmin(false)
      sessionStorage.setItem('sb_isAdmin', 'false')
      return false
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting sign-in...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!error && data.session && data.user) {
      // Update state
      setSession(data.session)
      setUser(data.user)
      
      // Cache in session storage
      sessionStorage.setItem('sb_user', JSON.stringify(data.user))
      sessionStorage.setItem('sb_session', JSON.stringify(data.session))
      
      // Check admin status
      await checkAdminStatus(data.user.id)
      
      console.log('✅ Sign-in successful, auth cached')
    } else {
      console.error('❌ Sign-in failed:', error?.message)
    }

    return { error }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    console.log('📝 Attempting sign-up...')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
        },
      },
    })

    if (!error && data.session && data.user) {
      // Update state
      setSession(data.session)
      setUser(data.user)
      
      // Cache in session storage
      sessionStorage.setItem('sb_user', JSON.stringify(data.user))
      sessionStorage.setItem('sb_session', JSON.stringify(data.session))
      
      // Check admin status
      await checkAdminStatus(data.user.id)
      
      console.log('✅ Sign-up successful, auth cached')
    } else {
      console.error('❌ Sign-up failed:', error?.message)
    }

    return { error }
  }

  const signOut = async () => {
    console.log('👋 Signing out...')
    
    // Clear local state
    setSession(null)
    setUser(null)
    setIsAdmin(false)
    
    // Clear cache
    sessionStorage.removeItem('sb_user')
    sessionStorage.removeItem('sb_session')
    sessionStorage.removeItem('sb_isAdmin')
    
    // Call Supabase signOut (async, but we don't wait)
    supabase.auth.signOut().catch(err => {
      console.error('❌ Error during Supabase signOut:', err)
    })
    
    console.log('✅ Signed out, cache cleared')
    
    // Redirect to login
    router.push('/login')
  }

  const resetPassword = async (email: string) => {
    console.log('🔑 Requesting password reset...')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    
    if (!error) {
      console.log('✅ Password reset email sent')
    } else {
      console.error('❌ Password reset failed:', error.message)
    }
    
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
