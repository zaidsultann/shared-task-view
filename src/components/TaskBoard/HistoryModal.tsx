import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  Search, 
  Building,
  User,
  Clock,
  Trash2,
  Eye,
  EyeOff,
  Download
} from 'lucide-react';
import { Task } from '@/types/Task';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  currentUser: string;
}

const HistoryModal = ({ isOpen, onClose, tasks, currentUser }: HistoryModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const filteredTasks = tasks
    .filter(task => {
      if (!showDeleted && task.is_deleted) return false;
      if (!searchTerm) return true;
      
      return (
        task.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.brief.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.created_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.taken_by && task.taken_by.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    })
    .sort((a, b) => b.created_at - a.created_at);

  const getStatusBadge = (task: Task) => {
    if (task.is_deleted) {
      return <Badge variant="destructive">Deleted</Badge>;
    }
    
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = async (task: Task) => {
    if (!task.zip_url) return;
    
    try {
      // Create a temporary link and trigger download from Supabase Storage
      const link = document.createElement('a');
      link.href = task.zip_url;
      link.download = `${task.business_name.replace(/\s+/g, '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl h-[85vh] sm:h-[80vh] bg-gradient-card border-border mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Task History
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4 flex-1 flex flex-col min-h-0">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks, businesses, or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 backdrop-blur-sm text-sm"
              />
            </div>
            
            <Button
              variant={showDeleted ? "destructive" : "outline"}
              size="sm"
              onClick={() => setShowDeleted(!showDeleted)}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              {showDeleted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden sm:inline">{showDeleted ? 'Hide' : 'Show'} Deleted</span>
              <span className="sm:hidden">{showDeleted ? 'Hide' : 'Show'}</span>
            </Button>
          </div>

          {/* Task List */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks found</p>
                  {searchTerm && (
                    <p className="text-sm mt-2">Try adjusting your search terms</p>
                  )}
                </div>
              ) : (
                filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`
                        p-3 sm:p-4 rounded-lg border transition-all duration-200 
                        ${task.is_deleted 
                          ? 'bg-background/30 border-destructive/30 opacity-60' 
                          : 'bg-gradient-card border-border hover:border-primary/30'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Building className="h-4 w-4 text-primary flex-shrink-0" />
                          <h3 className="font-semibold text-card-foreground text-sm sm:text-base truncate">
                            {task.business_name}
                          </h3>
                          {task.is_deleted && (
                            <Trash2 className="h-4 w-4 text-destructive flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(task)}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">
                        {task.brief}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">Created by {task.created_by}</span>
                        </div>
                        
                        {task.taken_by && (
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">Claimed by {task.taken_by}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">Created {formatDate(task.created_at)}</span>
                        </div>
                        
                        {task.completed_at && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">Completed {formatDate(task.completed_at)}</span>
                          </div>
                        )}
                      </div>

                      {/* Download button for completed tasks */}
                      {task.status === 'completed' && task.zip_url && !task.is_deleted && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(task)}
                            className="text-xs w-full sm:w-auto"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download Deliverable
                          </Button>
                        </div>
                      )}
                    </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </p>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HistoryModal;