import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Archive, ArchiveRestore, Download, Trash2, CheckSquare } from 'lucide-react';
import { Task } from '@/types/Task';
import { tasks as tasksApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  currentUser: string;
  onUpdate: () => void;
}

const ArchiveModal: React.FC<ArchiveModalProps> = ({ 
  isOpen, 
  onClose, 
  tasks, 
  currentUser,
  onUpdate 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Filter archived tasks
  const archivedTasks = tasks.filter(task => task.is_archived && !task.is_deleted);
  
  const filteredTasks = archivedTasks.filter(task =>
    task.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.brief.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.created_by.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTaskSelect = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(task => task.id));
    }
  };

  const handleUnarchive = async (taskId: string) => {
    try {
      setIsLoading(true);
      await tasksApi.unarchive(taskId);
      toast({
        title: "Success",
        description: "Task unarchived successfully",
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unarchive task",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUnarchive = async () => {
    if (selectedTasks.length === 0) return;
    
    try {
      setIsLoading(true);
      await Promise.all(selectedTasks.map(taskId => tasksApi.unarchive(taskId)));
      toast({
        title: "Success",
        description: `${selectedTasks.length} tasks unarchived successfully`,
      });
      setSelectedTasks([]);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unarchive tasks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    
    try {
      setIsLoading(true);
      await tasksApi.bulkDelete(selectedTasks);
      toast({
        title: "Success",
        description: `${selectedTasks.length} tasks deleted permanently`,
      });
      setSelectedTasks([]);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tasks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoArchive = async () => {
    try {
      setIsLoading(true);
      await tasksApi.autoArchiveOldTasks();
      toast({
        title: "Success",
        description: "Old completed tasks archived automatically",
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to auto-archive old tasks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (task: Task) => {
    if (task.zip_url) {
      window.open(task.zip_url, '_blank');
    }
  };

  const getStatusBadge = (task: Task) => {
    const statusConfig = {
      'open': { label: 'Open', variant: 'secondary' as const },
      'in_progress': { label: 'In Progress', variant: 'default' as const },
      'completed': { label: 'Completed', variant: 'default' as const }
    };

    const config = statusConfig[task.status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archive ({archivedTasks.length} tasks)
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search and Controls */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search archived tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoArchive}
              disabled={isLoading}
            >
              Auto-Archive Old Tasks
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedTasks.length > 0 && (
            <div className="flex gap-2 items-center p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedTasks.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkUnarchive}
                disabled={isLoading}
              >
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Unarchive
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Permanently
              </Button>
            </div>
          )}

          {/* Select All */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm">Select all ({filteredTasks.length} tasks)</span>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8">
                <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No archived tasks found matching your search.' : 'No archived tasks yet.'}
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <Card key={task.id} className="p-4">
                  <CardContent className="p-0">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedTasks.includes(task.id)}
                        onCheckedChange={() => handleTaskSelect(task.id)}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-sm truncate">{task.business_name}</h3>
                          {getStatusBadge(task)}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {task.brief}
                        </p>
                        
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>Created by: {task.created_by}</span>
                          {task.taken_by && <span>Claimed by: {task.taken_by}</span>}
                          <span>Created: {formatDate(task.created_at)}</span>
                          {task.completed_at && <span>Completed: {formatDate(task.completed_at)}</span>}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnarchive(task.id)}
                          disabled={isLoading}
                        >
                          <ArchiveRestore className="h-4 w-4" />
                        </Button>
                        {task.zip_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(task)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ArchiveModal;