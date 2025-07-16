import React, { useState } from 'react'
import { Task } from '@/types/Task'
import TaskCard from './TaskCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { tasks as tasksApi } from '@/lib/api'
import { Circle, Clock, CheckCircle, Bell, Upload, MessageSquare, ThumbsUp, Eye, Building, User, Trash2, RotateCcw } from 'lucide-react'

interface EnhancedKanbanBoardProps {
  tasks: Task[]
  currentUser: string
  currentUsername: string
  onUpdate: () => void
}

export const EnhancedKanbanBoard = ({ tasks, currentUser, currentUsername, onUpdate }: EnhancedKanbanBoardProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [revertConfirmTask, setRevertConfirmTask] = useState<Task | null>(null)
  const { toast } = useToast()
  const { authUser } = useAuth()

  const activeTasks = tasks.filter(task => !task.is_deleted && !task.is_archived)
  
  // Enhanced status categorization for new workflow
  const openTasks = activeTasks.filter(task => task.status === 'open')
  const needsUploadTasks = activeTasks.filter(task => task.status === 'in_progress_no_file')
  const awaitingApprovalTasks = activeTasks.filter(task => 
    task.status === 'in_progress_with_file' || task.status === 'awaiting_approval'
  )
  const feedbackNeededTasks = activeTasks.filter(task => task.status === 'feedback_needed')
  const completedTasks = activeTasks.filter(task => task.status === 'completed')

  const columns = [
    {
      title: 'Open',
      tasks: openTasks,
      count: openTasks.length,
      icon: Circle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'Needs Upload',
      tasks: needsUploadTasks,
      count: needsUploadTasks.length,
      icon: Upload,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    {
      title: 'Awaiting Approval',
      tasks: awaitingApprovalTasks,
      count: awaitingApprovalTasks.length,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    {
      title: 'Changes Needed',
      tasks: feedbackNeededTasks,
      count: feedbackNeededTasks.length,
      icon: Bell,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    {
      title: 'Completed',
      tasks: completedTasks,
      count: completedTasks.length,
      icon: CheckCircle,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    }
  ]

  const handleClaimTask = async (task: Task) => {
    console.log('EnhancedKanbanBoard: handleClaimTask called with task:', task.id)
    console.log('EnhancedKanbanBoard: Current user info:', { currentUser, currentUsername })
    
    try {
      console.log('EnhancedKanbanBoard: About to call tasksApi.claim...')
      await tasksApi.claim(task.id)
      console.log('EnhancedKanbanBoard: Task claimed successfully, calling onUpdate...')

      toast({
        title: "Task claimed",
        description: "You can now upload files for this task",
      })

      // Force immediate refresh
      await onUpdate()
      console.log('EnhancedKanbanBoard: onUpdate completed after claim')
    } catch (error) {
      console.error('EnhancedKanbanBoard: Error claiming task:', error)
      toast({
        title: "Error",
        description: "Failed to claim task",
        variant: "destructive",
      })
    }
  }

  const handleUploadFile = async () => {
    if (!uploadFile || !selectedTask || !authUser) return

    setIsSubmitting(true)
    try {
      console.log('EnhancedKanbanBoard: Uploading file for task:', selectedTask.id)
      await tasksApi.uploadFile(selectedTask.id, uploadFile)
      console.log('EnhancedKanbanBoard: File uploaded successfully, calling onUpdate...')

      toast({
        title: "File uploaded",
        description: "Task moved to awaiting approval",
      })

      setShowUploadModal(false)
      setSelectedTask(null)
      setUploadFile(null)
      
      // Force immediate refresh
      await onUpdate()
      console.log('EnhancedKanbanBoard: onUpdate completed after upload')
    } catch (error) {
      console.error('EnhancedKanbanBoard: Error uploading file:', error)
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddFeedback = async () => {
    if (!feedbackText.trim() || !selectedTask || !authUser) return

    setIsSubmitting(true)
    try {
      console.log('EnhancedKanbanBoard: Adding feedback for task:', selectedTask.id)
      await tasksApi.addFeedback(selectedTask.id, feedbackText.trim())
      console.log('EnhancedKanbanBoard: Feedback added successfully, calling onUpdate...')

      toast({
        title: "Feedback added",
        description: "Task moved to changes needed",
      })

      setShowFeedbackModal(false)
      setSelectedTask(null)
      setFeedbackText('')
      
      // Force immediate refresh
      await onUpdate()
      console.log('EnhancedKanbanBoard: onUpdate completed after feedback')
    } catch (error) {
      console.error('EnhancedKanbanBoard: Error adding feedback:', error)
      toast({
        title: "Error",
        description: "Failed to add feedback",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApproveTask = async (task: Task) => {
    try {
      console.log('EnhancedKanbanBoard: Approving task:', task.id, 'Status:', task.status)
      console.log('EnhancedKanbanBoard: Task details:', {
        business_name: task.business_name,
        current_file_url: task.current_file_url,
        status: task.status
      })
      
      await tasksApi.approveTask(task.id)
      console.log('EnhancedKanbanBoard: Task approved successfully, calling onUpdate...')

      toast({
        title: "Task approved",
        description: "Task moved to completed",
      })

      // Force immediate refresh
      await onUpdate()
      console.log('EnhancedKanbanBoard: onUpdate completed after approval')
    } catch (error) {
      console.error('EnhancedKanbanBoard: Error approving task:', error)
      toast({
        title: "Error",
        description: "Failed to approve task",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTask = async (task: Task) => {
    try {
      console.log('EnhancedKanbanBoard: Deleting task:', task.id)
      await tasksApi.delete(task.id)
      console.log('EnhancedKanbanBoard: Task deleted successfully, calling onUpdate...')

      toast({
        title: "Task deleted",
        description: "Task has been moved to deleted",
      })

      // Force immediate refresh
      await onUpdate()
      console.log('EnhancedKanbanBoard: onUpdate completed after delete')
    } catch (error) {
      console.error('EnhancedKanbanBoard: Error deleting task:', error)
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      })
    }
  }

  const handleRevertTask = async (task: Task) => {
    try {
      console.log('EnhancedKanbanBoard: Reverting task:', task.id)
      await tasksApi.revertTask(task.id)
      console.log('EnhancedKanbanBoard: Task reverted successfully, calling onUpdate...')

      toast({
        title: "Task Reverted",
        description: `${task.business_name} has been moved back to In Progress.`,
      })

      // Force immediate refresh
      await onUpdate()
      setRevertConfirmTask(null)
      console.log('EnhancedKanbanBoard: onUpdate completed after revert')
    } catch (error) {
      console.error('EnhancedKanbanBoard: Error reverting task:', error)
      toast({
        title: "Revert Failed",
        description: "Failed to revert task. Please try again.",
        variant: "destructive"
      })
    }
  }
  const formatDate = (dateString: string | number) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const EnhancedTaskCard = ({ task }: { task: Task }) => {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 hover:shadow-md transition-shadow">
        {/* Header with icon and status */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {task.business_name}
              </h3>
              <p className="text-xs text-gray-500">
                Created by {task.created_by}
              </p>
            </div>
          </div>
        </div>

        {/* Task brief */}
        <div className="text-sm text-gray-700">
          {task.brief}
        </div>

        {/* Task details with icons */}
        <div className="space-y-1 text-xs text-gray-500">
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
            <Clock className="h-3 w-3" />
            <span>Created {formatDate(task.created_at)}</span>
          </div>
          
          {task.completed_at && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Completed {formatDate(task.completed_at)}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {task.status === 'open' && (
            <>
              <Button
                onClick={() => {
                  console.log('BUTTON CLICKED! Task:', task.business_name)
                  handleClaimTask(task)
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm h-9"
              >
                Claim Task
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteTask(task)}
                className="h-9 px-3"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {(task.status === 'in_progress_no_file' && task.taken_by === currentUsername) && (
            <div className="flex gap-2 w-full">
              <Button
                onClick={() => {
                  setSelectedTask(task)
                  setShowUploadModal(true)
                }}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm h-9"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRevertTask(task)}
                className="h-9 px-3"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteTask(task)}
                className="h-9 px-3"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {(task.status === 'in_progress_with_file' || task.status === 'awaiting_approval') && (
            <div className="space-y-2 w-full">
              {/* First row: View and Feedback buttons */}
              <div className="flex gap-2">
                {task.current_file_url && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(task.current_file_url, '_blank')}
                    className="flex-1 text-sm h-9"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View File
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTask(task)
                    setShowFeedbackModal(true)
                  }}
                  size="sm"
                  className="h-9 px-3"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Second row: Approve and Delete buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApproveTask(task)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm h-9"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteTask(task)}
                  className="h-9 px-3"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {task.status === 'feedback_needed' && (
            <div className="space-y-2 w-full">
              {/* Show feedback */}
              {task.feedback && task.feedback.length > 0 && (
                <div className="bg-red-50 p-2 rounded text-xs">
                  <strong>Latest feedback:</strong> {task.feedback[task.feedback.length - 1]?.comment}
                </div>
              )}
              <div className="flex gap-2">
                {task.taken_by === currentUsername && (
                  <Button
                    onClick={() => {
                      setSelectedTask(task)
                      setShowUploadModal(true)
                    }}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm h-9"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Re-upload
                  </Button>
                )}
                {task.current_file_url && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(task.current_file_url, '_blank')}
                    className="flex-1 text-sm h-9"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                )}
              </div>
            </div>
          )}

          {task.status === 'completed' && (
            <div className="flex gap-2 w-full">
              {task.current_file_url && (
                <Button
                  variant="outline"
                  onClick={() => window.open(task.current_file_url, '_blank')}
                  className="flex-1 text-sm h-9"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setRevertConfirmTask(task)}
                className="flex-1 text-sm h-9 text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Revert
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {columns.map((column) => {
          const Icon = column.icon
          
          return (
            <div key={column.title} className="space-y-4">
              {/* Column Header */}
              <div className={`${column.bgColor} rounded-lg p-4 border`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${column.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{column.title}</h3>
                      <p className="text-xs text-muted-foreground">{column.count} tasks</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={column.textColor}>
                    {column.count}
                  </Badge>
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-3 min-h-[300px]">
                {column.tasks.length === 0 ? (
                  <div className="bg-muted/30 rounded-lg p-6 text-center border-2 border-dashed">
                    <Icon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No {column.title.toLowerCase()} tasks
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {column.tasks.map((task) => (
                      <EnhancedTaskCard key={task.id} task={task} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
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
                Upload ZIP files for task: {selectedTask?.business_name}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUploadFile} 
                disabled={!uploadFile || isSubmitting}
              >
                {isSubmitting ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="feedback">Feedback for: {selectedTask?.business_name}</Label>
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
                disabled={!feedbackText.trim() || isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Feedback'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation Modal */}
      <AlertDialog open={!!revertConfirmTask} onOpenChange={() => setRevertConfirmTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Task to In Progress</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revert "{revertConfirmTask?.business_name}" back to In Progress? 
              This will remove it from the Completed section and any map pins.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => revertConfirmTask && handleRevertTask(revertConfirmTask)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Revert Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}