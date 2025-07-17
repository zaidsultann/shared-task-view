import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MainDashboard } from './MainDashboard'
import Dashboard from './Dashboard'
import { MapTab } from './MapTab'
import { useAuth } from '@/hooks/useAuth'
import useRealtimeTasks from '@/hooks/useRealtimeTasks'
import useRealtimeProfiles from '@/hooks/useRealtimeProfiles'
import { useQuery } from '@tanstack/react-query'
import { tasks as tasksApi } from '@/lib/api'
import { supabase } from '@/integrations/supabase/client'
import { BarChart3, Kanban, Map, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import logoImg from '@/assets/logo.png'

export const EnhancedTaskBoard = () => {
  const { authUser, logout } = useAuth()
  
  // Fetch tasks with real-time updates
  const { 
    data: tasks = [], 
    isLoading, 
    refetch: refreshTasks 
  } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.getAll,
    refetchInterval: 60000, // Reduced polling since we have real-time updates
  })

  // Fetch profiles with real-time updates
  const { 
    data: profiles = [], 
    refetch: refreshProfiles 
  } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*')
      if (error) throw error
      return data || []
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  })

  // Set up real-time updates with immediate refetch
  useRealtimeTasks(() => {
    console.log('🔄 EnhancedTaskBoard: Realtime update detected, refetching tasks...')
    refreshTasks()
  })

  useRealtimeProfiles(() => {
    console.log('🔄 EnhancedTaskBoard: Realtime profile update detected, refetching profiles...')
    refreshProfiles()
  })

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Clean Header - Mobile Optimized */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-6 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={logoImg} alt="Business Operations" className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg" />
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate">Business Operations</h1>
                <p className="text-xs text-muted-foreground hidden sm:block truncate">Welcome back, {authUser?.username}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground p-1 sm:p-2">
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-2">Log out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile Optimized */}
      <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 sm:mb-8 bg-muted/50 h-auto p-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs sm:text-sm py-2 px-2 sm:px-4">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs sm:text-sm py-2 px-2 sm:px-4">
              <Kanban className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs sm:text-sm py-2 px-2 sm:px-4">
              <Map className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Map</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            <MainDashboard tasks={tasks} />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4 sm:space-y-6">
            <Dashboard 
              user={{username: authUser?.username || 'Unknown', user_id: authUser?.user_id || ''}} 
              profiles={profiles}
            />
          </TabsContent>

          <TabsContent value="map" className="space-y-4 sm:space-y-6">
            <MapTab tasks={tasks} onTaskUpdate={refreshTasks} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}