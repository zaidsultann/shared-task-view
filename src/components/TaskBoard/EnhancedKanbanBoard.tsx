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
import { Circle, Clock, CheckCircle, Bell, Upload, MessageSquare, ThumbsUp, Eye, Building, User, Trash2, RotateCcw, ChevronDown, ChevronRight, Download, Archive } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks'

interface EnhancedKanbanBoardProps {
  tasks: Task[]
  currentUser: string
  currentUsername: string
  onUpdate: () => void
  profiles?: { user_id: string; username: string }[]
}

export const EnhancedKanbanBoard = ({ tasks, currentUser, currentUsername, onUpdate, profiles = [] }: EnhancedKanbanBoardProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showViewFeedbackModal, setShowViewFeedbackModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [revertConfirmTask, setRevertConfirmTask] = useState<Task | null>(null)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const { authUser } = useAuth()

  const activeTasks = tasks.filter(task => !task.is_deleted && !task.is_archived)
  
  // Enhanced status categorization - removed old in_progress filter
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

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      console.log('EnhancedKanbanBoard: Deleting task:', taskToDelete.id)
      await tasksApi.delete(taskToDelete.id)
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
    } finally {
      setShowDeleteDialog(false)
      setTaskToDelete(null)
    }
  }

  const getDeleteConfirmationMessage = (task: Task) => {
    // Get creator and claimer names with better fallback
    const creatorProfile = profiles.find(p => p.user_id === task.created_by);
    const claimerProfile = profiles.find(p => p.user_id === task.claimed_by);
    
    // Better fallback: try to get email from user ID if username not available
    const creatorName = creatorProfile?.username || `User ${task.created_by?.slice(-4)}`;
    const claimerName = claimerProfile?.username || `User ${task.claimed_by?.slice(-4)}`;
    
    const isCreator = task.created_by === currentUser;
    const isClaimer = task.claimed_by === currentUser;
    const isOwner = isCreator || isClaimer;
    
    if (isOwner) {
      return `Are you sure you want to delete your own task: ${task.business_name}?`;
    }
    
    // Different messages based on task status/section
    if (task.status === 'open') {
      return `This task was created by ${creatorName}. Are you sure you want to delete it?`;
    } else if (task.claimed_by && task.created_by !== task.claimed_by) {
      return `This task was created by ${creatorName} and claimed by ${claimerName}. Are you sure you want to delete it?`;
    } else {
      return `This task was created by ${creatorName}. Are you sure you want to delete it?`;
    }
  };

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

  const handleMapStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      console.log('EnhancedKanbanBoard: Updating map status:', { taskId, newStatus })
      await tasksApi.updateMapStatus(taskId, newStatus)
      console.log('EnhancedKanbanBoard: Map status updated successfully, calling onUpdate...')

      toast({
        title: "Status Updated",
        description: `Map status updated to ${newStatus === 'blue' ? 'Follow-up' :
                     newStatus === 'yellow' ? 'Payment pending' :
                     newStatus === 'red' ? 'Not visited' :
                     newStatus === 'green' ? 'Approved' :
                     newStatus === 'gray' ? 'Not interested' : 'Unknown'}`,
      })

      // Force immediate refresh
      await onUpdate()
      console.log('EnhancedKanbanBoard: onUpdate completed after map status update')
    } catch (error) {
      console.error('EnhancedKanbanBoard: Error updating map status:', error)
      toast({
        title: "Update Failed",
        description: "Failed to update status. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleArchiveTask = async (task: Task) => {
    try {
      console.log('EnhancedKanbanBoard: Archiving task:', task.id)
      await tasksApi.archive(task.id)
      console.log('EnhancedKanbanBoard: Task archived successfully, calling onUpdate...')

      toast({
        title: "Task Archived",
        description: `${task.business_name} has been moved to archive.`,
      })

      // Force immediate refresh
      await onUpdate()
      console.log('EnhancedKanbanBoard: onUpdate completed after archive')
    } catch (error) {
      console.error('EnhancedKanbanBoard: Error archiving task:', error)
      toast({
        title: "Archive Failed",
        description: "Failed to archive task. Please try again.",
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

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  const getStatusBadge = (task: Task) => {
    switch (task.status) {
      case 'open':
        return <Badge className="bg-green-500 text-white text-xs">Open</Badge>;
      case 'in_progress_no_file':
        return <Badge className="bg-orange-500 text-white text-xs">Needs Upload</Badge>;
      case 'in_progress_with_file':
      case 'awaiting_approval':
        return <Badge className="bg-yellow-500 text-white text-xs">Awaiting Approval</Badge>;
      case 'feedback_needed':
        return <Badge className="bg-red-500 text-white flex items-center gap-1 text-xs">
          <Bell className="h-3 w-3" />
          Changes Needed
        </Badge>;
      case 'completed':
        return <Badge className="bg-blue-500 text-white text-xs">Completed</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{task.status}</Badge>;
    }
  }

  const EnhancedTaskCard = ({ task }: { task: Task }) => {
    const isExpanded = expandedTasks.has(task.id)
    
    return (
      <TooltipProvider>
        <Collapsible open={isExpanded} onOpenChange={() => toggleTaskExpansion(task.id)}>
          <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
            {/* Collapsible Header */}
            <CollapsibleTrigger className="w-full p-4 text-left hover:bg-gray-50/50 transition-colors flex items-center">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-base leading-tight">
                      {task.business_name}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Clean header for completed tasks - only show chevron */}
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CollapsibleTrigger>

            {/* Collapsible Content */}
            <CollapsibleContent>
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t bg-gray-50/30">
                
                {/* Task brief */}
                <div className="text-sm text-gray-700 pt-3">
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
                 <div className="flex gap-2 pt-2">
                  {/* Open Tasks */}
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
                        onClick={() => {
                          setTaskToDelete(task)
                          setShowDeleteDialog(true)
                        }}
                        className="h-9 px-3"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  
                   {/* Needs Upload */}
                   {task.status === 'in_progress_no_file' && (
                     <>
                       {task.taken_by === currentUsername ? (
                         <Button
                           onClick={() => {
                             setSelectedTask(task)
                             setShowUploadModal(true)
                           }}
                           className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm h-9"
                         >
                           <Upload className="h-4 w-4 mr-2" />
                           Upload File
                         </Button>
                       ) : (
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Button
                               disabled
                               className="flex-1 bg-gray-300 text-gray-500 text-sm h-9 cursor-not-allowed"
                             >
                               <Upload className="h-4 w-4 mr-2" />
                               Upload File
                             </Button>
                           </TooltipTrigger>
                           <TooltipContent>
                             <p>This task is being handled by {task.taken_by}</p>
                           </TooltipContent>
                         </Tooltip>
                       )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setTaskToDelete(task)
                            setShowDeleteDialog(true)
                          }}
                          className="h-9 px-3"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                     </>
                   )}
                  
                  {/* Awaiting Approval */}
                  {(task.status === 'in_progress_with_file' || task.status === 'awaiting_approval') && (
                    <div className="flex flex-col gap-2 w-full">
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
                           onClick={() => {
                             setTaskToDelete(task)
                             setShowDeleteDialog(true)
                           }}
                           className="h-9 px-3"
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    </div>
                  )}

                  {/* Changes Needed */}
                  {task.status === 'feedback_needed' && (
                    <div className="flex flex-col gap-2 w-full">
                      {/* Feedback button on top */}
                      {task.feedback && task.feedback.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedTask(task)
                            setShowViewFeedbackModal(true)
                          }}
                          className="w-full text-sm h-9 justify-center"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          View Feedback
                        </Button>
                      )}
                      
                       {/* Re-upload and View buttons row */}
                       <div className="flex gap-2">
                         {task.taken_by === currentUsername ? (
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
                         ) : (
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button
                                 disabled
                                 className="flex-1 bg-gray-300 text-gray-500 text-sm h-9 cursor-not-allowed"
                               >
                                 <Upload className="h-4 w-4 mr-2" />
                                 Re-upload
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>This task is being handled by {task.taken_by}</p>
                             </TooltipContent>
                           </Tooltip>
                         )}
                         {task.current_file_url && (
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button
                                 variant="outline"
                                 onClick={() => window.open(task.current_file_url, '_blank')}
                                 size="sm"
                                 className="h-9 px-3"
                               >
                                 <Eye className="h-4 w-4" />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>View File</p>
                             </TooltipContent>
                           </Tooltip>
                         )}
                          {/* NO DELETE BUTTON IN CHANGES NEEDED SECTION */}
                       </div>
                    </div>
                  )}

                  {/* Completed */}
                  {task.status === 'completed' && (
                    <div className="flex flex-col gap-2 w-full">
                      {/* First row: Archive and Revert buttons */}
                      <div className="flex gap-2 justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleArchiveTask(task)
                              }}
                              className="h-9 w-9 p-0 text-gray-600 hover:bg-gray-50"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Archive Task</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setRevertConfirmTask(task)
                              }}
                              className="h-9 w-9 p-0 text-orange-600 hover:bg-orange-50"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Revert Task</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      {/* Second row: Download button */}
                      {task.current_file_url && (
                        <div className="flex">
                          <Button
                            variant="outline"
                            onClick={() => window.open(task.current_file_url, '_blank')}
                            className="flex-1 text-sm h-9"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      )}
                    </div>
                   )}
                </div>
              </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="w-full">
      {/* Mobile Layout - Vertical stacking */}
      <div className="lg:hidden space-y-6 p-4">
        {columns.map((column) => {
          const Icon = column.icon
          
          return (
            <div key={column.title} className="space-y-4">
              {/* Simple Header */}
              <div className="flex items-center gap-3 px-2">
                <div className={`w-6 h-6 rounded-full ${column.color} flex items-center justify-center`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-semibold text-gray-900 text-lg">{column.title}</h2>
                <span className="text-sm text-gray-500">{column.count}</span>
              </div>

              {/* Individual Task Cards */}
              <div className="space-y-3">
                {column.tasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">
                    <Icon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No {column.title.toLowerCase()} tasks</p>
                  </div>
                ) : (
                  column.tasks.map((task) => (
                    <EnhancedTaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop Layout - Vertical Columns */}
      <div className="hidden lg:block p-6">
        <div className="grid grid-cols-5 gap-6">
          {columns.map((column) => {
            const Icon = column.icon
            
            return (
              <div key={column.title} className="flex flex-col space-y-4">
                {/* Simple Column Header */}
                <div className="flex items-center gap-2 px-2">
                  <div className={`w-5 h-5 rounded-full ${column.color}`}></div>
                  <h3 className="font-semibold text-gray-900">{column.title}</h3>
                  <span className="text-sm text-gray-500">{column.count}</span>
                </div>

                {/* Tasks Column */}
                <div className="space-y-3 min-h-[600px]">
                  {column.tasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Icon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No tasks</p>
                    </div>
                  ) : (
                    column.tasks.map((task) => (
                      <EnhancedTaskCard key={task.id} task={task} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
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

      {/* View Feedback Modal */}
      <Dialog open={showViewFeedbackModal} onOpenChange={setShowViewFeedbackModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History - {selectedTask?.business_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTask?.versions && selectedTask.versions.length > 0 ? (
              <div className="max-h-[500px] overflow-y-auto space-y-4">
                {selectedTask.versions.map((version, index) => {
                  // Debug logging
                  console.log('Version History Debug:', {
                    taskId: selectedTask.id,
                    businessName: selectedTask.business_name,
                    versionNumber: version.version,
                    allTaskFeedback: selectedTask.feedback,
                    feedbackForThisVersion: selectedTask.feedback?.filter(f => f.version === version.version)
                  })
                  
                  // Find feedback for this version (using the actual version number from DB)
                  const versionFeedback = selectedTask.feedback?.filter(f => f.version === version.version) || []
                  // Display version number starting from 1 (index + 1)
                  const displayVersionNumber = index + 1
                  
                  return (
                    <div key={`${selectedTask.id}-${index}`} className="border rounded-lg p-4 bg-gray-50">
                      {/* Version Header - No timestamp */}
                      <div className="mb-3">
                        <h4 className="font-semibold text-lg text-gray-900">
                          Version {displayVersionNumber}
                        </h4>
                      </div>
                      
                      {/* File Info with Upload Date */}
                      <div className="bg-white rounded-lg p-3 mb-3 border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Eye className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Uploaded File</p>
                              <p className="text-xs text-gray-500">
                                By {version.uploaded_by || 'Unknown'} • {formatDate(version.uploaded_at)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(version.url, '_blank')}
                            className="h-8"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                      
                      {/* Feedback for this version */}
                      {versionFeedback.length > 0 ? (
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm text-gray-700">Feedback:</h5>
                          {versionFeedback.map((feedback, feedbackIndex) => (
                            <div key={feedbackIndex} className="bg-red-50 border-l-4 border-red-200 p-3 rounded">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-sm text-red-800">
                                  {feedback.user}
                                </span>
                                <span className="text-xs text-red-600">
                                  {formatDate(feedback.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-red-700">{feedback.comment}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-green-50 border-l-4 border-green-200 p-3 rounded">
                          <p className="text-sm text-green-700 font-medium">
                            ✅ No feedback - Version approved
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <Eye className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500">No version history available</p>
              </div>
            )}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setShowViewFeedbackModal(false)}>
                Close
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

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              {taskToDelete && getDeleteConfirmationMessage(taskToDelete)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTask}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  )
}