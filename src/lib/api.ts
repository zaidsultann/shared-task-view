// API utility functions using Supabase
import { supabase } from '@/integrations/supabase/client'
import { createClient } from '@supabase/supabase-js'
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
      map_status: task.map_status,
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
    console.log('API: Starting claim process for task:', taskId)
    
    const { data: { user } } = await supabase.auth.getUser()
    console.log('API: Current auth user:', user?.id)
    
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
      console.log('API: Using authenticated user:', { username, userId })
    } else {
      // Use mock session for demo
      const mockSession = localStorage.getItem('mockUserSession')
      console.log('API: Mock session from storage:', mockSession)
      
      if (mockSession) {
        const session = JSON.parse(mockSession)
        username = session.username
        userId = session.user_id
        console.log('API: Using mock session:', { username, userId })
      } else {
        console.error('API: No authentication found')
        throw new Error('Not authenticated')
      }
    }

    console.log('API: About to claim task with data:', {
      taskId,
      username,
      userId,
      status: 'in_progress_no_file'
    })

    // Try with different approach for mock users
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

    console.log('API: Claim database result:', { 
      data, 
      error,
      dataLength: data?.length,
      firstResult: data?.[0] 
    })
    
    if (error) {
      console.error('API: Claim failed with error:', error)
      throw error
    }
    
    if (!data || data.length === 0) {
      console.error('API: No task was updated - task may not exist or already claimed')
      console.log('API: Checking if task exists and is open...')
      
      // Debug: Check if task exists and what its current status is
      const { data: debugData } = await supabase
        .from('tasks')
        .select('id, status, taken_by, business_name')
        .eq('id', taskId)
        .single()
      
      console.log('API: Task debug info:', debugData)
      
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
    console.log('API: Starting clearHistory operation...')
    
    try {
      // Use service role client for admin operations like clearing deleted tasks
      const serviceRoleClient = createClient(
        'https://fqaykpnmpqkvozdrrceq.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYXlrcG5tcHFrdm96ZHJyY2VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUxNzI4MiwiZXhwIjoyMDY4MDkzMjgyfQ.xhJfqA_l6mG4DlOJRGOUfHXggvShH0P4jNm7F7I5VGI'
      )
      
      // First get all deleted tasks to verify count
      const { data: deletedTasks, error: fetchError } = await serviceRoleClient
        .from('tasks')
        .select('id, business_name')
        .eq('is_deleted', true)
      
      if (fetchError) {
        console.error('API: Error fetching deleted tasks:', fetchError)
        throw fetchError
      }
      
      console.log('API: Found deleted tasks to remove:', deletedTasks?.length || 0, deletedTasks?.map(t => ({ id: t.id, name: t.business_name })))
      
      if (!deletedTasks || deletedTasks.length === 0) {
        console.log('API: No deleted tasks found to clear')
        return []
      }
      
      // Now delete them permanently using service role
      const { data, error } = await serviceRoleClient
        .from('tasks')
        .delete()
        .eq('is_deleted', true)
        .select('id, business_name')

      console.log('API: Delete operation result:', { 
        deletedCount: data?.length || 0, 
        deletedTasks: data?.map(t => ({ id: t.id, name: t.business_name })),
        error 
      })
      
      if (error) {
        console.error('API: Delete operation failed:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      console.log('API: Successfully permanently deleted', data?.length || 0, 'tasks')
      return data || []
    } catch (err) {
      console.error('API: clearHistory operation failed:', err)
      throw err
    }
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

    // Get current task to determine version
    const { data: currentTask, error: fetchError } = await supabase
      .from('tasks')
      .select('version_number')
      .eq('id', taskId)
      .single()

    if (fetchError) throw fetchError

    const feedbackVersion = version || currentTask?.version_number || 1

    // Use the database function to add feedback safely
    const { error: feedbackError } = await supabase.rpc('add_task_feedback', {
      task_id_param: taskId,
      comment_param: comment,
      user_param: username,
      version_param: feedbackVersion
    })

    if (feedbackError) throw feedbackError

    // Update task status separately
    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'feedback_needed',
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateStatus: async (taskId: string, status: Task['status'], mapStatus?: string) => {
    const updateData: any = { status }
    if (mapStatus) updateData.map_status = mapStatus

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
    console.log('API: Starting approval for task:', taskId)
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
      console.log('API: Using authenticated user for approval:', { username, userId })
    } else {
      // Use mock session for demo
      const mockSession = localStorage.getItem('mockUserSession')
      console.log('API: Mock session from storage:', mockSession)
      
      if (mockSession) {
        const session = JSON.parse(mockSession)
        username = session.username
        userId = session.user_id
        console.log('API: Using mock session for approval:', { username, userId })
      } else {
        console.error('API: No authentication found for approval')
        throw new Error('Not authenticated')
      }
    }

    console.log('API: About to approve task with data:', {
      taskId,
      username,
      userId,
      newStatus: 'completed'
    })

    // First, check what the current task status is
    const { data: currentTaskData } = await supabase
      .from('tasks')
      .select('id, status, business_name, current_file_url')
      .eq('id', taskId)
      .single()
    
    console.log('API: Current task before approval:', currentTaskData)

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        approved_by: userId, // Use userId instead of username for the UUID field
        approved_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()

    console.log('API: Approval database result:', { 
      data, 
      error,
      dataLength: data?.length,
      firstResult: data?.[0] 
    })

    if (error) {
      console.error('API: Approval failed with error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.error('API: No task was updated during approval - task may not exist')
      
      // Debug: Check if task exists and what its current status is
      const { data: debugData } = await supabase
        .from('tasks')
        .select('id, status, business_name, current_file_url')
        .eq('id', taskId)
        .single()
      
      console.log('API: Task debug info during approval:', debugData)
      
      throw new Error('Failed to approve task - task may not exist or is in wrong status')
    }

    const approvedTask = data[0]
    console.log('API: Task approved successfully:', approvedTask.business_name)

    // Automatically geocode the address if completed and address exists but no coordinates
    if (approvedTask.address && !approvedTask.latitude) {
      console.log('API: Auto-geocoding address for approved task:', approvedTask.address)
      try {
        const { data: geocodeResult, error: geocodeError } = await supabase.functions.invoke('geocode', {
          body: { address: approvedTask.address, taskId }
        })
        
        if (geocodeError) {
          console.warn('API: Auto-geocoding failed:', geocodeError)
        } else {
          console.log('API: Auto-geocoding successful:', geocodeResult)
        }
      } catch (geocodeError) {
        console.warn('API: Auto-geocoding exception:', geocodeError)
      }
    }

    return approvedTask
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
  },

  // Add function to update map status
  updateMapStatus: async (taskId: string, mapStatus: string) => {
    console.log('API: Updating map status:', { taskId, mapStatus })

    const { data, error } = await supabase
      .from('tasks')
      .update({
        map_status: mapStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('API: Map status update failed:', error)
      throw error
    }

    console.log('API: Map status updated successfully:', data)
    return data
  },

  // Add revert functionality - send to proper section based on file status
  revertTask: async (taskId: string) => {
    console.log('API: Reverting task:', taskId)

    // First get the current task to check if it has files
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('current_file_url, versions')
      .eq('id', taskId)
      .single()

    // Determine proper status based on file uploads
    const hasFiles = currentTask?.current_file_url || (currentTask?.versions && Array.isArray(currentTask.versions) && currentTask.versions.length > 0)
    const newStatus = hasFiles ? 'in_progress_with_file' : 'in_progress_no_file'

    console.log('API: Reverting to status:', newStatus, 'based on files:', hasFiles)

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: newStatus,
        approved_by: null,
        approved_at: null,
        completed_at: null,
        map_status: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('API: Revert failed:', error)
      throw error
    }

    console.log('API: Task reverted successfully:', data)
    return data
  }
}

export default { auth, tasks }