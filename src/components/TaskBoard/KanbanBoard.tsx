import { Task } from '@/types/Task';
import TaskCard from './TaskCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Circle, Clock, CheckCircle } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  currentUser: string;
  onUpdate: () => void;
}

const KanbanBoard = ({ tasks, currentUser, onUpdate }: KanbanBoardProps) => {
  const activeTasks = tasks.filter(task => !task.is_deleted);
  
  const openTasks = activeTasks.filter(task => task.status === 'open');
  const inProgressTasks = activeTasks.filter(task => task.status === 'in_progress');
  const completedTasks = activeTasks.filter(task => task.status === 'completed');

  const columns = [
    {
      title: 'Open',
      tasks: openTasks,
      count: openTasks.length,
      icon: Circle,
      color: 'bg-task-open',
      textColor: 'text-success-foreground'
    },
    {
      title: 'In Progress',
      tasks: inProgressTasks,
      count: inProgressTasks.length,
      icon: Clock,
      color: 'bg-task-progress',
      textColor: 'text-warning-foreground'
    },
    {
      title: 'Completed',
      tasks: completedTasks,
      count: completedTasks.length,
      icon: CheckCircle,
      color: 'bg-task-complete',
      textColor: 'text-primary-foreground'
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {columns.map((column) => {
        const Icon = column.icon;
        
        return (
          <div key={column.title} className="space-y-4">
            {/* Modern Column Header */}
            <div className="bg-gradient-card rounded-xl p-4 shadow-soft border border-white/20 hover-lift">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    column.title === 'Open' ? 'bg-gradient-to-br from-green-400 to-green-600' :
                    column.title === 'In Progress' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                    'bg-gradient-to-br from-blue-400 to-blue-600'
                  }`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{column.title}</h3>
                    <p className="text-sm text-muted-foreground">{column.count} tasks</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  column.title === 'Open' ? 'bg-green-100 text-green-700' :
                  column.title === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {column.count}
                </div>
              </div>
            </div>

            {/* Tasks Container */}
            <div className="space-y-3 min-h-[400px]">
              {column.tasks.length === 0 ? (
                <div className="bg-gradient-card rounded-xl p-8 text-center border border-dashed border-white/30">
                  <Icon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">
                    No {column.title.toLowerCase()} tasks
                  </p>
                  {column.title === 'Open' && (
                    <p className="text-sm text-muted-foreground/70">
                      Create your first task to get started
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                  {column.tasks.map((task, index) => (
                    <div 
                      key={task.id} 
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <TaskCard
                        task={task}
                        currentUser={currentUser}
                        onUpdate={onUpdate}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;