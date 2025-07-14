import { useState } from 'react';
import { Task } from '@/types/Task';
import TaskCard from './TaskCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Circle, Clock, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  currentUser: string;
  onUpdate: () => void;
}

const KanbanBoard = ({ tasks, currentUser, onUpdate }: KanbanBoardProps) => {
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({
    'open': true,
    'in_progress': true,
    'completed': false
  });

  const toggleColumn = (columnKey: string) => {
    setExpandedColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const activeTasks = tasks.filter(task => !task.is_deleted);
  
  const openTasks = activeTasks.filter(task => task.status === 'open');
  const inProgressTasks = activeTasks.filter(task => task.status === 'in_progress');
  const completedTasks = activeTasks.filter(task => task.status === 'completed');

  const columns = [
    {
      title: 'Open',
      key: 'open',
      tasks: openTasks,
      count: openTasks.length,
      icon: Circle,
      color: 'bg-task-open',
      textColor: 'text-success-foreground'
    },
    {
      title: 'In Progress',
      key: 'in_progress',
      tasks: inProgressTasks,
      count: inProgressTasks.length,
      icon: Clock,
      color: 'bg-task-progress',
      textColor: 'text-warning-foreground'
    },
    {
      title: 'Completed',
      key: 'completed',
      tasks: completedTasks,
      count: completedTasks.length,
      icon: CheckCircle,
      color: 'bg-task-complete',
      textColor: 'text-primary-foreground'
    }
  ];

  return (
    <div className="space-y-4">
      {columns.map((column) => {
        const Icon = column.icon;
        const isExpanded = expandedColumns[column.key];
        
        return (
          <Card key={column.title} className="bg-gradient-card border-border">
            {/* Column Header - Always Visible */}
            <CardHeader 
              className="pb-3 cursor-pointer hover:bg-muted/20 transition-colors"
              onClick={() => toggleColumn(column.key)}
            >
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-lg">{column.title}</span>
                  <Badge className={`${column.color} ${column.textColor} px-2 py-1`}>
                    {column.count}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CardTitle>
            </CardHeader>

            {/* Collapsible Tasks Content */}
            {isExpanded && (
              <CardContent className="pt-0">
                {column.tasks.length === 0 ? (
                  <div className="bg-muted/30 border border-dashed border-border/50 rounded-lg p-6">
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
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {column.tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        currentUser={currentUser}
                        onUpdate={onUpdate}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default KanbanBoard;