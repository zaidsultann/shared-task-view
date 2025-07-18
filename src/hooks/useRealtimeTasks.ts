import { useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Task } from '@/types/Task'

export const useRealtimeTasks = (onTaskUpdate?: () => void) => {
  const queryClient = useQueryClient()
  const onTaskUpdateRef = useRef(onTaskUpdate)
  
  // Keep the callback ref current
  useEffect(() => {
    onTaskUpdateRef.current = onTaskUpdate
  }, [onTaskUpdate])

  const handleRealtimeTaskUpdate = useCallback((payload: any) => {
    console.log('🔄 PERSISTENT Task realtime event:', payload.eventType, payload)
    
    // Get current tasks data from cache
    const currentTasks = queryClient.getQueryData<Task[]>(['tasks']) || []
    
    // Update local state directly for immediate UI updates
    if (payload.eventType === 'INSERT' && payload.new) {
      const newTask = payload.new as Task
      console.log('🆕 PERSISTENT Realtime: Adding new task to cache:', newTask.business_name)
      queryClient.setQueryData(['tasks'], [...currentTasks, newTask])
    } 
    else if (payload.eventType === 'UPDATE' && payload.new) {
      const updatedTask = payload.new as Task
      console.log('📝 PERSISTENT Realtime: Task status updated!', {
        businessName: updatedTask.business_name,
        taskId: updatedTask.id.slice(-8),
        status: updatedTask.status,
        mapStatus: updatedTask.map_status,
        timestamp: new Date().toLocaleTimeString(),
        updateCount: Date.now()
      })
      
      // Force immediate cache update for real-time map sync
      const updatedTasks = currentTasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
      queryClient.setQueryData(['tasks'], updatedTasks)
      
      console.log('🗺️ PERSISTENT: Triggering map marker update for task:', updatedTask.id.slice(-8))
    } 
    else if (payload.eventType === 'DELETE' && payload.old) {
      const deletedTask = payload.old as Task
      console.log('🗑️ PERSISTENT Realtime: Removing task from cache:', deletedTask.business_name)
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

    // Trigger parent component refresh using stable ref
    if (onTaskUpdateRef.current) {
      console.log('🔄 PERSISTENT: Calling onTaskUpdate callback')
      onTaskUpdateRef.current()
    }
  }, [queryClient])

  useEffect(() => {
    console.log('🚀 Setting up PERSISTENT realtime subscription for tasks...')
    
    // Use a unique channel name to avoid conflicts
    const channelName = `tasks-realtime-${Date.now()}`
    const channel = supabase
      .channel(channelName)
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
        console.log('📡 PERSISTENT Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ PERSISTENT: Successfully subscribed to realtime task updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ PERSISTENT: Realtime subscription error - will retry')
          // Auto-retry after 3 seconds
          setTimeout(() => {
            console.log('🔄 PERSISTENT: Retrying realtime subscription...')
            channel.subscribe()
          }, 3000)
        } else if (status === 'CLOSED') {
          console.warn('⚠️ PERSISTENT: Realtime channel closed')
        }
      })

    return () => {
      console.log('🧹 PERSISTENT: Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [handleRealtimeTaskUpdate])
}

export default useRealtimeTasks