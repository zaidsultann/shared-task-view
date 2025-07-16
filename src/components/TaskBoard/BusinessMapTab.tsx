import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import { Task } from '@/types/Task'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { tasks as tasksApi } from '@/lib/api'
import 'leaflet/dist/leaflet.css'

interface BusinessMapTabProps {
  tasks: Task[]
  onTaskUpdate: () => void
}

interface BusinessStatus {
  value: string
  label: string
  color: string
  iconColor: string
  showOnMap: boolean
}

const businessStatuses: BusinessStatus[] = [
  { value: 'not_visited', label: 'Not Visited', color: '#ef4444', iconColor: 'red', showOnMap: true },
  { value: 'payment_pending', label: 'Payment Pending', color: '#eab308', iconColor: 'yellow', showOnMap: true },
  { value: 'follow_up', label: 'Follow Up', color: '#3b82f6', iconColor: 'blue', showOnMap: true },
  { value: 'complete', label: 'Complete', color: '#22c55e', iconColor: 'green', showOnMap: false },
  { value: 'not_interested', label: 'Not Interested', color: '#6b7280', iconColor: 'gray', showOnMap: false }
]

const createCustomIcon = (color: string) => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path fill="${color}" stroke="#000" stroke-width="1" d="M12.5 0C5.596 0 0 5.596 0 12.5c0 8.5 12.5 28.5 12.5 28.5S25 21 25 12.5C25 5.596 19.404 0 12.5 0z"/>
        <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
      </svg>
    `)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })
}

export const BusinessMapTab = ({ tasks, onTaskUpdate }: BusinessMapTabProps) => {
  const [selectedBusiness, setSelectedBusiness] = useState<Task | null>(null)
  const [businessStatus, setBusinessStatus] = useState('')
  const [businessNote, setBusinessNote] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  // Filter completed tasks with addresses and coordinates
  const mappableTasks = tasks.filter(task => 
    task.status === 'completed' && 
    task.address && 
    task.latitude && 
    task.longitude
  )

  // Get current map status for each business (defaulting to not_visited)
  const getBusinessStatus = (task: Task): BusinessStatus => {
    return businessStatuses.find(status => status.value === (task.map_status || 'not_visited')) || businessStatuses[0]
  }

  // Filter tasks to show on map (exclude complete and not_interested)
  const visibleTasksOnMap = mappableTasks.filter(task => {
    const status = getBusinessStatus(task)
    return status.showOnMap
  })

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

  // Default center (Toronto area)
  const defaultCenter: [number, number] = [43.6532, -79.3832]

  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">Business Locations Map</h2>
        <div className="flex gap-4 text-sm">
          {businessStatuses.filter(status => status.showOnMap).map(status => (
            <div key={status.value} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full border border-black"
                style={{ backgroundColor: status.color }}
              />
              <span>{status.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-96 rounded-lg overflow-hidden border">
        <MapContainer
          center={defaultCenter}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {visibleTasksOnMap.map((task) => {
            const status = getBusinessStatus(task)
            return (
              <Marker
                key={task.id}
                position={[task.latitude!, task.longitude!]}
                icon={createCustomIcon(status.color)}
                eventHandlers={{
                  click: () => handleBusinessClick(task)
                }}
              >
                <Popup>
                  <div className="text-center">
                    <h3 className="font-semibold">{task.business_name}</h3>
                    <p className="text-sm text-gray-600">{status.label}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBusinessClick(task)}
                      className="mt-2"
                    >
                      View Details
                    </Button>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* Business Details Modal */}
      <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Business Details</DialogTitle>
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
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full border border-black"
                            style={{ backgroundColor: status.color }}
                          />
                          {status.label}
                        </div>
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