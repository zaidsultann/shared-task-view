import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Building,
  AlertCircle,
  MessageSquare
} from 'lucide-react'
import { Task } from '@/types/Task'

interface MainDashboardProps {
  tasks: Task[]
}

export const MainDashboard = ({ tasks }: MainDashboardProps) => {
  const stats = useMemo(() => {
    const activeTasks = tasks.filter(t => !t.is_deleted && !t.is_archived)
    
    const totalDemos = activeTasks.length
    const completedTasks = activeTasks.filter(t => t.status === 'completed').length
    const inProgressTasks = activeTasks.filter(t => 
      t.status === 'in_progress_no_file' || 
      t.status === 'in_progress_with_file' || 
      t.status === 'feedback_needed' ||
      t.status === 'in_progress' ||
      t.status === 'awaiting_approval'
    ).length
    const awaitingApproval = activeTasks.filter(t => t.status === 'awaiting_approval' || t.status === 'in_progress_with_file').length
    const feedbackNeeded = activeTasks.filter(t => t.status === 'feedback_needed').length
    
    // Unique businesses count
    const uniqueBusinesses = new Set(activeTasks.map(t => t.business_name.toLowerCase())).size
    
    // Businesses with feedback
    const tasksWithFeedback = activeTasks.filter(t => t.has_feedback).length
    
    // Completion rate
    const completionRate = totalDemos > 0 ? (completedTasks / totalDemos) * 100 : 0
    
    // Recent activity (last 7 days)
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    const recentTasks = activeTasks.filter(t => t.created_at > weekAgo).length
    
    return {
      totalDemos,
      completedTasks,
      inProgressTasks,
      awaitingApproval,
      feedbackNeeded,
      uniqueBusinesses,
      tasksWithFeedback,
      completionRate,
      recentTasks
    }
  }, [tasks])

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    change, 
    color = "default" 
  }: {
    title: string
    value: string | number
    icon: any
    change?: string
    color?: "default" | "success" | "warning" | "danger"
  }) => {
    const colorClasses = {
      default: "text-foreground",
      success: "text-green-600",
      warning: "text-yellow-600", 
      danger: "text-red-600"
    }

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${colorClasses[color]}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {change && (
            <p className="text-xs text-muted-foreground">
              {change}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your business development activities
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Demos"
          value={stats.totalDemos}
          icon={Users}
          change={`${stats.recentTasks} created this week`}
        />
        <StatCard
          title="Completed"
          value={stats.completedTasks}
          icon={CheckCircle}
          color="success"
          change={`${stats.completionRate.toFixed(1)}% completion rate`}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgressTasks}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Unique Businesses"
          value={stats.uniqueBusinesses}
          icon={Building}
        />
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Awaiting Approval"
          value={stats.awaitingApproval}
          icon={AlertCircle}
          color="warning"
        />
        <StatCard
          title="Feedback Needed"
          value={stats.feedbackNeeded}
          icon={MessageSquare}
          color="danger"
        />
        <StatCard
          title="With Feedback"
          value={stats.tasksWithFeedback}
          icon={MessageSquare}
          color="warning"
        />
      </div>

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Completion Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span>{stats.completionRate.toFixed(1)}%</span>
              </div>
              <Progress value={stats.completionRate} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Completed:</span>
                <span className="ml-2 font-medium">{stats.completedTasks}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining:</span>
                <span className="ml-2 font-medium">{stats.totalDemos - stats.completedTasks}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Business Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Completed</span>
                </div>
                <span className="font-medium">{stats.completedTasks}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Awaiting Approval</span>
                </div>
                <span className="font-medium">{stats.awaitingApproval}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">Feedback Needed</span>
                </div>
                <span className="font-medium">{stats.feedbackNeeded}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">In Progress</span>
                </div>
                <span className="font-medium">{stats.inProgressTasks}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.tasksWithFeedback}</div>
              <div className="text-sm text-muted-foreground">Tasks with Feedback</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.awaitingApproval}</div>
              <div className="text-sm text-muted-foreground">Pending Approval</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.recentTasks}</div>
              <div className="text-sm text-muted-foreground">Created This Week</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}