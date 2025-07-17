import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface Profile {
  id: string
  user_id: string
  username: string
  created_at: string
  updated_at: string
}

export const useRealtimeProfiles = (onProfileUpdate?: () => void) => {
  const queryClient = useQueryClient()

  const handleRealtimeProfileUpdate = useCallback((payload: any) => {
    console.log('👤 Profile realtime event:', payload.eventType, payload)
    
    // Get current profiles data from cache
    const currentProfiles = queryClient.getQueryData<Profile[]>(['profiles']) || []
    
    // Update local state directly for immediate UI updates
    if (payload.eventType === 'INSERT' && payload.new) {
      const newProfile = payload.new as Profile
      console.log('🆕 Realtime: Adding new profile to cache:', newProfile.username)
      queryClient.setQueryData(['profiles'], [...currentProfiles, newProfile])
    } 
    else if (payload.eventType === 'UPDATE' && payload.new) {
      const updatedProfile = payload.new as Profile
      console.log('📝 Realtime: Updating profile in cache:', updatedProfile.username)
      queryClient.setQueryData(['profiles'], 
        currentProfiles.map(profile => 
          profile.id === updatedProfile.id ? updatedProfile : profile
        )
      )
    } 
    else if (payload.eventType === 'DELETE' && payload.old) {
      const deletedProfile = payload.old as Profile
      console.log('🗑️ Realtime: Removing profile from cache:', deletedProfile.username)
      queryClient.setQueryData(['profiles'], 
        currentProfiles.filter(profile => profile.id !== deletedProfile.id)
      )
    }
    
    // Update individual profile queries if they exist
    if ((payload.new as any)?.id) {
      queryClient.setQueryData(['profile', (payload.new as any).id], payload.new)
    }
    if ((payload.old as any)?.id && payload.eventType === 'DELETE') {
      queryClient.removeQueries({ queryKey: ['profile', (payload.old as any).id] })
    }

    // Trigger parent component refresh if callback provided
    if (onProfileUpdate) {
      onProfileUpdate()
    }
  }, [queryClient, onProfileUpdate])

  useEffect(() => {
    console.log('🚀 Setting up enhanced realtime subscription for profiles...')
    
    const channel = supabase
      .channel('realtime:profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        handleRealtimeProfileUpdate
      )
      .subscribe((status) => {
        console.log('📡 Profile realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to realtime profile updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Profile realtime subscription error')
        }
      })

    return () => {
      console.log('🧹 Cleaning up profile realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [handleRealtimeProfileUpdate])
}

export default useRealtimeProfiles