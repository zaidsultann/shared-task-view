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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {columns.map((column) => {
        const Icon = column.icon;
        
        return (
          <div key={column.title} className="flex flex-col h-full">
            {/* Column Header */}
            <Card className="mb-4 bg-gradient-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-lg">{column.title}</span>
                  </div>
                  <Badge className={`${column.color} ${column.textColor} px-2 py-1`}>
                    {column.count}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Tasks Container */}
            <div className="flex-1 min-h-0">
              <div className="space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar">
                {column.tasks.length === 0 ? (
                  <Card className="bg-gradient-card border-dashed border-border/50">
                    <CardContent className="flex items-center justify-center py-8">
                      <div className="text-center space-y-2">
                        <Icon className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                        <p className="text-sm text-muted-foreground">
                          No {column.title.toLowerCase()} tasks
                        </p>
                        {column.title === 'Open' && (
                          <p className="text-xs text-muted-foreground">
                            Create a new task to get started
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  column.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      currentUser={currentUser}
                      onUpdate={onUpdate}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;