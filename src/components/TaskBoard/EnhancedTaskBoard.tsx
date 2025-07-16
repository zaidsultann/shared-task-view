import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MainDashboard } from './MainDashboard'
import Dashboard from './Dashboard'
import { MapTab } from './MapTab'
import { BusinessMapTab } from './BusinessMapTab'
import { useAuth } from '@/hooks/useAuth'
import useRealtimeTasks from '@/hooks/useRealtimeTasks'
import { useQuery } from '@tanstack/react-query'
import { tasks as tasksApi } from '@/lib/api'
import { BarChart3, Kanban, Map, MapPin, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import logoImg from '@/assets/logo.png'

export const EnhancedTaskBoard = () => {
  const { authUser, logout } = useAuth()
  
  // Set up realtime updates
  useRealtimeTasks()

  // Fetch tasks with real-time updates
  const { 
    data: tasks = [], 
    isLoading, 
    refetch: refreshTasks 
  } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.getAll,
    refetchInterval: 30000, // Backup polling every 30 seconds
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
      {/* Clean Header */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="Business Operations" className="w-8 h-8 rounded-lg" />
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-semibold text-foreground">Business Operations</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Welcome back, {authUser?.username}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 sm:mb-8 bg-muted/50 h-auto p-1">
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
            <TabsTrigger value="business-map" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs sm:text-sm py-2 px-2 sm:px-4">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Business</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            <MainDashboard tasks={tasks} />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4 sm:space-y-6">
            <Dashboard user={{username: authUser?.username || 'Unknown', user_id: authUser?.user_id || ''}} />
          </TabsContent>

          <TabsContent value="map" className="space-y-4 sm:space-y-6">
            <MapTab tasks={tasks} onTaskUpdate={refreshTasks} />
          </TabsContent>

          <TabsContent value="business-map" className="space-y-4 sm:space-y-6">
            <BusinessMapTab tasks={tasks} onTaskUpdate={refreshTasks} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}