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
  Trash2,
  Circle,
  Clock,
  CheckCircle,
  Upload
} from 'lucide-react';
import { Task, User } from '@/types/Task';
import { EnhancedKanbanBoard } from './EnhancedKanbanBoard';
import CreateTaskModal from './CreateTaskModal';
import HistoryModal from './HistoryModal';
import ArchiveModal from './ArchiveModal';
import { BulkImportModal } from './BulkImportModal';

interface DashboardProps {
  user: User;
}

const Dashboard = ({ user }: DashboardProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isDragOver, setIsDragOver] = useState(false);
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
    // Updated to exclude old in_progress status and include all sub-statuses
    const inProgressTasks = activeTasks.filter(task => 
      task.status === 'in_progress_no_file' || 
      task.status === 'in_progress_with_file' || 
      task.status === 'awaiting_approval' || 
      task.status === 'feedback_needed'
    );
    const completedTasks = activeTasks.filter(task => task.status === 'completed').length;
    
    return {
      total: activeTasks.length,
      open: activeTasks.filter(task => task.status === 'open').length,
      inProgress: inProgressTasks.length,
      completed: completedTasks,
      myTasks: activeTasks.filter(task => task.taken_by === user.username || task.created_by === user.username).length,
      archived: tasks.filter(task => task.is_archived && !task.is_deleted).length,
    };
  };

  // Drag and drop handlers
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = event.dataTransfer.files?.[0];
    if (!droppedFile) return;

    const allowedTypes = ['.csv', '.xlsx', '.xls', '.json'];
    const fileExtension = '.' + droppedFile.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV, Excel, or JSON file",
        variant: "destructive",
      });
      return;
    }

    setShowBulkImportModal(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragOver(false);
    }
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
    <div 
      className={`space-y-6 transition-all duration-300 ${isDragOver ? 'bg-primary/5 ring-2 ring-primary ring-dashed' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-card border-2 border-dashed border-primary rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Drop your file to import tasks</h3>
            <p className="text-muted-foreground">Supports CSV, Excel, and JSON files</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-primary">Task Management Dashboard</h1>
        <p className="text-muted-foreground">
          Organize, track, and complete your tasks efficiently. Drag and drop files to import tasks.
        </p>
      </div>

      {/* Action Buttons Row - Desktop Optimized */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 lg:gap-6">
          <div className="flex items-center gap-2 text-xs lg:text-base text-muted-foreground">
            <div className="w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-green-500"></div>
            <span>{stats.open} Open</span>
          </div>
          <div className="flex items-center gap-2 text-xs lg:text-base text-muted-foreground">
            <div className="w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-amber-500"></div>
            <span>{stats.inProgress} In Progress</span>
          </div>
          <div className="flex items-center gap-2 text-xs lg:text-base text-muted-foreground">
            <div className="w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-blue-500"></div>
            <span>{stats.completed} Completed</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 lg:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTasks}
            className="h-7 lg:h-10 px-2 lg:px-4"
          >
            <RefreshCw className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden lg:inline lg:ml-2">Refresh</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistoryModal(true)}
            className="h-7 lg:h-10 px-2 lg:px-4 text-xs lg:text-sm"
          >
            <History className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden lg:inline lg:ml-2">History</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchiveModal(true)}
            className="h-7 lg:h-10 px-2 lg:px-4 text-xs lg:text-sm"
          >
            <Archive className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden lg:inline lg:ml-2">Archive ({stats.archived})</span>
            <span className="lg:hidden">({stats.archived})</span>
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearHistory}
            disabled={tasks.filter(task => task.is_deleted).length === 0}
            className="h-7 lg:h-10 px-2 lg:px-4 text-xs lg:text-sm"
          >
            <Trash2 className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden lg:inline lg:ml-2">Clear Deleted</span>
          </Button>
          
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="h-7 lg:h-10 px-2 lg:px-4 text-xs lg:text-sm font-medium"
          >
            <Plus className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden lg:inline lg:ml-2">New Task</span>
            <span className="lg:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Simple Stats Cards Grid - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-card rounded-xl border p-3 sm:p-6 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-4">
            <Circle className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <div className="text-xl sm:text-3xl font-bold text-green-600 mb-1">{stats.open}</div>
          <div className="text-xs sm:text-sm text-muted-foreground font-medium">Open Tasks</div>
        </div>
        
        <div className="bg-card rounded-xl border p-3 sm:p-6 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-4">
            <Clock className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <div className="text-xl sm:text-3xl font-bold text-amber-600 mb-1">{stats.inProgress}</div>
          <div className="text-xs sm:text-sm text-muted-foreground font-medium">In Progress</div>
        </div>
        
        <div className="bg-card rounded-xl border p-3 sm:p-6 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-4">
            <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <div className="text-xl sm:text-3xl font-bold text-blue-600 mb-1">{stats.completed}</div>
          <div className="text-xs sm:text-sm text-muted-foreground font-medium">Completed</div>
        </div>
        
        <div className="bg-card rounded-xl border p-3 sm:p-6 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-4">
            <Users className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <div className="text-xl sm:text-3xl font-bold text-primary mb-1">{stats.myTasks}</div>
          <div className="text-xs sm:text-sm text-muted-foreground font-medium">My Tasks</div>
        </div>
      </div>

      {/* Enhanced Kanban Board */}
      <div>
        <EnhancedKanbanBoard
          tasks={tasks.filter(task => !task.is_deleted && !task.is_archived)}
          currentUser={user.user_id}
          currentUsername={user.username}
          onUpdate={fetchTasks}
        />
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={fetchTasks}
      />

      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onTasksImported={() => {
          setShowBulkImportModal(false);
          fetchTasks();
        }}
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