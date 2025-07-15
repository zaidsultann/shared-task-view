import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MainDashboard } from './MainDashboard'
import Dashboard from './Dashboard'
import { MapTab } from './MapTab'
import { useAuth } from '@/hooks/useAuth'
import useRealtimeTasks from '@/hooks/useRealtimeTasks'
import { useQuery } from '@tanstack/react-query'
import { tasks as tasksApi } from '@/lib/api'
import { BarChart3, Kanban, Map, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Business Operations</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {authUser?.username}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Kanban className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Map className="h-4 w-4" />
              Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <MainDashboard tasks={tasks} />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <Dashboard user={{username: authUser?.username || 'Unknown'}} />
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            <MapTab tasks={tasks} onTaskUpdate={refreshTasks} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}