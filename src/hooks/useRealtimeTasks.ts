import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Task } from '@/types/Task'

export const useRealtimeTasks = () => {
  const queryClient = useQueryClient()

  useEffect(() => {
    console.log('Setting up realtime subscription for tasks...')
    
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('Task realtime event:', payload.eventType, payload)
          
          // Invalidate and refetch tasks query to get fresh data with all joins
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
          
          // Also update individual task queries if they exist
          if ((payload.new as any)?.id) {
            queryClient.invalidateQueries({ queryKey: ['task', (payload.new as any).id] })
          }
          if ((payload.old as any)?.id) {
            queryClient.invalidateQueries({ queryKey: ['task', (payload.old as any).id] })
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      console.log('Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}

export default useRealtimeTasks