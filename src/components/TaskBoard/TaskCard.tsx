import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { tasks as tasksApi } from '@/lib/api';
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
  Archive,
  Calendar
} from 'lucide-react';
import { Task } from '@/types/Task';
import CompleteTaskModal from './CompleteTaskModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskCardProps {
  task: Task;
  currentUser: string; // This should be the username for comparison with taken_by
  currentUserId: string; // This is the user ID for API calls
  onUpdate: () => void;
}

const TaskCard = ({ task, currentUser, currentUserId, onUpdate }: TaskCardProps) => {
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClaim = async () => {
    setIsLoading(true);
    try {
      await tasksApi.claim(task.id);
      
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

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      await tasksApi.archive(task.id);
      
      toast({
        title: "Task archived!",
        description: `${task.business_name} has been moved to archive`,
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive task",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    setIsLoading(true);
    try {
      await tasksApi.delete(task.id);
      
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
      await tasksApi.revert(task.id);
      
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

  const getStatusColor = () => {
    switch (task.status) {
      case 'open':
        return 'bg-green-500';
      case 'in_progress':
      case 'in_progress_no_file':
      case 'awaiting_approval':
        return 'bg-amber-500';
      case 'completed':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusDisplay = () => {
    switch (task.status) {
      case 'open':
        return 'Open';
      case 'in_progress':
      case 'in_progress_no_file':
      case 'awaiting_approval':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return task.status;
    }
  };

  const formatDate = (dateString: string | number) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 hover:shadow-md transition-shadow">
        {/* Header with icon and status */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {task.business_name}
              </h3>
              <p className="text-sm text-gray-500">
                Created by {task.created_by}
              </p>
            </div>
          </div>
          <Select value={getStatusDisplay()} disabled>
            <SelectTrigger className={`w-32 h-8 ${getStatusColor()} text-white border-0 focus:ring-0`}>
              <SelectValue />
              <ChevronDown className="h-4 w-4 ml-1" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task brief */}
        <div className="text-sm text-gray-700">
          {task.brief}
        </div>

        {/* Task details with icons */}
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3" />
            <span>Created by {task.created_by}</span>
          </div>
          
          {task.taken_by && (
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span>Claimed by {task.taken_by}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>Created {formatDate(task.created_at)}</span>
          </div>
          
          {task.completed_at && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>Completed {formatDate(task.completed_at)}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {task.status === 'open' && (
            <>
              <Button
                onClick={handleClaim}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Claim Task
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isLoading}
                className="w-10 h-10 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}

          {(task.status === 'in_progress' || task.status === 'in_progress_no_file') && task.taken_by === currentUser && (
            <>
              <Button
                onClick={() => setShowCompleteModal(true)}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Complete
              </Button>
              <Button
                variant="outline"
                onClick={handleRevert}
                disabled={isLoading}
                className="flex-1"
              >
                Revert
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isLoading}
                className="w-10 h-10 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}

          {task.status === 'completed' && (
            <>
              {task.zip_url && (
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleArchive}
                disabled={isLoading}
                className="flex-1"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isLoading}
                className="w-10 h-10 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
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