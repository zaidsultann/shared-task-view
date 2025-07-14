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
  Trash2
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
    if (!confirm('Are you sure you want to clear all task history? This action cannot be undone.')) return;
    
    try {
      const { mockApi } = await import('@/lib/mockApi');
      await mockApi.clearHistory();
      
      toast({
        title: "History cleared",
        description: "All tasks have been removed",
      });
      
      fetchTasks();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear history",
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
      {/* Header */}
      <header className="bg-gradient-card border-b border-border shadow-elevated sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <img 
                src="/lovable-uploads/c516933f-21f1-40ae-869b-9c8b76ebe1dd.png" 
                alt="TaskBoard Logo" 
                className="h-8 w-8"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">TaskBoard</h1>
                <p className="text-xs text-muted-foreground">Welcome back, {user.username}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium text-foreground">{stats.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">My Tasks:</span>
                <span className="font-medium text-foreground">{stats.myTasks}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTasks}
                title="Refresh tasks"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistoryModal(true)}
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">History</span>
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearHistory}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Clear</span>
              </Button>
              
              <Button
                variant="premium"
                size="sm"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">New Task</span>
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogout}
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
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-card border border-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-task-open">{stats.open}</div>
              <div className="text-sm text-muted-foreground">Open</div>
            </div>
            <div className="bg-gradient-card border border-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-task-progress">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="bg-gradient-card border border-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-task-complete">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="bg-gradient-card border border-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.myTasks}</div>
              <div className="text-sm text-muted-foreground">My Tasks</div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="min-h-[600px]">
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

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-gradient-card border border-border rounded-lg px-3 py-2 shadow-elevated">
        Last updated: {new Date(lastUpdate).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default Dashboard;