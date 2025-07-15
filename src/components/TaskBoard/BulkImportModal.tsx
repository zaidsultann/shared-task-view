import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { tasks } from '@/lib/api'

interface ImportTask {
  business_name: string
  brief: string
  phone?: string
  address?: string
  note?: string
}

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const BulkImportModal = ({ isOpen, onClose, onSuccess }: BulkImportModalProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [previewData, setPreviewData] = useState<ImportTask[]>([])
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setErrors([])
    setPreviewData([])

    const fileType = selectedFile.name.toLowerCase()
    
    if (fileType.endsWith('.csv')) {
      parseCSV(selectedFile)
    } else if (fileType.endsWith('.xlsx') || fileType.endsWith('.xls')) {
      parseExcel(selectedFile)
    } else if (fileType.endsWith('.json')) {
      parseJSON(selectedFile)
    } else {
      setErrors(['Please upload a CSV, Excel (.xlsx), or JSON file'])
    }
  }

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const data = result.data as any[]
        const tasks = validateAndMapData(data)
        setPreviewData(tasks)
        
        if (result.errors.length > 0) {
          setErrors(result.errors.map(err => err.message))
        }
      },
      error: (error) => {
        setErrors([`CSV parsing error: ${error.message}`])
      }
    })
  }

  const parseExcel = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        const tasks = validateAndMapData(jsonData as any[])
        setPreviewData(tasks)
      } catch (error) {
        setErrors([`Excel parsing error: ${error}`])
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const parseJSON = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string)
        const data = Array.isArray(jsonData) ? jsonData : [jsonData]
        const tasks = validateAndMapData(data)
        setPreviewData(tasks)
      } catch (error) {
        setErrors([`JSON parsing error: ${error}`])
      }
    }
    reader.readAsText(file)
  }

  const validateAndMapData = (data: any[]): ImportTask[] => {
    const validTasks: ImportTask[] = []
    const newErrors: string[] = []

    data.forEach((row, index) => {
      const rowNum = index + 1
      
      // Map common field variations
      const business_name = row.business_name || row['Business Name'] || row.company || row.business || ''
      const brief = row.brief || row.description || row['Description'] || row.details || ''
      const phone = row.phone || row['Phone'] || row.telephone || row.contact || ''
      const address = row.address || row['Address'] || row.location || ''
      const note = row.note || row.notes || row['Notes'] || row.comment || ''

      if (!business_name.trim()) {
        newErrors.push(`Row ${rowNum}: Business name is required`)
        return
      }

      if (!brief.trim()) {
        newErrors.push(`Row ${rowNum}: Brief/description is required`)
        return
      }

      validTasks.push({
        business_name: business_name.trim(),
        brief: brief.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        note: note.trim() || undefined
      })
    })

    setErrors(newErrors)
    return validTasks
  }

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast({
        title: "No Data",
        description: "No valid tasks found to import",
        variant: "destructive"
      })
      return
    }

    setImporting(true)
    setProgress(0)

    try {
      // Import in batches to avoid overwhelming the server
      const batchSize = 10
      const batches = []
      
      for (let i = 0; i < previewData.length; i += batchSize) {
        batches.push(previewData.slice(i, i + batchSize))
      }

      let completed = 0
      for (const batch of batches) {
        await tasks.bulkCreate(batch)
        completed += batch.length
        setProgress((completed / previewData.length) * 100)
      }

      toast({
        title: "Import Successful",
        description: `Successfully imported ${previewData.length} tasks`,
      })

      onSuccess()
      onClose()
      resetModal()
    } catch (error) {
      console.error('Import error:', error)
      toast({
        title: "Import Failed",
        description: "There was an error importing the tasks. Please try again.",
        variant: "destructive"
      })
    } finally {
      setImporting(false)
      setProgress(0)
    }
  }

  const resetModal = () => {
    setFile(null)
    setPreviewData([])
    setErrors([])
    setProgress(0)
    setImporting(false)
  }

  const handleClose = () => {
    if (!importing) {
      resetModal()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Tasks
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6 py-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Upload File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                onChange={handleFileChange}
                disabled={importing}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Supported formats: CSV, Excel (.xlsx), JSON
              </p>
            </div>

            {importing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Importing tasks...</span>
                  <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {errors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {previewData.length > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Found {previewData.length} valid tasks ready to import
                </AlertDescription>
              </Alert>
            )}
          </div>

          {previewData.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preview</h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-60 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Business Name</th>
                        <th className="p-2 text-left">Brief</th>
                        <th className="p-2 text-left">Phone</th>
                        <th className="p-2 text-left">Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 10).map((task, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{task.business_name}</td>
                          <td className="p-2">{task.brief}</td>
                          <td className="p-2">{task.phone || '-'}</td>
                          <td className="p-2">{task.address || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 10 && (
                    <div className="p-2 text-center text-muted-foreground bg-muted/50">
                      ... and {previewData.length - 10} more tasks
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Required Fields</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Business Name:</strong> Required field containing the business name
              </div>
              <div>
                <strong>Brief/Description:</strong> Required field describing the task
              </div>
              <div>
                <strong>Phone:</strong> Optional phone number field
              </div>
              <div>
                <strong>Address:</strong> Optional address field (will be geocoded)
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={previewData.length === 0 || importing || errors.length > 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            Import {previewData.length} Tasks
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}