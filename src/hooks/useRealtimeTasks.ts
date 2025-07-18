import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Task } from '@/types/Task'

export const useRealtimeTasks = (onTaskUpdate?: () => void) => {
  const queryClient = useQueryClient()

  const handleRealtimeTaskUpdate = useCallback((payload: any) => {
    console.log('🔄 Task realtime event:', payload.eventType, payload)
    
    // Get current tasks data from cache
    const currentTasks = queryClient.getQueryData<Task[]>(['tasks']) || []
    
    // Update local state directly for immediate UI updates
    if (payload.eventType === 'INSERT' && payload.new) {
      const newTask = payload.new as Task
      console.log('🆕 Realtime: Adding new task to cache:', newTask.business_name)
      queryClient.setQueryData(['tasks'], [...currentTasks, newTask])
    } 
    else if (payload.eventType === 'UPDATE' && payload.new) {
      const updatedTask = payload.new as Task
      console.log('📝 Realtime: Updating task in cache:', updatedTask.business_name, 'Status:', updatedTask.status, 'Map Status:', updatedTask.map_status)
      queryClient.setQueryData(['tasks'], 
        currentTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        )
      )
    } 
    else if (payload.eventType === 'DELETE' && payload.old) {
      const deletedTask = payload.old as Task
      console.log('🗑️ Realtime: Removing task from cache:', deletedTask.business_name)
      queryClient.setQueryData(['tasks'], 
        currentTasks.filter(task => task.id !== deletedTask.id)
      )
    }
    
    // Update individual task queries if they exist
    if ((payload.new as any)?.id) {
      queryClient.setQueryData(['task', (payload.new as any).id], payload.new)
    }
    if ((payload.old as any)?.id && payload.eventType === 'DELETE') {
      queryClient.removeQueries({ queryKey: ['task', (payload.old as any).id] })
    }

    // Trigger parent component refresh if callback provided
    if (onTaskUpdate) {
      onTaskUpdate()
    }
  }, [queryClient, onTaskUpdate])

  useEffect(() => {
    console.log('🚀 Setting up enhanced realtime subscription for tasks...')
    
    const channel = supabase
      .channel('realtime:tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        handleRealtimeTaskUpdate
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to realtime task updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription error')
        }
      })

    return () => {
      console.log('🧹 Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [handleRealtimeTaskUpdate])
}

export default useRealtimeTasks