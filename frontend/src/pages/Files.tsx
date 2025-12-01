import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fileService, FileResponse } from '../services/fileService'
import { Upload, Trash2, Download, File, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useConfirm } from '../components/ConfirmDialog'

export default function Files() {
  const [selectedFileType, setSelectedFileType] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const { data: files = [], isLoading, error } = useQuery({
    queryKey: ['files', selectedFileType],
    queryFn: () => fileService.getAll(selectedFileType || undefined),
    retry: 1,
  })

  if (error) {
    console.error('Files query error:', error)
  }

  const deleteMutation = useMutation({
    mutationFn: fileService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      toast.success('File deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete file')
    },
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await fileService.upload(file)
      queryClient.invalidateQueries({ queryKey: ['files'] })
      toast.success('File uploaded successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Upload failed')
    }
  }

  const handleDownload = async (file: FileResponse) => {
    try {
      const blob = await fileService.download(file.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.originalFileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Download started')
    } catch (error) {
      toast.error('Download failed')
    }
  }

  const filteredFiles = files.filter((file) =>
    file.originalFileName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Files</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your files</p>
        </div>
        <label className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 cursor-pointer">
          <Upload className="h-5 w-5 mr-2" />
          Upload File
          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept=".doc,.docx,.pdf,.xls,.xlsx,.csv,.mp4,.avi,.mov,.jpg,.jpeg,.png,.gif,.mp3,.wav"
          />
        </label>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={selectedFileType}
            onChange={(e) => setSelectedFileType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Types</option>
            <option value="Document">Document</option>
            <option value="Spreadsheet">Spreadsheet</option>
            <option value="Video">Video</option>
            <option value="Image">Image</option>
            <option value="Audio">Audio</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No files found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <File className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {file.originalFileName}
                          </div>
                          {file.description && (
                            <div className="text-sm text-gray-500">{file.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                        {file.fileType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(file.fileSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(file.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDownload(file)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Download"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Xóa file',
                              message: `Bạn có chắc chắn muốn xóa file "${file.originalFileName}"?`,
                              confirmText: 'Xóa file',
                            })
                            if (ok) {
                              deleteMutation.mutate(file.id)
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

