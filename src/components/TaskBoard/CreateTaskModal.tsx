import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { tasks as tasksApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { BulkImportModal } from './BulkImportModal';
import { Building, FileText, Plus, Upload } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

const CreateTaskModal = ({ isOpen, onClose, onTaskCreated }: CreateTaskModalProps) => {
  const [businessName, setBusinessName] = useState('');
  const [brief, setBrief] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const { toast } = useToast();
  const { authUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await tasksApi.create({
        business_name: businessName.trim(),
        brief: brief.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        note: note.trim() || undefined
      });

      toast({
        title: "Task created successfully!",
        description: `${businessName} has been added to the board`,
      });
      
      // Reset form
      setBusinessName('');
      setBrief('');
      setPhone('');
      setAddress('');
      setNote('');
      onTaskCreated();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleClose = () => {
    if (!isLoading) {
      setBusinessName('');
      setBrief('');
      setPhone('');
      setAddress('');
      setNote('');
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg bg-gradient-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Plus className="h-5 w-5 text-primary" />
              Create New Tasks
            </DialogTitle>
            <DialogDescription>
              Create a single task or import multiple tasks from a spreadsheet.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Single Task
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Spreadsheet
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="single" className="space-y-4 mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name" className="text-sm font-medium">
                    Business Name
                  </Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="business-name"
                      type="text"
                      placeholder="Enter business or client name"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="pl-10 bg-background/50 backdrop-blur-sm"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brief" className="text-sm font-medium">
                    Task Brief
                  </Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="brief"
                      placeholder="Describe what needs to be done..."
                      value={brief}
                      onChange={(e) => setBrief(e.target.value)}
                      className="pl-10 pt-3 min-h-[80px] bg-background/50 backdrop-blur-sm resize-none"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-background/50 backdrop-blur-sm"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium">
                      Address
                    </Label>
                    <Input
                      id="address"
                      placeholder="Business address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="bg-background/50 backdrop-blur-sm"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note" className="text-sm font-medium">
                    Additional Notes
                  </Label>
                  <Textarea
                    id="note"
                    placeholder="Any additional notes..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-[60px] bg-background/50 backdrop-blur-sm resize-none"
                    disabled={isLoading}
                  />
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
                    disabled={isLoading || !businessName.trim() || !brief.trim()}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Creating...
                      </div>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Task
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="bulk" className="space-y-4 mt-6">
              <Button 
                onClick={() => setShowBulkImport(true)} 
                className="w-full h-32 border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/10 hover:bg-muted/20"
                variant="ghost"
              >
                <div className="text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-sm font-medium">Upload Spreadsheet</div>
                  <div className="text-xs text-muted-foreground">CSV, Excel, or JSON files</div>
                </div>
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onTasksImported={() => {
          setShowBulkImport(false);
          onTaskCreated();
          onClose();
        }}
      />
    </>
  );
};

export default CreateTaskModal;