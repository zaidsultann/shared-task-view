import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  LogOut, 
  History, 
  Users, 
  RefreshCw,
  BarChart3,
  Trash2,
  Circle,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Task, User } from '@/types/Task';
import KanbanBoard from './KanbanBoard';
import CreateTaskModal from './CreateTaskModal';
import HistoryModal from './HistoryModal';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      const { mockApi } = await import('@/lib/mockApi');
      const data = await mockApi.getTasks();
      setTasks(data);
      setLastUpdate(Date.now());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { mockApi } = await import('@/lib/mockApi');
      await mockApi.logout();
      toast({
        title: "Logged out",
        description: "See you next time!",
      });
      onLogout();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const handleClearHistory = async () => {
    const deletedTasksCount = tasks.filter(task => task.is_deleted).length;
    
    if (deletedTasksCount === 0) {
      toast({
        title: "No deleted tasks",
        description: "There are no deleted tasks to clear",
        variant: "destructive",
      });
      return;
    }
    
    if (!confirm(`Are you sure you want to permanently remove ${deletedTasksCount} deleted task(s)? This action cannot be undone.`)) return;
    
    try {
      const { mockApi } = await import('@/lib/mockApi');
      await mockApi.clearHistory();
      
      toast({
        title: "Deleted tasks cleared",
        description: `${deletedTasksCount} deleted tasks have been permanently removed`,
      });
      
      fetchTasks();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear deleted tasks",
        variant: "destructive",
      });
    }
  };

  const getTaskStats = () => {
    const activeTasks = tasks.filter(task => !task.is_deleted);
    return {
      total: activeTasks.length,
      open: activeTasks.filter(task => task.status === 'open').length,
      inProgress: activeTasks.filter(task => task.status === 'in_progress').length,
      completed: activeTasks.filter(task => task.status === 'completed').length,
      myTasks: activeTasks.filter(task => task.taken_by === user.username || task.created_by === user.username).length,
    };
  };

  useEffect(() => {
    fetchTasks();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchTasks, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const stats = getTaskStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading TaskBoard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg">
      {/* Modern Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-medium">
                  <img 
                    src="/lovable-uploads/c516933f-21f1-40ae-869b-9c8b76ebe1dd.png" 
                    alt="TaskBoard" 
                    className="w-6 h-6"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                    TaskBoard
                  </h1>
                  <p className="text-xs text-muted-foreground">Welcome back, {user.username}</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden lg:flex items-center space-x-6">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/50">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="font-medium">{stats.open}</span>
                  <span className="text-muted-foreground">Open</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/50">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="font-medium">{stats.inProgress}</span>
                  <span className="text-muted-foreground">In Progress</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/50">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="font-medium">{stats.completed}</span>
                  <span className="text-muted-foreground">Completed</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchTasks}
                className="hover-lift"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistoryModal(true)}
                className="hover-lift"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">History</span>
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearHistory}
                disabled={tasks.filter(task => task.is_deleted).length === 0}
                className="hover-lift"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Clear Deleted</span>
              </Button>
              
              <Button
                variant="premium"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="hover-lift"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">New Task</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="hover-lift text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4 animate-fade-in">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
              Task Management Dashboard
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Organize, track, and complete your tasks efficiently. Stay productive with our modern task management system.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
            <div className="bg-gradient-card rounded-xl p-6 text-center hover-lift shadow-soft border border-white/20">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Circle className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.open}</div>
              <div className="text-sm text-muted-foreground">Open Tasks</div>
            </div>
            
            <div className="bg-gradient-card rounded-xl p-6 text-center hover-lift shadow-soft border border-white/20">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-amber-600">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            
            <div className="bg-gradient-card rounded-xl p-6 text-center hover-lift shadow-soft border border-white/20">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            
            <div className="bg-gradient-card rounded-xl p-6 text-center hover-lift shadow-soft border border-white/20">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-primary-600">{stats.myTasks}</div>
              <div className="text-sm text-muted-foreground">My Tasks</div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="animate-scale-in">
            <KanbanBoard
              tasks={tasks}
              currentUser={user.username}
              onUpdate={fetchTasks}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={fetchTasks}
      />

      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        tasks={tasks}
        currentUser={user.username}
      />

      {/* Status Indicator */}
      <div className="fixed bottom-6 right-6 glass rounded-full px-4 py-2 text-xs text-muted-foreground shadow-medium">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span>Last updated: {new Date(lastUpdate).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;