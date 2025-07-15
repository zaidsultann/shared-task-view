import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, File, CheckCircle, X } from 'lucide-react';
import { Task } from '@/types/Task';

interface CompleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onComplete: () => void;
}

const CompleteTaskModal = ({ isOpen, onClose, task, onComplete }: CompleteTaskModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
      toast({
        title: "Invalid file type",
        description: "Please select a ZIP file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 500 * 1024 * 1024) { // 500MB limit
      toast({
        title: "File too large",
        description: "File size must be under 500MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a ZIP file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Get user ID from auth or mock session
      let userId = user?.id
      if (!userId) {
        const mockSession = localStorage.getItem('mockUserSession')
        if (mockSession) {
          const session = JSON.parse(mockSession)
          userId = session.user_id
        } else {
          throw new Error('Not authenticated')
        }
      }

      // Upload file to Supabase Storage with demos/ prefix
      const fileName = `demos/${Date.now()}_${selectedFile.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('taskboard-uploads')
        .upload(fileName, selectedFile, {
          contentType: selectedFile.type || 'application/zip'
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('taskboard-uploads')
        .getPublicUrl(fileName)

      // Update task
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          zip_url: urlData.publicUrl
        })
        .eq('id', task.id)
        .eq('taken_by', userId)
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Task completed!",
        description: `${task.business_name} has been marked as completed`,
      });
      
      setSelectedFile(null);
      onComplete();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete task",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedFile(null);
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gradient-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle className="h-5 w-5 text-success" />
            Complete Task
          </DialogTitle>
          <DialogDescription>
            Upload the deliverable file to mark this task as completed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-background/30 rounded-lg border border-border/50">
            <h3 className="font-medium text-card-foreground mb-1">{task.business_name}</h3>
            <p className="text-sm text-muted-foreground">{task.brief}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Upload Deliverable (ZIP file)
              </Label>
              
              {/* Drag and Drop Area */}
              <div
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
                  ${dragOver 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-accent/20'
                  }
                  ${selectedFile ? 'bg-success/5 border-success' : ''}
                `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                  disabled={isLoading}
                />
                
                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-success">
                      <File className="h-8 w-8" />
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="mt-2"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        Drop your ZIP file here, or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Maximum file size: 500MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !selectedFile}
                className="flex-1"
                variant="success"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-success-foreground/30 border-t-success-foreground rounded-full animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Complete Task
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompleteTaskModal;