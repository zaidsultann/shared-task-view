import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  User, 
  Download, 
  Trash2, 
  CheckCircle, 
  PlayCircle, 
  Upload,
  Building,
  ChevronDown,
  ChevronUp
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClaim = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/tasks/${task.id}/claim`, {
        method: "PATCH",
        credentials: "include"
      });
      if (!res.ok) throw new Error('Failed to claim task');
      
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
      const res = await fetch(`http://localhost:8080/api/tasks/${task.id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) throw new Error('Failed to delete task');
      
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
    if (!task.zip_url) return;
    
    try {
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = task.zip_url;
      link.download = `${task.business_name.replace(/\s+/g, '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: `Downloading ${task.business_name} deliverable`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to download file",
        variant: "destructive",
      });
    }
  };

  const handleRevert = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/tasks/${task.id}/revert`, {
        method: "PATCH",
        credentials: "include"
      });
      if (!res.ok) throw new Error('Failed to revert task');
      
      toast({
        title: "Task reverted",
        description: `${task.business_name} is now available for claiming`,
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revert task",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const getStatusBadge = () => {
    switch (task.status) {
      case 'open':
        return <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">Open</div>;
      case 'in_progress':
        return <div className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">In Progress</div>;
      case 'completed':
        return <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">Completed</div>;
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
      <div className="bg-gradient-card rounded-xl shadow-soft border border-white/20 hover-lift transition-all duration-300">
        {/* Compact Header */}
        <div 
          className="p-4 cursor-pointer hover:bg-white/30 transition-colors rounded-t-xl"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Building className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {task.business_name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  Created by {task.created_by}
                </p>
              </div>
              {getStatusBadge()}
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0 ml-2">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t border-white/10">
            {/* Task Brief */}
            <div className="bg-white/50 rounded-lg p-3 border border-white/20">
              <p className="text-sm text-foreground leading-relaxed">
                {task.brief}
              </p>
            </div>

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
            <div className="flex gap-2 pt-3 border-t border-white/10">
              {task.status === 'open' && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleClaim}
                  disabled={isLoading}
                  className="flex-1 hover-lift"
                >
                  <PlayCircle className="h-3 w-3" />
                  Claim Task
                </Button>
              )}

              {task.status === 'in_progress' && task.taken_by === currentUser && (
                <>
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => setShowCompleteModal(true)}
                    className="flex-1 hover-lift"
                  >
                    <Upload className="h-3 w-3" />
                    Complete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevert}
                    disabled={isLoading}
                    className="flex-1 hover-lift"
                  >
                    <PlayCircle className="h-3 w-3" />
                    Revert
                  </Button>
                </>
              )}

              {task.status === 'completed' && task.zip_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="flex-1 hover-lift"
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
                className="hover-lift"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

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