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
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">TaskBoard</h1>
              <p className="text-muted-foreground">Welcome back, {authUser?.username}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Main Dashboard
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <Kanban className="h-4 w-4" />
              Task Management
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Central Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <MainDashboard tasks={tasks} />
          </TabsContent>

          <TabsContent value="tasks">
            <Dashboard tasks={tasks} onTaskUpdate={refreshTasks} />
          </TabsContent>

          <TabsContent value="map">
            <MapTab tasks={tasks} onTaskUpdate={refreshTasks} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}