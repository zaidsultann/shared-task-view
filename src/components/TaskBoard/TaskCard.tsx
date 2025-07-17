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
  Upload,
  Building,
  Bell,
  Eye,
  MessageSquare,
  ThumbsUp,
  Archive,
  Calendar,
  Lock
} from 'lucide-react';
import { Task } from '@/types/Task';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';

interface TaskCardProps {
  task: Task;
  currentUser: string; // This should be the username for comparison with taken_by
  currentUserId: string; // This is the user ID for API calls
  onUpdate: () => void;
  profiles?: { user_id: string; username: string }[]; // For displaying usernames
}

const TaskCard = ({ task, currentUser, currentUserId, onUpdate, profiles = [] }: TaskCardProps) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const { toast } = useToast();

  const handleClaim = async () => {
    setIsLoading(true);
    try {
      console.log('Claiming task:', task.id);
      await tasksApi.claim(task.id);
      console.log('Task claimed successfully, calling onUpdate...');
      
      toast({
        title: "Task claimed!",
        description: `Task moved to "Needs Upload". You can now upload files.`,
      });
      
      // Force immediate refresh
      await onUpdate();
      console.log('onUpdate completed');
    } catch (error) {
      console.error('Error claiming task:', error);
      toast({
        title: "Error",
        description: "Failed to claim task",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleUploadFile = async () => {
    if (!uploadFile) return;
    
    setIsLoading(true);
    try {
      console.log('Uploading file for task:', task.id);
      await tasksApi.uploadFile(task.id, uploadFile);
      console.log('File uploaded successfully, calling onUpdate...');
      
      toast({
        title: "File uploaded!",
        description: `Task moved to "Awaiting Approval"`,
      });
      setShowUploadModal(false);
      setUploadFile(null);
      
      // Force immediate refresh
      await onUpdate();
      console.log('onUpdate completed after upload');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleAddFeedback = async () => {
    if (!feedbackText.trim()) return;
    
    setIsLoading(true);
    try {
      console.log('Adding feedback for task:', task.id);
      await tasksApi.addFeedback(task.id, feedbackText.trim());
      console.log('Feedback added successfully, calling onUpdate...');
      
      toast({
        title: "Feedback sent!",
        description: `Task moved to "Changes Needed"`,
      });
      setShowFeedbackModal(false);
      setFeedbackText('');
      
      // Force immediate refresh
      await onUpdate();
      console.log('onUpdate completed after feedback');
    } catch (error) {
      console.error('Error adding feedback:', error);
      toast({
        title: "Error",
        description: "Failed to send feedback",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      console.log('Approving task:', task.id);
      await tasksApi.approveTask(task.id);
      console.log('Task approved successfully, calling onUpdate...');
      
      toast({
        title: "Task approved!",
        description: `${task.business_name} has been completed`,
      });
      
      // Force immediate refresh
      await onUpdate();
      console.log('onUpdate completed after approval');
    } catch (error) {
      console.error('Error approving task:', error);
      toast({
        title: "Error",
        description: "Failed to approve task",
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
    setShowDeleteDialog(false);
  };

  const getDeleteConfirmationMessage = () => {
    // Get creator and claimer names with better fallback
    const creatorProfile = profiles.find(p => p.user_id === task.created_by);
    const claimerProfile = profiles.find(p => p.user_id === task.claimed_by);
    
    // Clean names by removing "User " prefix and fallback to last 4 digits of user ID
    const cleanName = (name: string) => name?.replace(/^User\s+/, '') || '';
    const creatorName = cleanName(creatorProfile?.username || '') || task.created_by?.slice(-4);
    const claimerName = cleanName(claimerProfile?.username || '') || task.claimed_by?.slice(-4);
    
    const isCreator = task.created_by === currentUserId;
    const isClaimer = task.claimed_by === currentUserId;
    
    // For Open Tasks Section
    if (task.status === 'open') {
      if (isCreator) {
        return `Are you sure you want to delete a task created by yourself?`;
      } else {
        return `This task was created by ${creatorName}. Are you sure you want to delete it?`;
      }
    }
    
    // For sections with claiming (Needs Upload, Awaiting Approval, Changes Needed)
    if (task.claimed_by) {
      // Four different scenarios based on creator/claimer relationship
      if (isCreator && isClaimer) {
        // Created by self, claimed by self
        return `This task was created and claimed by yourself. Are you sure you want to delete it?`;
      } else if (isCreator && !isClaimer) {
        // Created by self, claimed by someone else
        return `This task was created by yourself and claimed by ${claimerName}. Are you sure you want to delete it?`;
      } else if (!isCreator && isClaimer) {
        // Created by someone else, claimed by you
        return `This task was created by ${creatorName} and claimed by you. Are you sure you want to delete it?`;
      } else {
        // Created by someone else, claimed by someone else
        return `This task was created by ${creatorName} and claimed by ${claimerName}. Are you sure you want to delete it?`;
      }
    }
    
    // Fallback for other statuses
    if (isCreator) {
      return `Are you sure you want to delete a task created by yourself?`;
    } else {
      return `This task was created by ${creatorName}. Are you sure you want to delete it?`;
    }
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

  const getStatusBadge = () => {
    switch (task.status) {
      case 'open':
        return <Badge className="bg-green-500 text-white">Open</Badge>;
      case 'in_progress_no_file':
        return <Badge className="bg-orange-500 text-white">Needs Upload</Badge>;
      case 'in_progress_with_file':
      case 'awaiting_approval':
        return <Badge className="bg-yellow-500 text-white">Awaiting Approval</Badge>;
      case 'feedback_needed':
        return <Badge className="bg-red-500 text-white flex items-center gap-1">
          <Bell className="h-3 w-3" />
          Changes Needed
        </Badge>;
      case 'completed':
        return <Badge className="bg-blue-500 text-white">Completed</Badge>;
      default:
        return <Badge variant="secondary">{task.status}</Badge>;
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
          {getStatusBadge()}
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

        {/* Feedback Display for Changes Needed */}
        {task.status === 'feedback_needed' && task.feedback && task.feedback.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800">Feedback Required</span>
            </div>
            <p className="text-sm text-red-700">
              {task.feedback[task.feedback.length - 1]?.comment}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <TooltipProvider>
          <div className="flex gap-2">
            {/* Open Status - Show Claim and Delete Buttons */}
            {task.status === 'open' && (
              <>
                <Button
                  onClick={handleClaim}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Claim Task
                </Button>
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Task</AlertDialogTitle>
                      <AlertDialogDescription>
                        {getDeleteConfirmationMessage()}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Yes, Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {/* Needs Upload - Show Upload Button (with conditional states) and Delete */}
            {task.status === 'in_progress_no_file' && (
              <>
                {task.claimed_by === currentUserId ? (
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    disabled={isLoading}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        disabled
                        className="flex-1 bg-gray-300 text-gray-500 cursor-not-allowed"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Upload File
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Claimed by {(profiles.find(p => p.user_id === task.claimed_by)?.username || '').replace(/^User\s+/, '') || task.claimed_by?.slice(-4)}. Only they can upload.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Task</AlertDialogTitle>
                      <AlertDialogDescription>
                        {getDeleteConfirmationMessage()}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Yes, Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {/* Awaiting Approval - Show View, Feedback, Approve, and Delete Buttons */}
            {(task.status === 'in_progress_with_file' || task.status === 'awaiting_approval') && (
              <>
                {task.current_file_url && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(task.current_file_url, '_blank')}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View File
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowFeedbackModal(true)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Feedback
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Task</AlertDialogTitle>
                      <AlertDialogDescription>
                        {getDeleteConfirmationMessage()}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Yes, Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {/* Changes Needed - Show View, Re-upload (with conditional states), and Delete */}
            {task.status === 'feedback_needed' && (
              <>
                {task.current_file_url && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(task.current_file_url, '_blank')}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View File
                  </Button>
                )}
                {task.claimed_by === currentUserId ? (
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    disabled={isLoading}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Re-upload
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        disabled
                        className="flex-1 bg-gray-300 text-gray-500 cursor-not-allowed"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Re-upload
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Only {(profiles.find(p => p.user_id === task.claimed_by)?.username || '').replace(/^User\s+/, '') || task.claimed_by?.slice(-4)} can re-upload this task.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Task</AlertDialogTitle>
                      <AlertDialogDescription>
                        {getDeleteConfirmationMessage()}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Yes, Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {/* Completed - Show Download, Revert, and Archive Buttons */}
            {task.status === 'completed' && (
              <>
                {task.current_file_url && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(task.current_file_url, '_blank')}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleRevert}
                  disabled={isLoading}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  Revert
                </Button>
                <Button
                  variant="outline"
                  onClick={handleArchive}
                  disabled={isLoading}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".zip,.rar,.7z"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Upload files for task: {task.business_name}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUploadFile} 
                disabled={!uploadFile || isLoading}
              >
                {isLoading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="feedback">Feedback for: {task.business_name}</Label>
              <Textarea
                id="feedback"
                placeholder="Enter your feedback..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFeedbackModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddFeedback} 
                disabled={!feedbackText.trim() || isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Feedback'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskCard;