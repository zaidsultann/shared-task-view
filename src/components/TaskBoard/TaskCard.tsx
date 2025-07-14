import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  User, 
  Download, 
  Trash2, 
  CheckCircle, 
  PlayCircle, 
  Upload,
  Building
} from 'lucide-react';
import { Task } from '@/types/Task';
import CompleteTaskModal from './CompleteTaskModal';

interface TaskCardProps {
  task: Task;
  currentUser: string;
  onUpdate: () => void;
}

const TaskCard = ({ task, currentUser, onUpdate }: TaskCardProps) => {
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClaim = async () => {
    setIsLoading(true);
    try {
      const { mockApi } = await import('@/lib/mockApi');
      await mockApi.claimTask(task.id, currentUser);
      
      toast({
        title: "Task claimed!",
        description: `You are now working on ${task.business_name}`,
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to claim task",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    setIsLoading(true);
    try {
      const { mockApi } = await import('@/lib/mockApi');
      await mockApi.deleteTask(task.id);
      
      toast({
        title: "Task deleted",
        description: `${task.business_name} has been removed`,
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleDownload = async () => {
    if (!task.zip_path) return;
    
    try {
      const response = await fetch(`/api/tasks/${task.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${task.business_name.replace(/\s+/g, '_')}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Download started",
          description: `Downloading ${task.business_name} deliverable`,
        });
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to download file",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    switch (task.status) {
      case 'open':
        return <Badge className="bg-task-open text-success-foreground">Open</Badge>;
      case 'in_progress':
        return <Badge className="bg-task-progress text-warning-foreground">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-task-complete text-primary-foreground">Completed</Badge>;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Card className="bg-gradient-card border-border hover:border-primary/30 transition-all duration-300 hover:shadow-elevated group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
                {task.business_name}
              </h3>
            </div>
            {getStatusBadge()}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {task.brief}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Task Info */}
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span>Created by {task.created_by}</span>
            </div>
            
            {task.taken_by && (
              <div className="flex items-center gap-2">
                <PlayCircle className="h-3 w-3" />
                <span>Claimed by {task.taken_by}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Created {formatDate(task.created_at)}</span>
            </div>
            
            {task.completed_at && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                <span>Completed {formatDate(task.completed_at)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border/50">
            {task.status === 'open' && (
              <Button
                variant="success"
                size="sm"
                onClick={handleClaim}
                disabled={isLoading}
                className="flex-1"
              >
                <PlayCircle className="h-3 w-3" />
                Claim Task
              </Button>
            )}

            {task.status === 'in_progress' && task.taken_by === currentUser && (
              <Button
                variant="warning"
                size="sm"
                onClick={() => setShowCompleteModal(true)}
                className="flex-1"
              >
                <Upload className="h-3 w-3" />
                Complete
              </Button>
            )}

            {task.status === 'completed' && task.zip_path && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex-1"
              >
                <Download className="h-3 w-3" />
                Download
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <CompleteTaskModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        task={task}
        onComplete={onUpdate}
      />
    </>
  );
};

export default TaskCard;