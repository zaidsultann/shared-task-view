import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user from authorization header
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      throw new Error('No authorization token')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      throw new Error('Invalid authorization token')
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const action = pathParts[pathParts.length - 1]
    const taskId = pathParts[pathParts.length - 2]

    console.log('Tasks API:', req.method, action, taskId)

    switch (req.method) {
      case 'GET': {
        // Get all tasks
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
        const transformedTasks = tasks.map(task => ({
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

        return new Response(
          JSON.stringify(transformedTasks),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'POST': {
        // Create new task
        const { business_name, brief } = await req.json()

        const { data: task, error } = await supabase
          .from('tasks')
          .insert({
            business_name,
            brief,
            created_by: user.id
          })
          .select()
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify(task),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'PATCH': {
        if (action === 'claim') {
          // Claim task
          const { data: task, error } = await supabase
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

          return new Response(
            JSON.stringify(task),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (action === 'complete') {
          // Complete task with file upload
          const formData = await req.formData()
          const zipFile = formData.get('zip') as File

          if (!zipFile) {
            throw new Error('No ZIP file provided')
          }

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
          const { data: task, error } = await supabase
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

          return new Response(
            JSON.stringify(task),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (action === 'revert') {
          // Revert task to open
          const { data: task, error } = await supabase
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

          return new Response(
            JSON.stringify(task),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        throw new Error('Unknown action')
      }

      case 'DELETE': {
        if (action === 'clear-history') {
          // Clear deleted tasks
          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('is_deleted', true)

          if (error) throw error

          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Delete task (mark as deleted)
        const { data: task, error } = await supabase
          .from('tasks')
          .update({ is_deleted: true })
          .eq('id', taskId)
          .eq('created_by', user.id)
          .select()
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify(task),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error('Method not allowed')
    }
  } catch (error) {
    console.error('Tasks API error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})