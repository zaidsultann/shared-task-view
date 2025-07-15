import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

export interface AuthUser {
  username: string
  user_id: string
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Defer profile fetching to prevent deadlocks
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('user_id', session.user.id)
                .maybeSingle()
              
              setAuthUser({
                username: profile?.username || 'Unknown',
                user_id: session.user.id
              })
            } catch (error) {
              console.error('Error fetching profile:', error)
              setAuthUser({
                username: 'Unknown',
                user_id: session.user.id
              })
            }
          }, 0)
        } else {
          // Check for mock session in localStorage
          const mockSession = localStorage.getItem('mockUserSession')
          if (mockSession) {
            try {
              const mockData = JSON.parse(mockSession)
              setAuthUser(mockData)
            } catch (error) {
              console.error('Invalid mock session:', error)
              localStorage.removeItem('mockUserSession')
            }
          } else {
            setAuthUser(null)
          }
        }
        
        setLoading(false)
      }
    )

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
        setUser(session.user)
      } else {
        // Check for mock session if no real session
        const mockSession = localStorage.getItem('mockUserSession')
        if (mockSession) {
          try {
            const mockData = JSON.parse(mockSession)
            setAuthUser(mockData)
          } catch (error) {
            console.error('Invalid mock session:', error)
            localStorage.removeItem('mockUserSession')
          }
        }
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      // First try mock auth for demo users
      const mockUsers: { [key: string]: string } = {
        'AS': '11111111-1111-1111-1111-111111111111',
        'TS': '22222222-2222-2222-2222-222222222222', 
        'MW': '33333333-3333-3333-3333-333333333333',
        'ZS': '44444444-4444-4444-4444-444444444444'
      }

      if (mockUsers[username] && password === 'dz4132') {
        const session = { username, user_id: mockUsers[username] }
        localStorage.setItem('mockUserSession', JSON.stringify(session))
        setAuthUser(session)
        return session
      }

      // Try real Supabase auth
      const email = `${username}@demo.com`
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password || 'demo123'
      })
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          // Allow unconfirmed emails for demo
          const { data: userData } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`
            }
          })
          
          if (userData.user) {
            // Get or create profile
            let { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('user_id', userData.user.id)
              .maybeSingle()
            
            if (!profile) {
              await supabase.from('profiles').insert({
                user_id: userData.user.id,
                username
              })
              profile = { username }
            }
            
            const authUser = { 
              username: profile?.username || username, 
              user_id: userData.user.id 
            }
            setAuthUser(authUser)
            return authUser
          }
        }
        throw error
      }
      
      // Profile will be fetched by the auth state change listener
      return { username, user_id: data.user?.id }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      // Clear mock session
      localStorage.removeItem('mockUserSession')
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear local state
      setUser(null)
      setSession(null)
      setAuthUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  return {
    user,
    session,
    authUser,
    loading,
    login,
    logout,
    isAuthenticated: !!authUser
  }
}