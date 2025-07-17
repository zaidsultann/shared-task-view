import 'leaflet/dist/leaflet.css'
import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ExternalLink, MapPin } from 'lucide-react'
import { Task } from '@/types/Task'
import { tasks as tasksApi } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import useRealtimeTasks from '@/hooks/useRealtimeTasks'

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface MapTabProps {
  tasks: Task[]
  onTaskUpdate: () => void
}

interface TaskModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (task: Task) => void
}

const TaskModal = ({ task, isOpen, onClose, onUpdate }: TaskModalProps) => {
  const [editedTask, setEditedTask] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task })
    }
  }, [task])

  if (!task || !editedTask) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      // Update map_status instead of task status
      await tasksApi.updateMapStatus(editedTask.id, editedTask.map_status || 'pending')
      
      toast({
        title: "Task Updated",
        description: "Task status has been updated successfully."
      })
      
      onUpdate(editedTask)
      onClose()
    } catch (error) {
      console.error('Error updating task:', error)
      toast({
        title: "Update Failed",
        description: "Failed to update task. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const openDirections = () => {
    if (task.latitude && task.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`
      window.open(url, '_blank')
    }
  }

  const statusOptions = [
    { value: 'pending', label: 'Not Visited', color: 'red' },
    { value: 'payment_pending', label: 'Payment Pending', color: 'yellow' },
    { value: 'follow_up', label: 'Follow Up', color: 'blue' },
    { value: 'not_interested', label: 'Not Interested', color: 'gray' },
    { value: 'approved', label: 'Approved', color: 'green' }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto z-[9999]">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ 
                backgroundColor: statusOptions.find(opt => opt.value === (editedTask?.map_status || 'pending'))?.color === 'yellow' ? '#eab308' : 
                               statusOptions.find(opt => opt.value === (editedTask?.map_status || 'pending'))?.color === 'blue' ? '#3b82f6' :
                               statusOptions.find(opt => opt.value === (editedTask?.map_status || 'pending'))?.color === 'gray' ? '#6b7280' : 
                               statusOptions.find(opt => opt.value === (editedTask?.map_status || 'pending'))?.color === 'green' ? '#22c55e' : '#ef4444'
              }}
            />
            <span className="truncate">{task.business_name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Business Info Section */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
                <p className="font-medium text-sm">{task.phone || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
                <p className="font-medium text-sm capitalize">{(editedTask?.map_status || 'pending').replace('_', ' ')}</p>
              </div>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Address</Label>
              <p className="font-medium text-sm leading-relaxed break-words">{task.address || 'Not provided'}</p>
            </div>

            {task.brief && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
                <p className="text-sm leading-relaxed">{task.brief}</p>
              </div>
            )}
          </div>

          {/* Status Update Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Update Status</Label>
            <Select 
              value={editedTask?.map_status || 'pending'} 
              onValueChange={(value: string) => {
                setEditedTask({
                  ...editedTask!,
                  map_status: value
                })
              }}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select status">
                  {editedTask?.map_status ? (
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: statusOptions.find(opt => opt.value === editedTask.map_status)?.color === 'yellow' ? '#eab308' : 
                                         statusOptions.find(opt => opt.value === editedTask.map_status)?.color === 'blue' ? '#3b82f6' :
                                         statusOptions.find(opt => opt.value === editedTask.map_status)?.color === 'gray' ? '#6b7280' : 
                                         statusOptions.find(opt => opt.value === editedTask.map_status)?.color === 'green' ? '#22c55e' : '#ef4444'
                        }}
                      />
                      <span>{statusOptions.find(opt => opt.value === editedTask.map_status)?.label}</span>
                    </div>
                  ) : (
                    "Select status"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-3 py-1">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: option.color === 'yellow' ? '#eab308' : 
                                         option.color === 'blue' ? '#3b82f6' :
                                         option.color === 'gray' ? '#6b7280' : 
                                         option.color === 'green' ? '#22c55e' : '#ef4444'
                        }}
                      />
                      <span className="font-medium">{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Notes</Label>
            <Textarea
              value={editedTask?.note || ''}
              onChange={(e) => setEditedTask({
                ...editedTask!,
                note: e.target.value
              })}
              placeholder="Add any notes or comments about this business..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            {task.latitude && task.longitude && (
              <Button
                variant="outline"
                onClick={openDirections}
                className="w-full h-12 text-primary border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Get Directions in Google Maps
              </Button>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={saving}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="flex-1 h-12"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const MapTab = ({ tasks, onTaskUpdate }: MapTabProps) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const { toast } = useToast()

  // Set up real-time updates for immediate map sync
  useRealtimeTasks(() => {
    console.log('🗺️ MapTab: Realtime update detected, triggering map refresh...')
    onTaskUpdate()
  })

  // Filter tasks for map display - only completed tasks with addresses, exclude green/gray statuses
  const mapTasks = tasks.filter(task => 
    task.status === 'completed' &&
    task.address &&
    !task.is_deleted && 
    !task.is_archived &&
    // Hide green (approved) and gray (not interested) pins
    !['approved', 'not_interested'].includes(task.map_status || 'pending')
  )

  console.log('MapTab: All tasks count:', tasks.length)
  console.log('MapTab: Completed tasks:', tasks.filter(t => t.status === 'completed').length)
  console.log('MapTab: Tasks with addresses:', tasks.filter(t => t.address).length)
  console.log('MapTab: Tasks with coordinates:', tasks.filter(t => t.latitude && t.longitude).length)
  console.log('MapTab: Final map tasks:', mapTasks.length, mapTasks.map(t => ({
    name: t.business_name,
    address: t.address,
    lat: t.latitude,
    lng: t.longitude,
    status: t.status,
    mapStatus: t.map_status
  })))

  const getMarkerColor = (task: Task) => {
    const status = task.map_status || 'pending'
    switch (status) {
      case 'payment_pending':
        return '#eab308' // yellow
      case 'follow_up':
        return '#3b82f6' // blue  
      case 'not_interested':
        return '#6b7280' // gray
      case 'approved':
        return '#22c55e' // green - but these won't show on map
      default:
        return '#ef4444' // red - not visited/pending
    }
  }

  const createCustomIcon = (color: string) => {
    return new L.Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="25" height="41" viewBox="0 0 25 41" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 0C5.59375 0 0 5.59375 0 12.5C0 21.875 12.5 41 12.5 41C12.5 41 25 21.875 25 12.5C25 5.59375 19.4062 0 12.5 0ZM12.5 17.1875C9.84375 17.1875 7.8125 15.1562 7.8125 12.5C7.8125 9.84375 9.84375 7.8125 12.5 7.8125C15.1562 7.8125 17.1875 9.84375 17.1875 12.5C17.1875 15.1562 15.1562 17.1875 12.5 17.1875Z" fill="${color}"/>
        </svg>
      `)}`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    })
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setModalOpen(true)
  }

  const handleTaskUpdate = (updatedTask: Task) => {
    // Update the map markers in real-time
    onTaskUpdate()
    
    // Also close the modal and refresh the current view
    setModalOpen(false)
    setSelectedTask(null)
  }

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return

    // Default center
    const defaultCenter: [number, number] = [40.7589, -73.9851] // New York City
    
    // Calculate map center based on available tasks
    const mapCenter: [number, number] = mapTasks.length > 0 && mapTasks.some(t => t.latitude && t.longitude)
      ? [
          mapTasks.filter(t => t.latitude).reduce((sum, task) => sum + (task.latitude || 0), 0) / mapTasks.filter(t => t.latitude).length,
          mapTasks.filter(t => t.longitude).reduce((sum, task) => sum + (task.longitude || 0), 0) / mapTasks.filter(t => t.longitude).length
        ]
      : defaultCenter

    console.log('MapTab: Map center calculated:', mapCenter)
    console.log('MapTab: Tasks with coordinates for centering:', mapTasks.filter(t => t.latitude && t.longitude).length)

    // Create map
    const map = L.map(mapRef.current).setView(mapCenter, mapTasks.length > 0 ? 10 : 13)
    mapInstanceRef.current = map

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    console.log('MapTab: Map initialized with center:', mapCenter)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update markers when tasks change
  useEffect(() => {
    if (!mapInstanceRef.current) return

    console.log('🗺️ MapTab: Updating markers, mapTasks count:', mapTasks.length)

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker)
    })
    markersRef.current = []

    // Add new markers
    mapTasks.forEach((task, index) => {
      console.log(`MapTab: Processing task ${index + 1}:`, {
        name: task.business_name,
        hasCoordinates: !!(task.latitude && task.longitude),
        lat: task.latitude,
        lng: task.longitude,
        address: task.address
      })

      if (task.latitude && task.longitude) {
        console.log(`MapTab: Creating marker for ${task.business_name} at [${task.latitude}, ${task.longitude}]`)
        
        const marker = L.marker([task.latitude, task.longitude], {
          icon: createCustomIcon(getMarkerColor(task))
        })

        marker.bindPopup(`
          <div style="padding: 8px; min-width: 140px; font-family: system-ui;">
            <h3 style="font-weight: 600; margin: 0 0 4px 0; font-size: 14px; color: #1a1a1a;">${task.business_name}</h3>
            <button onclick="window.dispatchEvent(new CustomEvent('taskClick', { detail: '${task.id}' }))" 
                    style="width: 100%; padding: 6px 10px; font-size: 11px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
              View Details
            </button>
          </div>
        `, {
          closeButton: true,
          maxWidth: 160,
          className: 'custom-popup'
        })

        marker.addTo(mapInstanceRef.current)
        markersRef.current.push(marker)
        console.log(`MapTab: Marker added for ${task.business_name}`)
      } else {
        console.log(`MapTab: Skipping ${task.business_name} - missing coordinates`)
      }
    })

    console.log(`MapTab: Total markers added: ${markersRef.current.length}`)
  }, [mapTasks])

  // Handle task click events from popup
  useEffect(() => {
    const handleTaskClickEvent = (event: any) => {
      const taskId = event.detail
      const task = mapTasks.find(t => t.id === taskId)
      if (task) {
        handleTaskClick(task)
      }
    }

    window.addEventListener('taskClick', handleTaskClickEvent)
    return () => {
      window.removeEventListener('taskClick', handleTaskClickEvent)
    }
  }, [mapTasks])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Business Map</h2>
          <p className="text-sm text-muted-foreground">
            Showing {mapTasks.length} completed businesses requiring follow-up
            {tasks.filter(t => t.status === 'completed' && t.address && !t.latitude).length > 0 && (
              <span className="text-orange-600 block sm:inline sm:ml-2">
                ({tasks.filter(t => t.status === 'completed' && t.address && !t.latitude).length} need geocoding)
              </span>
            )}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500" />
            <span>Not Visited</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500" />
            <span>Payment Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-500" />
            <span>Follow Up</span>
          </div>
          
          {/* Geocode button for completed tasks without coordinates */}
          {tasks.filter(t => t.status === 'completed' && t.address && !t.latitude).length > 0 && (
            <Button
              onClick={async () => {
                const tasksToGeocode = tasks.filter(t => t.status === 'completed' && t.address && !t.latitude)
                console.log('Geocoding tasks:', tasksToGeocode.length)
                
                let successCount = 0
                let failedTasks: string[] = []
                
                for (const task of tasksToGeocode) {
                  try {
                    console.log('Geocoding:', task.business_name, task.address)
                    await tasksApi.geocodeTask(task.id, task.address)
                    successCount++
                    
                    toast({
                      title: "Address Geocoded",
                      description: `Successfully located ${task.business_name}`
                    })
                  } catch (error: any) {
                    console.error('Failed to geocode:', task.business_name, error)
                    failedTasks.push(task.business_name)
                    
                    toast({
                      title: "Geocoding Failed", 
                      description: `Couldn't locate ${task.business_name}: ${error.message || 'Address not found'}`,
                      variant: "destructive"
                    })
                  }
                }
                
                // Show summary toast
                if (successCount > 0) {
                  toast({
                    title: "Geocoding Complete",
                    description: `Successfully geocoded ${successCount} addresses${failedTasks.length > 0 ? `. Failed: ${failedTasks.length}` : ''}`
                  })
                }
                
                // Refresh to show new pins
                setTimeout(() => onTaskUpdate(), 1000)
              }}
              variant="outline"
              size="sm"
              className="text-orange-600 border-orange-200"
            >
              Geocode {tasks.filter(t => t.status === 'completed' && t.address && !t.latitude).length} Addresses
            </Button>
          )}
        </div>
      </div>

      <div className="h-[600px] rounded-lg overflow-hidden border">
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </div>

      <TaskModal
        task={selectedTask}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpdate={handleTaskUpdate}
      />
    </div>
  )
}