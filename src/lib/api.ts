// API utility functions using Supabase
import { supabase } from '@/integrations/supabase/client'
import { Task, FileVersion, FeedbackItem } from '@/types/Task'

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
    console.log('API: Fetching all tasks...')
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        created_by_profile:profiles!tasks_created_by_fkey(username)
      `)
      .order('created_at', { ascending: false })

    console.log('API: Raw tasks from Supabase:', tasks)
    if (error) {
      console.error('API: Error fetching tasks:', error)
      throw error
    }

    // Transform the data to match frontend expectations
    const transformedTasks: Task[] = tasks.map(task => ({
      id: task.id,
      business_name: task.business_name,
      brief: task.brief,
      phone: task.phone,
      address: task.address,
      note: task.note,
      status: task.status as Task['status'],
      created_at: new Date(task.created_at).getTime(),
      created_by: task.created_by_profile?.username || 'Unknown',
      taken_by: task.taken_by,
      claimed_by: task.claimed_by,
      approved_by: task.approved_by,
      completed_at: task.completed_at ? new Date(task.completed_at).getTime() : undefined,
      approved_at: task.approved_at ? new Date(task.approved_at).getTime() : undefined,
      zip_url: task.zip_url,
      current_file_url: task.current_file_url,
      versions: (task.versions as unknown as FileVersion[]) || [],
      feedback: (task.feedback as unknown as FeedbackItem[]) || [],
      has_feedback: task.has_feedback || false,
      version_number: task.version_number || 1,
      latitude: task.latitude,
      longitude: task.longitude,
      status_color: task.status_color || 'red',
      is_deleted: task.is_deleted,
      is_archived: task.is_archived || false
    }))

    console.log('API: Transformed tasks:', transformedTasks)
    return transformedTasks
  },

  create: async (taskData: { business_name: string; brief: string; phone?: string; address?: string; note?: string }) => {
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
        phone: taskData.phone,
        address: taskData.address,
        note: taskData.note,
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
    
    // Get username from auth or mock session
    let username = ''
    let userId = user?.id
    
    if (userId) {
      // Get username from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', userId)
        .maybeSingle()
      
      username = profile?.username || 'Unknown'
    } else {
      // Use mock session for demo
      const mockSession = localStorage.getItem('mockUserSession')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        username = session.username
        userId = session.user_id
      } else {
        throw new Error('Not authenticated')
      }
    }

    console.log('API: Claiming task:', { taskId, username, userId })

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'in_progress_no_file',
        taken_by: username,
        claimed_by: userId,
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('status', 'open')
      .select()

    console.log('API: Claim result:', { data, error })
    if (error) {
      console.error('API: Claim failed:', error)
      throw error
    }
    
    if (!data || data.length === 0) {
      console.error('API: No task was updated - task may not exist or already claimed')
      throw new Error('Failed to claim task - task may not exist or already claimed')
    }
    
    console.log('API: Task claimed successfully:', data[0])
    return data[0]
  },

  complete: async (taskId: string, zipFile: File) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get username from auth or mock session
    let username = ''
    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle()
      username = profile?.username || 'Unknown'
    } else {
      const mockSession = localStorage.getItem('mockUserSession')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        username = session.username
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
      .eq('taken_by', username)
      .select()
      .single()

    if (error) throw error
    return data
  },

  revert: async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get username from auth or mock session
    let username = ''
    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle()
      username = profile?.username || 'Unknown'
    } else {
      const mockSession = localStorage.getItem('mockUserSession')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        username = session.username
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
      .eq('taken_by', username)
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
    console.log('API: Clearing deleted tasks...')
    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('is_deleted', true)
      .select()

    console.log('API: Clear history result:', { data, error })
    if (error) throw error
    return data
  },

  // Archive operations
  archive: async (taskId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ is_archived: true })
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  unarchive: async (taskId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ is_archived: false })
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  bulkArchive: async (taskIds: string[]) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ is_archived: true })
      .in('id', taskIds)
      .select()

    if (error) throw error
    return data
  },

  bulkDelete: async (taskIds: string[]) => {
    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .in('id', taskIds)
      .select()

    if (error) throw error
    return data
  },

  autoArchiveOldTasks: async () => {
    const { data, error } = await supabase
      .rpc('auto_archive_old_tasks')

    if (error) throw error
    return data
  },

  // Enhanced status flow methods
  upload: async (taskId: string, zipFile: File) => {
    const { data: { user } } = await supabase.auth.getUser()
    
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

    // Upload file to Supabase Storage
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

    // Update task to awaiting_approval status with file
    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'awaiting_approval',
        current_file_url: urlData.publicUrl
      })
      .eq('id', taskId)
      .eq('taken_by', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  approve: async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
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
        status: 'completed',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('status', 'awaiting_approval')
      .select()
      .single()

    if (error) throw error

    // Geocode the address if completed and address exists
    if (data.address && !data.latitude) {
      try {
        await supabase.functions.invoke('geocode', {
          body: { address: data.address, taskId }
        })
      } catch (geocodeError) {
        console.warn('Geocoding failed:', geocodeError)
      }
    }

    return data
  },

  addFeedback: async (taskId: string, comment: string, version?: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    let username = 'Unknown'
    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle()
      username = profile?.username || 'Unknown'
    } else {
      const mockSession = localStorage.getItem('mockUserSession')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        username = session.username
      }
    }

    // Get current task
    const { data: currentTask, error: fetchError } = await supabase
      .from('tasks')
      .select('feedback, version_number')
      .eq('id', taskId)
      .single()

    if (fetchError) throw fetchError

    const currentFeedback = (currentTask.feedback as unknown as FeedbackItem[]) || []
    const newFeedback: FeedbackItem = {
      user: username,
      comment,
      version: version || currentTask?.version_number || 1,
      created_at: Date.now()
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'feedback_needed',
        has_feedback: true,
        feedback: [...currentFeedback, newFeedback] as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateStatus: async (taskId: string, status: Task['status'], statusColor?: string) => {
    const updateData: any = { status }
    if (statusColor) updateData.status_color = statusColor

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  bulkCreate: async (tasksData: Array<{ business_name: string; brief: string; phone?: string; address?: string; note?: string }>) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    let userId = user?.id
    if (!userId) {
      const mockSession = localStorage.getItem('mockUserSession')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        userId = session.user_id
      } else {
        userId = '44444444-4444-4444-4444-444444444444' // Default to ZS
      }
    }

    const tasksToInsert = tasksData.map(task => ({
      ...task,
      created_by: userId
    }))

    const { data, error } = await supabase
      .from('tasks')
      .insert(tasksToInsert)
      .select()

    if (error) throw error
    return data
  },

  uploadFile: async (taskId: string, file: File) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get username from auth or mock session
    let username = ''
    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle()
      username = profile?.username || 'Unknown'
    } else {
      const mockSession = localStorage.getItem('mockUserSession')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        username = session.username
      } else {
        throw new Error('Not authenticated')
      }
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `task-files/${taskId}-${Date.now()}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('taskboard-uploads')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('taskboard-uploads')
      .getPublicUrl(fileName)

    // Get current task to increment version
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('version_number, versions')
      .eq('id', taskId)
      .single()

    const newVersion = (currentTask?.version_number || 0) + 1
    const currentVersions = (currentTask?.versions as unknown as FileVersion[]) || []

    // Update task with file URL and new status
    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'in_progress_with_file',
        upload_url: publicUrl,
        current_file_url: publicUrl,
        updated_at: new Date().toISOString(),
        version_number: newVersion,
        versions: [
          ...currentVersions,
          {
            url: publicUrl,
            version: newVersion,
            uploaded_at: Date.now(),
            uploaded_by: username
          }
        ] as any
      })
      .eq('id', taskId)
      .eq('taken_by', username)
      .select()

    if (error) throw error
    return data?.[0] || data
  },

  approveTask: async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get username from auth or mock session
    let username = ''
    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle()
      username = profile?.username || 'Unknown'
    } else {
      const mockSession = localStorage.getItem('mockUserSession')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        username = session.username
      } else {
        throw new Error('Not authenticated')
      }
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        approved_by: username,
        approved_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()

    if (error) throw error
    return data?.[0] || data
  },

  geocodeTask: async (taskId: string, address: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('geocode', {
        body: { address, taskId }
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Geocoding failed:', error)
      throw error
    }
  }
}

export default { auth, tasks }