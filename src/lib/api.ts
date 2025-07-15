// API utility functions using Supabase
import { supabase } from '@/integrations/supabase/client'

// Authentication
export const auth = {
  login: async (username: string, password: string) => {
    // For testing, use mock profiles with fixed user IDs
    const mockUsers: { [key: string]: string } = {
      'AS': '11111111-1111-1111-1111-111111111111',
      'TS': '22222222-2222-2222-2222-222222222222', 
      'MW': '33333333-3333-3333-3333-333333333333',
      'ZS': '44444444-4444-4444-4444-444444444444'
    }

    // Check if it's a test user first
    if (mockUsers[username] && password === 'dz4132') {
      // Create a mock session for testing and store in localStorage
      const session = { username, user_id: mockUsers[username] }
      localStorage.setItem('mockUserSession', JSON.stringify(session))
      return session
    }

    // Try real Supabase auth
    const email = `${username}@demo.com`
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: password || 'demo123'
    })
    
    if (error) {
      // If email not confirmed, allow login anyway for demo
      if (error.message.includes('Email not confirmed')) {
        // Get the user anyway
        const { data: userData } = await supabase.auth.signUp({
          email,
          password
        })
        
        if (userData.user) {
          // Get or create profile
          let { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', userData.user.id)
            .maybeSingle()
          
          if (!profile) {
            // Create profile if it doesn't exist
            await supabase.from('profiles').insert({
              user_id: userData.user.id,
              username
            })
            profile = { username }
          }
          
          return { username: profile?.username || username, user_id: userData.user.id }
        }
      }
      throw error
    }
    
    // Get profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', data.user?.id)
      .maybeSingle()
    
    return { username: profile?.username || username, user_id: data.user?.id }
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .maybeSingle()
    
    return { username: profile?.username || 'Unknown', user_id: user.id }
  },
}

// Tasks
export const tasks = {
  getAll: async () => {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        created_by_profile:profiles!tasks_created_by_fkey(username),
        taken_by_profile:profiles!tasks_taken_by_fkey(username)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform the data to match frontend expectations
    return tasks.map(task => ({
      id: task.id,
      business_name: task.business_name,
      brief: task.brief,
      status: task.status,
      created_at: new Date(task.created_at).getTime(),
      created_by: task.created_by_profile?.username || 'Unknown',
      taken_by: task.taken_by_profile?.username,
      completed_at: task.completed_at ? new Date(task.completed_at).getTime() : undefined,
      zip_url: task.zip_url,
      is_deleted: task.is_deleted
    }))
  },

  create: async (taskData: { business_name: string; brief: string }) => {
    // Get current user from Supabase auth or use mock session from localStorage
    const { data: { user } } = await supabase.auth.getUser()
    
    // If no authenticated user, try to get mock session from localStorage
    let userId = user?.id
    
    if (!userId) {
      const mockSession = localStorage.getItem('mockUserSession')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        userId = session.user_id
      } else {
        // Default to ZS user for testing
        userId = '44444444-4444-4444-4444-444444444444'
      }
    }

    console.log('Creating task with userId:', userId, 'taskData:', taskData);

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        business_name: taskData.business_name,
        brief: taskData.brief,
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      console.error('Task creation error:', error);
      throw error;
    }
    
    console.log('Task created successfully:', data);
    return data
  },

  claim: async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get user ID from auth or mock session
    let userId = user?.id
    if (!userId) {
      const mockSession = localStorage.getItem('mockUserSession')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        userId = session.user_id
      } else {
        throw new Error('Not authenticated')
      }
    }

    console.log('Claiming task:', { taskId, userId })

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'in_progress',
        taken_by: userId
      })
      .eq('id', taskId)
      .eq('status', 'open')
      .select()
      .single()

    console.log('Claim result:', { data, error })
    if (error) throw error
    return data
  },

  complete: async (taskId: string, zipFile: File) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get user ID from auth or mock session
    let userId = user?.id
    if (!userId) {
      const mockSession = localStorage.getItem('mockUserSession')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        userId = session.user_id
      } else {
        throw new Error('Not authenticated')
      }
    }

    // Upload file to Supabase Storage with demos/ prefix
    const fileName = `demos/${Date.now()}_${zipFile.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('taskboard-uploads')
      .upload(fileName, zipFile, {
        contentType: zipFile.type || 'application/zip'
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('taskboard-uploads')
      .getPublicUrl(fileName)

    // Update task
    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        zip_url: urlData.publicUrl
      })
      .eq('id', taskId)
      .eq('taken_by', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  revert: async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get user ID from auth or mock session
    let userId = user?.id
    if (!userId) {
      const mockSession = localStorage.getItem('mockUserSession')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        userId = session.user_id
      } else {
        throw new Error('Not authenticated')
      }
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'open',
        taken_by: null,
        completed_at: null,
        zip_url: null
      })
      .eq('id', taskId)
      .eq('taken_by', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  delete: async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get user ID from auth or mock session
    let userId = user?.id
    if (!userId) {
      const mockSession = localStorage.getItem('mockUserSession')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        userId = session.user_id
      } else {
        throw new Error('Not authenticated')
      }
    }

    console.log('Deleting task:', { taskId, userId })

    const { data, error } = await supabase
      .from('tasks')
      .update({ is_deleted: true })
      .eq('id', taskId)
      .eq('created_by', userId)
      .select()
      .single()

    console.log('Delete result:', { data, error })
    if (error) throw error
    return data
  },

  clearHistory: async () => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('is_deleted', true)

    if (error) throw error
  },
}

export default { auth, tasks }