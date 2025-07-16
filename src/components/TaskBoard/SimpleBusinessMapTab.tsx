import React, { useState } from 'react'
import { Task } from '@/types/Task'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, MapPin, Phone, Building2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { tasks as tasksApi } from '@/lib/api'

interface BusinessMapTabProps {
  tasks: Task[]
  onTaskUpdate: () => void
}

interface BusinessStatus {
  value: string
  label: string
  color: string
  showOnMap: boolean
}

const businessStatuses: BusinessStatus[] = [
  { value: 'not_visited', label: 'Not Visited', color: 'destructive', showOnMap: true },
  { value: 'payment_pending', label: 'Payment Pending', color: 'default', showOnMap: true },
  { value: 'follow_up', label: 'Follow Up', color: 'secondary', showOnMap: true },
  { value: 'complete', label: 'Complete', color: 'default', showOnMap: false },
  { value: 'not_interested', label: 'Not Interested', color: 'outline', showOnMap: false }
]

export const SimpleBusinessMapTab = ({ tasks, onTaskUpdate }: BusinessMapTabProps) => {
  const [selectedBusiness, setSelectedBusiness] = useState<Task | null>(null)
  const [businessStatus, setBusinessStatus] = useState('')
  const [businessNote, setBusinessNote] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  // Filter completed tasks with addresses
  const completedTasks = tasks.filter(task => 
    task.status === 'completed' && task.address
  )

  // Get current map status for each business (defaulting to not_visited)
  const getBusinessStatus = (task: Task): BusinessStatus => {
    return businessStatuses.find(status => status.value === (task.map_status || 'not_visited')) || businessStatuses[0]
  }

  // Group tasks by status for display
  const tasksByStatus = businessStatuses.reduce((acc, status) => {
    acc[status.value] = completedTasks.filter(task => {
      const taskStatus = getBusinessStatus(task)
      return taskStatus.value === status.value
    })
    return acc
  }, {} as Record<string, Task[]>)

  const handleBusinessClick = (task: Task) => {
    setSelectedBusiness(task)
    setBusinessStatus(task.map_status || 'not_visited')
    setBusinessNote(task.note || '')
  }

  const handleStatusUpdate = async () => {
    if (!selectedBusiness) return

    setIsUpdating(true)
    try {
      await tasksApi.updateStatus(selectedBusiness.id, selectedBusiness.status, businessStatus)
      
      toast({
        title: "Status updated",
        description: "Business status has been updated successfully",
      })

      setSelectedBusiness(null)
      onTaskUpdate()
    } catch (error) {
      console.error('Error updating business status:', error)
      toast({
        title: "Error",
        description: "Failed to update business status",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleGetDirections = (address: string) => {
    const encodedAddress = encodeURIComponent(address)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank')
  }

  const openInGoogleMaps = () => {
    // Create a map with all business locations
    const addressList = completedTasks
      .filter(task => task.address)
      .map(task => encodeURIComponent(task.address!))
      .join('|')
    
    if (addressList) {
      window.open(`https://www.google.com/maps/search/${addressList}`, '_blank')
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Business Locations</h2>
          <p className="text-muted-foreground">Manage your completed business locations and their status</p>
        </div>
        <Button onClick={openInGoogleMaps} className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          View All on Google Maps
        </Button>
      </div>

      {/* Status Legend */}
      <div className="flex gap-4 text-sm">
        {businessStatuses.map(status => (
          <div key={status.value} className="flex items-center gap-2">
            <Badge variant={status.color as any}>{status.label}</Badge>
            <span className="text-muted-foreground">
              ({tasksByStatus[status.value]?.length || 0})
            </span>
          </div>
        ))}
      </div>

      {/* Business Cards by Status */}
      <div className="space-y-6">
        {businessStatuses.filter(status => status.showOnMap).map(status => (
          <div key={status.value}>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Badge variant={status.color as any}>{status.label}</Badge>
              <span className="text-muted-foreground">({tasksByStatus[status.value]?.length || 0} businesses)</span>
            </h3>
            
            {tasksByStatus[status.value]?.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No businesses in this status</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasksByStatus[status.value]?.map(task => (
                  <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          <CardTitle className="text-base">{task.business_name}</CardTitle>
                        </div>
                        <Badge variant={status.color as any} className="text-xs">
                          {status.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {task.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{task.phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="flex-1">{task.address}</span>
                      </div>

                      {task.note && (
                        <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          {task.note}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGetDirections(task.address!)}
                          className="flex-1"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Directions
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBusinessClick(task)}
                          className="flex-1"
                        >
                          Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Business Details Modal */}
      <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Business</DialogTitle>
          </DialogHeader>
          
          {selectedBusiness && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Business Name</Label>
                <p className="text-lg font-semibold">{selectedBusiness.business_name}</p>
              </div>

              {selectedBusiness.phone && (
                <div>
                  <Label className="text-sm font-medium">Phone Number</Label>
                  <p className="text-sm">{selectedBusiness.phone}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Address</Label>
                <div className="flex items-center gap-2">
                  <p className="text-sm flex-1">{selectedBusiness.address}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGetDirections(selectedBusiness.address!)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Directions
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                <Select value={businessStatus} onValueChange={setBusinessStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessStatuses.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="note" className="text-sm font-medium">Note/Comment</Label>
                <Textarea
                  id="note"
                  placeholder="Add a note..."
                  value={businessNote}
                  onChange={(e) => setBusinessNote(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedBusiness(null)}>
                  Cancel
                </Button>
                <Button onClick={handleStatusUpdate} disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}