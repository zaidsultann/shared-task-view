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
      await tasksApi.updateStatus(editedTask.id, editedTask.status, editedTask.status_color)
      
      toast({
        title: "Task Updated",
        description: "Task status and details have been updated successfully."
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
    { value: 'awaiting_payment', label: 'Awaiting Payment', color: 'yellow' },
    { value: 'follow_up', label: 'Follow Up', color: 'blue' },
    { value: 'not_interested', label: 'Not Interested', color: 'gray' },
    { value: 'completed', label: 'Completed', color: 'green' }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {task.business_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Business Name</Label>
            <Input value={task.business_name} disabled />
          </div>

          <div>
            <Label>Phone</Label>
            <Input 
              value={task.phone || 'Not provided'} 
              disabled 
              className="bg-muted"
            />
          </div>

          <div>
            <Label>Address</Label>
            <Input 
              value={task.address || 'Not provided'} 
              disabled 
              className="bg-muted"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select 
              value={editedTask.status} 
              onValueChange={(value: Task['status']) => {
                const option = statusOptions.find(opt => opt.value === value)
                setEditedTask({
                  ...editedTask,
                  status: value,
                  status_color: option?.color || 'red'
                })
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ 
                          backgroundColor: option.color === 'yellow' ? '#eab308' : 
                                         option.color === 'blue' ? '#3b82f6' :
                                         option.color === 'gray' ? '#6b7280' : '#22c55e'
                        }}
                      />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="note">Notes</Label>
            <Textarea
              id="note"
              value={editedTask.note || ''}
              onChange={(e) => setEditedTask({
                ...editedTask,
                note: e.target.value
              })}
              placeholder="Add any notes or comments..."
              rows={3}
            />
          </div>

          {task.latitude && task.longitude && (
            <Button
              variant="outline"
              onClick={openDirections}
              className="w-full"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Get Directions
            </Button>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
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

  // Filter tasks for map display
  const mapTasks = tasks.filter(task => 
    task.latitude && 
    task.longitude && 
    !task.is_deleted && 
    !task.is_archived &&
    ['awaiting_payment', 'follow_up', 'not_interested'].includes(task.status)
  )

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'awaiting_payment':
        return '#eab308' // yellow
      case 'follow_up':
        return '#3b82f6' // blue  
      case 'not_interested':
        return '#6b7280' // gray
      default:
        return '#ef4444' // red
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
    onTaskUpdate()
  }

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return

    // Default center
    const defaultCenter: [number, number] = [40.7589, -73.9851] // New York City
    
    // Calculate map center based on available tasks
    const mapCenter: [number, number] = mapTasks.length > 0
      ? [
          mapTasks.reduce((sum, task) => sum + (task.latitude || 0), 0) / mapTasks.length,
          mapTasks.reduce((sum, task) => sum + (task.longitude || 0), 0) / mapTasks.length
        ]
      : defaultCenter

    // Create map
    const map = L.map(mapRef.current).setView(mapCenter, mapTasks.length > 0 ? 10 : 13)
    mapInstanceRef.current = map

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

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

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker)
    })
    markersRef.current = []

    // Add new markers
    mapTasks.forEach(task => {
      if (task.latitude && task.longitude) {
        const marker = L.marker([task.latitude, task.longitude], {
          icon: createCustomIcon(getMarkerColor(task.status))
        })

        marker.bindPopup(`
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${task.business_name}</h3>
            <p style="font-size: 12px; color: #666; margin-bottom: 8px;">${task.brief}</p>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${getMarkerColor(task.status)};"></div>
              <span style="font-size: 12px; text-transform: capitalize;">${task.status.replace('_', ' ')}</span>
            </div>
            <button onclick="window.dispatchEvent(new CustomEvent('taskClick', { detail: '${task.id}' }))" style="width: 100%; padding: 6px 12px; font-size: 12px; background-color: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
              View Details
            </button>
          </div>
        `)

        marker.addTo(mapInstanceRef.current)
        markersRef.current.push(marker)
      }
    })
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Task Map</h2>
          <p className="text-muted-foreground">
            Showing {mapTasks.length} tasks with locations
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Awaiting Payment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Follow Up</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            <span>Not Interested</span>
          </div>
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