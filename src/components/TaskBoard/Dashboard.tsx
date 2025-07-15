import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { tasks as tasksApi, auth } from '@/lib/api';
import { 
  Plus, 
  LogOut, 
  History, 
  Archive,
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
import ArchiveModal from './ArchiveModal';

interface DashboardProps {
  user: User;
}

const Dashboard = ({ user }: DashboardProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      console.log('Fetching all tasks for dashboard...')
      const taskData = await tasksApi.getAll()
      console.log('Dashboard received tasks:', taskData)
      setTasks(taskData as Task[])
      setLastUpdate(Date.now())
    } catch (error) {
      console.error('Dashboard fetch error:', error)
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }


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
      await tasksApi.clearHistory()
      
      toast({
        title: "Deleted tasks cleared",
        description: `${deletedTasksCount} deleted tasks have been permanently removed`,
      })
      
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
    const activeTasks = tasks.filter(task => !task.is_deleted && !task.is_archived);
    return {
      total: activeTasks.length,
      open: activeTasks.filter(task => task.status === 'open').length,
      inProgress: activeTasks.filter(task => task.status === 'in_progress').length,
      completed: activeTasks.filter(task => task.status === 'completed').length,
      myTasks: activeTasks.filter(task => task.taken_by === user.username || task.created_by === user.username).length,
      archived: tasks.filter(task => task.is_archived && !task.is_deleted).length,
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
    <div className="space-y-6">
      {/* Action Buttons Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>{stats.open} Open</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span>{stats.inProgress} In Progress</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>{stats.completed} Completed</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTasks}
            className="h-8"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistoryModal(true)}
            className="h-8"
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchiveModal(true)}
            className="h-8"
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive ({stats.archived})
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearHistory}
            disabled={tasks.filter(task => task.is_deleted).length === 0}
            className="h-8"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Deleted
          </Button>
          
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border p-4 text-center">
          <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Circle className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.open}</div>
          <div className="text-sm text-muted-foreground">Open Tasks</div>
        </div>
        
        <div className="bg-card rounded-lg border p-4 text-center">
          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Clock className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.inProgress}</div>
          <div className="text-sm text-muted-foreground">In Progress</div>
        </div>
        
        <div className="bg-card rounded-lg border p-4 text-center">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </div>
        
        <div className="bg-card rounded-lg border p-4 text-center">
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-3">
            <Users className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-primary">{stats.myTasks}</div>
          <div className="text-sm text-muted-foreground">My Tasks</div>
        </div>
      </div>

      {/* Kanban Board */}
      <div>
        <KanbanBoard
          tasks={tasks.filter(task => !task.is_deleted && !task.is_archived)}
          currentUser={user.username}
          onUpdate={fetchTasks}
        />
      </div>

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

      <ArchiveModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        tasks={tasks}
        currentUser={user.username}
        onUpdate={fetchTasks}
      />
    </div>
  );
};

export default Dashboard;