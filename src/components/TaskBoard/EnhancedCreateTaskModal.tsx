import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { tasks } from '@/lib/api';
import { BulkImportModal } from './BulkImportModal';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export const CreateTaskModal = ({ isOpen, onClose, onTaskCreated }: CreateTaskModalProps) => {
  const [businessName, setBusinessName] = useState('');
  const [brief, setBrief] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await tasks.create({ 
        business_name: businessName, 
        brief,
        phone: phone || undefined,
        address: address || undefined,
        note: note || undefined
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

    setLoading(false);
  };

  const handleClose = () => {
    setBusinessName('');
    setBrief('');
    setPhone('');
    setAddress('');
    setNote('');
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Single Task
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Bulk Import
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter business name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter business address"
                />
              </div>

              <div>
                <Label htmlFor="brief">Brief *</Label>
                <Textarea
                  id="brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Describe the task or demo requirements"
                  required
                  rows={3}
                />
              </div>


              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading || !businessName.trim() || !brief.trim()}>
                  {loading ? 'Creating...' : 'Create Task'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="mt-4">
              <div className="text-center py-8">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Bulk Import Tasks</h3>
                <p className="text-muted-foreground mb-4">
                  Upload a CSV, Excel, or JSON file to create multiple tasks at once
                </p>
                <Button onClick={() => setBulkImportOpen(true)}>
                  Choose File to Import
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <BulkImportModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onTasksImported={() => {
          setBulkImportOpen(false)
          onTaskCreated()
          handleClose()
        }}
      />
    </>
  );
};