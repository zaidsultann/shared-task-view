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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    switch (path) {
      case 'login': {
        if (req.method !== 'POST') {
          throw new Error('Method not allowed')
        }

        const { username, password } = await req.json()

        // Find user by username in profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('username', username)
          .single()

        if (profileError || !profile) {
          throw new Error('Invalid username or password')
        }

        // For demo purposes, we'll use email as username@demo.com
        // In production, you'd implement proper password authentication
        const email = `${username}@demo.com`
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: password || 'demo123' // Default password for demo
        })

        if (error) {
          throw new Error('Invalid username or password')
        }

        return new Response(
          JSON.stringify({ username, user_id: data.user?.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'me': {
        const token = req.headers.get('Authorization')?.replace('Bearer ', '')
        if (!token) {
          throw new Error('No authorization token')
        }

        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error || !user) {
          throw new Error('Invalid token')
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single()

        return new Response(
          JSON.stringify({ username: profile?.username || 'Unknown', user_id: user.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error('Endpoint not found')
    }
  } catch (error) {
    console.error('Auth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})