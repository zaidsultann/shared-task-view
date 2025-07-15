import React, { useState } from 'react'
import { Task } from '@/types/Task'
import TaskCard from './TaskCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Circle, Clock, CheckCircle, Bell, Upload, MessageSquare, ThumbsUp, Eye } from 'lucide-react'

interface EnhancedKanbanBoardProps {
  tasks: Task[]
  currentUser: string
  onUpdate: () => void
}

export const EnhancedKanbanBoard = ({ tasks, currentUser, onUpdate }: EnhancedKanbanBoardProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { authUser } = useAuth()

  const activeTasks = tasks.filter(task => !task.is_deleted && !task.is_archived)
  
  // Enhanced status categorization
  const openTasks = activeTasks.filter(task => task.status === 'open')
  const needsUploadTasks = activeTasks.filter(task => task.status === 'in_progress_no_file')
  const awaitingApprovalTasks = activeTasks.filter(task => task.status === 'awaiting_approval')
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
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          taken_by: currentUser,
          status: 'in_progress_no_file',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)

      if (error) throw error

      toast({
        title: "Task claimed",
        description: "You can now upload files for this task",
      })

      onUpdate()
    } catch (error) {
      console.error('Error claiming task:', error)
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
      // Upload file to Supabase Storage
      const fileExt = uploadFile.name.split('.').pop()
      const fileName = `${selectedTask.id}-${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('taskboard-uploads')
        .upload(fileName, uploadFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('taskboard-uploads')
        .getPublicUrl(fileName)

      // Call edge function to update task with new version
      const { error: versionError } = await supabase.functions.invoke('upload_version', {
        body: {
          task_id: selectedTask.id,
          file_url: publicUrl,
          uploaded_by: currentUser
        }
      })

      if (versionError) throw versionError

      toast({
        title: "File uploaded",
        description: "Task moved to awaiting approval",
      })

      setShowUploadModal(false)
      setSelectedTask(null)
      setUploadFile(null)
      onUpdate()
    } catch (error) {
      console.error('Error uploading file:', error)
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
      const { error } = await supabase.functions.invoke('add_feedback', {
        body: {
          task_id: selectedTask.id,
          comment: feedbackText.trim(),
          user: currentUser,
          for_version: selectedTask.versions?.length || 1
        }
      })

      if (error) throw error

      toast({
        title: "Feedback added",
        description: "The team has been notified",
      })

      setShowFeedbackModal(false)
      setSelectedTask(null)
      setFeedbackText('')
      onUpdate()
    } catch (error) {
      console.error('Error adding feedback:', error)
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
      const { error } = await supabase.functions.invoke('approve_task', {
        body: {
          task_id: task.id,
          approved_by: currentUser
        }
      })

      if (error) throw error

      toast({
        title: "Task approved",
        description: "Task moved to completed",
      })

      onUpdate()
    } catch (error) {
      console.error('Error approving task:', error)
      toast({
        title: "Error",
        description: "Failed to approve task",
        variant: "destructive",
      })
    }
  }

  const EnhancedTaskCard = ({ task }: { task: Task }) => {
    const versionCount = Array.isArray(task.versions) ? task.versions.length : 0
    const hasFeedback = task.has_feedback

    return (
      <Card className="hover:shadow-md transition-shadow duration-200 relative">
        {hasFeedback && (
          <div className="absolute top-2 right-2">
            <Bell className="h-4 w-4 text-orange-500 animate-pulse" />
          </div>
        )}
        
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-sm font-medium line-clamp-2">
              {task.business_name}
            </CardTitle>
            {versionCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                v{versionCount}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {task.brief}
          </p>
          
          {task.phone && (
            <p className="text-xs text-muted-foreground mb-2">
              📞 {task.phone}
            </p>
          )}
          
          <div className="flex gap-1 flex-wrap">
            {task.status === 'open' && (
              <Button
                size="sm"
                onClick={() => handleClaimTask(task)}
                className="text-xs h-7"
              >
                Claim Task
              </Button>
            )}
            
            {(task.status === 'in_progress_no_file' && task.taken_by === currentUser) && (
              <Button
                size="sm"
                onClick={() => {
                  setSelectedTask(task)
                  setShowUploadModal(true)
                }}
                className="text-xs h-7"
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload
              </Button>
            )}
            
            {task.status === 'awaiting_approval' && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedTask(task)
                    setShowFeedbackModal(true)
                  }}
                  className="text-xs h-7"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Feedback
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApproveTask(task)}
                  className="text-xs h-7"
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Approve
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
    </div>
  )
}