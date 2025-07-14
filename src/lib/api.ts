// API utility functions using Supabase
import { supabase } from '@/integrations/supabase/client'

// Authentication
export const auth = {
  login: async (username: string, password: string) => {
    // Use Supabase Auth with email format
    const email = `${username}@demo.com`
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: password || 'demo123'
    })
    
    if (error) throw error
    
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
      .eq('is_deleted', false)
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        business_name: taskData.business_name,
        brief: taskData.brief,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  claim: async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'in_progress',
        taken_by: user.id
      })
      .eq('id', taskId)
      .eq('status', 'open')
      .select()
      .single()

    if (error) throw error
    return data
  },

  complete: async (taskId: string, zipFile: File) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Upload file to Supabase Storage
    const fileName = `${taskId}-${Date.now()}-${zipFile.name}`
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
      .eq('taken_by', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  revert: async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'open',
        taken_by: null,
        completed_at: null,
        zip_url: null
      })
      .eq('id', taskId)
      .eq('taken_by', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  delete: async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('tasks')
      .update({ is_deleted: true })
      .eq('id', taskId)
      .eq('created_by', user.id)
      .select()
      .single()

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