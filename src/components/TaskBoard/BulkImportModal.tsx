import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, Database } from 'lucide-react'

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onTasksImported: () => void
}

interface ImportRow {
  business_name: string
  phone?: string
  address?: string
  note?: string
}

export const BulkImportModal = ({ isOpen, onClose, onTasksImported }: BulkImportModalProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportRow[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const { toast } = useToast()
  const { authUser } = useAuth()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    parseFile(selectedFile)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const droppedFile = event.dataTransfer.files?.[0]
    if (!droppedFile) return

    const allowedTypes = ['.csv', '.xlsx', '.xls', '.json']
    const fileExtension = '.' + droppedFile.name.split('.').pop()?.toLowerCase()
    
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV, Excel, or JSON file",
        variant: "destructive",
      })
      return
    }

    setFile(droppedFile)
    parseFile(droppedFile)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const parseFile = (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase()

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('🔍 Papa Parse results:', {
            data: results.data,
            dataLength: results.data.length,
            errors: results.errors,
            meta: results.meta
          })
          processData(results.data as any[])
        },
        error: (error) => {
          console.error('❌ Papa Parse error:', error)
          toast({
            title: "Error parsing CSV",
            description: error.message,
            variant: "destructive",
          })
        }
      })
    } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          // Convert to objects with headers
          const headers = jsonData[0] as string[]
          const rows = jsonData.slice(1).map(row => {
            const obj: any = {}
            headers.forEach((header, index) => {
              obj[header] = (row as any[])[index] || ''
            })
            return obj
          })
          
          processData(rows)
        } catch (error) {
          toast({
            title: "Error parsing Excel file",
            description: "Please ensure the file is a valid Excel file",
            variant: "destructive",
          })
        }
      }
      reader.readAsArrayBuffer(file)
    } else if (fileExtension === 'json') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string)
          processData(Array.isArray(jsonData) ? jsonData : [jsonData])
        } catch (error) {
          toast({
            title: "Error parsing JSON",
            description: "Please ensure the file contains valid JSON",
            variant: "destructive",
          })
        }
      }
      reader.readAsText(file)
    } else {
      toast({
        title: "Unsupported file type",
        description: "Please upload a CSV, Excel, or JSON file",
        variant: "destructive",
      })
    }
  }

  const processData = (data: any[]) => {
    console.log('🔍 Processing raw data:', data.length, 'rows')
    
    const normalizedData = data.map(row => {
      const normalizedRow: ImportRow = {
        business_name: '',
        phone: '',
        address: '',
        note: ''
      }

      // Case-insensitive header mapping
      Object.keys(row).forEach(key => {
        const lowerKey = key.toLowerCase().trim()
        const value = row[key]?.toString().trim() || ''

        if (lowerKey.includes('business') && lowerKey.includes('name')) {
          normalizedRow.business_name = value
        } else if (lowerKey.includes('phone')) {
          normalizedRow.phone = value
        } else if (lowerKey.includes('address')) {
          normalizedRow.address = value
        } else if (lowerKey.includes('note')) {
          normalizedRow.note = value
        }
      })

      return normalizedRow
    }).filter(row => row.business_name && row.phone) // Only include rows with business name and phone

    console.log('✅ Normalized data:', normalizedData.length, 'valid rows')
    console.log('📊 Setting preview to show:', normalizedData.length, 'rows')
    console.log('📋 First few rows:', normalizedData.slice(0, 3))
    
    setTotalRows(normalizedData.length)
    setPreview(normalizedData) // Show all valid rows
  }

  const handleImport = async () => {
    if (!file || !authUser) return

    setIsLoading(true)
    try {
      // Re-parse the entire file for import  
      let allData: ImportRow[] = []
      
      const parsePromise = new Promise<void>((resolve, reject) => {
        const fileExtension = file.name.split('.').pop()?.toLowerCase()

        if (fileExtension === 'csv') {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              allData = results.data.map((row: any) => {
                const normalizedRow: ImportRow = {
                  business_name: '',
                  phone: '',
                  address: '',
                  note: ''
                }

                Object.keys(row).forEach(key => {
                  const lowerKey = key.toLowerCase().trim()
                  const value = row[key]?.toString().trim() || ''

                  if (lowerKey.includes('business') && lowerKey.includes('name')) {
                    normalizedRow.business_name = value
                  } else if (lowerKey.includes('phone')) {
                    normalizedRow.phone = value
                  } else if (lowerKey.includes('address')) {
                    normalizedRow.address = value
                  } else if (lowerKey.includes('note')) {
                    normalizedRow.note = value
                  }
                })

                return normalizedRow
              }).filter((row: ImportRow) => row.business_name && row.phone)
              resolve()
            },
            error: reject
          })
        } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
          const reader = new FileReader()
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer)
              const workbook = XLSX.read(data, { type: 'array' })
              const firstSheetName = workbook.SheetNames[0]
              const worksheet = workbook.Sheets[firstSheetName]
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
              
              const headers = jsonData[0] as string[]
              const rows = jsonData.slice(1).map(row => {
                const obj: any = {}
                headers.forEach((header, index) => {
                  obj[header] = (row as any[])[index] || ''
                })
                return obj
              })
              
              allData = rows.map((row: any) => {
                const normalizedRow: ImportRow = {
                  business_name: '',
                  phone: '',
                  address: '',
                  note: ''
                }

                Object.keys(row).forEach(key => {
                  const lowerKey = key.toLowerCase().trim()
                  const value = row[key]?.toString().trim() || ''

                  if (lowerKey.includes('business') && lowerKey.includes('name')) {
                    normalizedRow.business_name = value
                  } else if (lowerKey.includes('phone')) {
                    normalizedRow.phone = value
                  } else if (lowerKey.includes('address')) {
                    normalizedRow.address = value
                  } else if (lowerKey.includes('note')) {
                    normalizedRow.note = value
                  }
                })

                return normalizedRow
              }).filter((row: ImportRow) => row.business_name && row.phone)
              resolve()
            } catch (error) {
              reject(error)
            }
          }
          reader.readAsArrayBuffer(file)
        } else if (fileExtension === 'json') {
          const reader = new FileReader()
          reader.onload = (e) => {
            try {
              const jsonData = JSON.parse(e.target?.result as string)
              const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData]
              
              allData = dataArray.map((row: any) => {
                const normalizedRow: ImportRow = {
                  business_name: '',
                  phone: '',
                  address: '',
                  note: ''
                }

                Object.keys(row).forEach(key => {
                  const lowerKey = key.toLowerCase().trim()
                  const value = row[key]?.toString().trim() || ''

                  if (lowerKey.includes('business') && lowerKey.includes('name')) {
                    normalizedRow.business_name = value
                  } else if (lowerKey.includes('phone')) {
                    normalizedRow.phone = value
                  } else if (lowerKey.includes('address')) {
                    normalizedRow.address = value
                  } else if (lowerKey.includes('note')) {
                    normalizedRow.note = value
                  }
                })

                return normalizedRow
              }).filter((row: ImportRow) => row.business_name && row.phone)
              resolve()
            } catch (error) {
              reject(error)
            }
          }
          reader.readAsText(file)
        } else {
          reject(new Error('Unsupported file type'))
        }
      })

      await parsePromise
      
      // Insert tasks in batches
      const tasksToInsert = allData.map(row => ({
        business_name: row.business_name,
        brief: `Imported task for ${row.business_name}`,
        phone: row.phone,
        address: row.address || null,
        note: row.note || null,
        status: 'open',
        created_by: authUser.user_id
      }))

      const { error } = await supabase
        .from('tasks')
        .insert(tasksToInsert)

      if (error) throw error

      toast({
        title: "Import successful",
        description: `Imported ${tasksToInsert.length} tasks`,
      })

      onTasksImported()
      handleClose()
    } catch (error) {
      console.error('Import error:', error)
      toast({
        title: "Import failed",
        description: "Please check your file format and try again",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview([])
    setTotalRows(0)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Bulk Import Tasks
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Supported Formats</h4>
              <ul className="space-y-1">
                <li>• CSV files (.csv)</li>
                <li>• Excel files (.xlsx, .xls)</li>
                <li>• JSON files (.json)</li>
              </ul>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Required Headers</h4>
              <ul className="space-y-1">
                <li>• <strong>Business Name</strong> (required)</li>
                <li>• <strong>Phone</strong> (required)</li>
              </ul>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Optional Headers</h4>
              <ul className="space-y-1">
                <li>• Address</li>
                <li>• Note</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <Label htmlFor="file-upload">Upload File</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-sm font-medium mb-1">
                {file ? file.name : 'Drop your file here or click to browse'}
              </div>
              <div className="text-xs text-muted-foreground">
                Supports CSV, Excel (xlsx, xls), and JSON files
              </div>
            </div>
            <Input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {preview.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Preview ({totalRows} valid rows found)</h4>
              <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      console.log('🎯 Rendering table rows - preview.length:', preview.length)
                      console.log('🎯 Preview data:', preview)
                      return preview.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.business_name}</TableCell>
                          <TableCell>{row.phone}</TableCell>
                          <TableCell>{row.address}</TableCell>
                          <TableCell>{row.note}</TableCell>
                        </TableRow>
                      ))
                    })()}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!file || totalRows === 0 || isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import {totalRows} Tasks
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}