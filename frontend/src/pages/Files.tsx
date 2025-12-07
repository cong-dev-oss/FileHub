import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fileService, FileResponse } from '../services/fileService'
import { tusUploadService, TusUploadProgress } from '../services/tusUploadService'
import { folderService, FolderDto } from '../services/folderService'
import { videoConversionService } from '../services/videoConversionService'
import { Upload, Trash2, Download, File, Search, Folder, FolderPlus, ChevronRight, ChevronDown, Move, X, Play, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useConfirm } from '../components/ConfirmDialog'
import VideoPlayer from '../components/VideoPlayer'
import VideoConversionManager from '../components/VideoConversionManager'
import ImagePreview from '../components/ImagePreview'

interface UploadState {
  fileName: string
  progress: number
  speed: number
  timeRemaining: number
  isUploading: boolean
}

export default function Files() {
  const [selectedFileType, setSelectedFileType] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [fileToMove, setFileToMove] = useState<FileResponse | null>(null)
  const [uploadState, setUploadState] = useState<UploadState | null>(null)
  const [playingVideo, setPlayingVideo] = useState<FileResponse | null>(null)
  const [previewingImage, setPreviewingImage] = useState<FileResponse | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['folders', 'tree'],
    queryFn: () => folderService.getTree(),
  })

  const { data: files = [], isLoading: filesLoading, error } = useQuery({
    queryKey: ['files', selectedFileType, selectedFolderId],
    queryFn: () => fileService.getAll(selectedFileType || undefined, selectedFolderId),
    retry: 1,
  })

  const createFolderMutation = useMutation({
    mutationFn: folderService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setShowNewFolderInput(false)
      setNewFolderName('')
      toast.success('Folder created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create folder')
    },
  })

  const deleteFolderMutation = useMutation({
    mutationFn: folderService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      if (selectedFolderId) {
        setSelectedFolderId(undefined)
      }
      toast.success('Folder deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete folder')
    },
  })

  const moveFileMutation = useMutation({
    mutationFn: ({ fileId, folderId }: { fileId: string; folderId?: string }) =>
      fileService.move(fileId, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      setFileToMove(null)
      toast.success('File moved successfully')
    },
    onError: () => {
      toast.error('Failed to move file')
    },
  })

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

    // Reset input để có thể upload cùng file nhiều lần
    e.target.value = ''

    // Set initial upload state
    setUploadState({
      fileName: file.name,
      progress: 0,
      speed: 0,
      timeRemaining: 0,
      isUploading: true,
    })

    try {
      // Use improved upload service with better timeout and progress tracking
      const uploadedFile = await fileService.upload(
        file,
        undefined,
        selectedFolderId,
        (progress) => {
          setUploadState({
            fileName: file.name,
            progress: progress.percentage,
            speed: progress.speed,
            timeRemaining: progress.timeRemaining,
            isUploading: true,
          })
        }
      )
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['files', selectedFileType, selectedFolderId] })
      setUploadState(null)
      toast.success('File uploaded successfully')
      
      // Auto-start conversion for video files
      if (uploadedFile.fileType === 'Video') {
        try {
          await videoConversionService.startConversion(uploadedFile.id)
          toast.success('Video conversion started in background')
        } catch (error: any) {
          console.error('Failed to start conversion:', error)
          // Don't show error toast - conversion is optional
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Upload failed'
      setUploadState(null)
      toast.error(errorMessage)
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

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name cannot be empty')
      return
    }
    createFolderMutation.mutate({
      name: newFolderName.trim(),
      parentId: selectedFolderId,
    })
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const renderFolderTree = (folders: FolderDto[], level = 0): JSX.Element[] => {
    return folders.map((folder) => {
      const hasChildren = folder.children && folder.children.length > 0
      const isExpanded = expandedFolders.has(folder.id)
      const isSelected = selectedFolderId === folder.id

      return (
        <div key={folder.id} className="mb-0.5">
          <div
            className={`group flex items-center py-1.5 px-2 cursor-pointer hover:bg-gray-100 rounded transition-colors ${
              isSelected ? 'bg-blue-100 border-l-2 border-blue-500' : ''
            }`}
            onClick={() => setSelectedFolderId(folder.id)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (hasChildren) {
                  toggleFolder(folder.id)
                }
              }}
              className={`mr-1 w-4 h-4 flex items-center justify-center ${
                hasChildren ? 'cursor-pointer' : 'cursor-default opacity-0'
              }`}
            >
              {hasChildren && (
                isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-gray-600" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-gray-600" />
                )
              )}
            </button>
            <Folder className={`h-4 w-4 mr-2 ${isSelected ? 'text-blue-600' : 'text-blue-500'}`} />
            <span className={`flex-1 text-sm truncate ${isSelected ? 'font-medium text-blue-900' : 'text-gray-700'}`}>
              {folder.name}
            </span>
            <button
              onClick={async (e) => {
                e.stopPropagation()
                const ok = await confirm({
                  title: 'Xóa folder',
                  message: `Bạn có chắc chắn muốn xóa folder "${folder.name}"?`,
                  confirmText: 'Xóa',
                })
                if (ok) {
                  deleteFolderMutation.mutate(folder.id)
                }
              }}
              className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-opacity"
              title="Delete folder"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          {hasChildren && isExpanded && (
            <div className="ml-4 mt-0.5 border-l-2 border-gray-200 pl-2">
              {renderFolderTree(folder.children, level + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  const filteredFiles = files.filter((file) =>
    file.originalFileName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s'
    if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(2) + ' KB/s'
    return (bytesPerSecond / (1024 * 1024)).toFixed(2) + ' MB/s'
  }

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0 || !isFinite(seconds)) return 'Đang tính toán...'
    if (seconds < 60) return Math.round(seconds) + 's'
    const minutes = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${minutes}m ${secs}s`
  }

  const getAllFoldersFlat = (folders: FolderDto[]): FolderDto[] => {
    const result: FolderDto[] = []
    const traverse = (fs: FolderDto[]) => {
      fs.forEach((f) => {
        result.push(f)
        if (f.children && f.children.length > 0) {
          traverse(f.children)
        }
      })
    }
    traverse(folders)
    return result
  }

  return (
    <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
      {/* Mobile sidebar toggle button */}
      <div className="md:hidden flex items-center justify-between bg-white p-3 rounded-lg shadow">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors touch-manipulation"
        >
          <Folder className="h-5 w-5" />
          <span>Folders</span>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Files</h1>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Folders</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-500 hover:text-gray-700 touch-manipulation p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {/* Folder tree content - reuse same component */}
              {foldersLoading ? (
                <div className="text-sm text-gray-500 py-4">Loading folders...</div>
              ) : folders.length === 0 ? (
                <div className="text-sm text-gray-400 py-4 italic">No folders yet</div>
              ) : (
                <div className="space-y-0 max-h-[calc(100vh-150px)] overflow-y-auto">
                  <div
                    className={`flex items-center py-1.5 px-2 cursor-pointer hover:bg-gray-100 rounded mb-2 transition-colors touch-manipulation ${
                      selectedFolderId === undefined ? 'bg-blue-100 border-l-2 border-blue-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedFolderId(undefined)
                      setSidebarOpen(false)
                    }}
                  >
                    <Folder className="h-4 w-4 mr-2 text-blue-500" />
                    <span className={`text-sm ${selectedFolderId === undefined ? 'font-medium text-blue-900' : 'text-gray-700'}`}>
                      Root
                    </span>
                  </div>
                  {renderFolderTree(folders)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Folder Tree Sidebar - Desktop */}
      <div className="hidden md:block w-64 bg-white rounded-lg shadow p-4 flex-shrink-0" style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto', scrollbarWidth: 'thin' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Folders</h2>
          <button
            onClick={() => setShowNewFolderInput(!showNewFolderInput)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="New Folder"
          >
            <FolderPlus className="h-5 w-5" />
          </button>
        </div>

        {showNewFolderInput && (
          <div className="mb-4 flex space-x-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder()
                } else if (e.key === 'Escape') {
                  setShowNewFolderInput(false)
                  setNewFolderName('')
                }
              }}
              placeholder="Folder name"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <button
              onClick={handleCreateFolder}
              className="px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewFolderInput(false)
                setNewFolderName('')
              }}
              className="px-2 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        <div
          className={`flex items-center py-1.5 px-2 cursor-pointer hover:bg-gray-100 rounded mb-2 transition-colors ${
            selectedFolderId === undefined ? 'bg-blue-100 border-l-2 border-blue-500' : ''
          }`}
          onClick={() => setSelectedFolderId(undefined)}
        >
          <Folder className="h-4 w-4 mr-2 text-blue-500" />
          <span className={`text-sm ${selectedFolderId === undefined ? 'font-medium text-blue-900' : 'text-gray-700'}`}>
            Root
          </span>
        </div>

        {foldersLoading ? (
          <div className="text-sm text-gray-500 py-4">Loading folders...</div>
        ) : folders.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 italic">No folders yet</div>
        ) : (
          <div className="space-y-0">
            {renderFolderTree(folders)}
          </div>
        )}
      </div>

      {/* Files List */}
      <div className="flex-1 space-y-4 md:space-y-6 min-w-0">
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Files</h1>
            <p className="mt-1 text-sm text-gray-500">
              {selectedFolderId ? 'Files in folder' : 'Files in root'}
            </p>
          </div>
          <label className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 active:bg-primary-800 cursor-pointer transition-colors touch-manipulation">
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
        
        {/* Mobile Upload Button */}
        <div className="md:hidden">
          <label className="flex items-center justify-center w-full px-4 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 active:bg-primary-800 cursor-pointer transition-colors touch-manipulation">
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

        {/* Video Conversion Manager - Only shows when there are active conversions */}
        <VideoConversionManager />

        {/* Upload Progress Bar */}
        {uploadState && uploadState.isUploading && (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-blue-600 animate-pulse" />
                <span className="text-sm font-medium text-gray-900 truncate max-w-md">
                  {uploadState.fileName}
                </span>
              </div>
              <span className="text-sm font-semibold text-blue-600">{uploadState.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center space-x-4">
                <span>📊 {formatSpeed(uploadState.speed)}</span>
                {uploadState.timeRemaining > 0 && (
                  <span>⏱️ {formatTimeRemaining(uploadState.timeRemaining)}</span>
                )}
              </div>
              <span>{uploadState.progress}% completed</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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

        {/* Move File Dialog */}
        {fileToMove && (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Move file: {fileToMove.originalFileName}</h3>
              <button onClick={() => setFileToMove(null)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-md mb-2 focus:ring-primary-500 focus:border-primary-500"
              onChange={(e) => {
                const folderId = e.target.value === '' ? undefined : e.target.value
                moveFileMutation.mutate({ fileId: fileToMove.id, folderId })
              }}
            >
              <option value="">Root</option>
              {getAllFoldersFlat(folders).map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Files List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {filesLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No files found</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
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
                            {(file.fileType === 'Video' || file.contentType?.startsWith('video/')) && (
                              <button
                                onClick={() => setPlayingVideo(file)}
                                className="text-red-600 hover:text-red-900 transition-colors touch-manipulation p-1"
                                title="Play video"
                              >
                                <Play className="h-5 w-5" />
                              </button>
                            )}
                            {(file.fileType === 'Image' || file.contentType?.startsWith('image/')) && (
                              <button
                                onClick={() => setPreviewingImage(file)}
                                className="text-green-600 hover:text-green-900 transition-colors touch-manipulation p-1"
                                title="Preview image"
                              >
                                <ImageIcon className="h-5 w-5" />
                              </button>
                            )}
                            <button
                              onClick={() => setFileToMove(file)}
                              className="text-blue-600 hover:text-blue-900 transition-colors touch-manipulation p-1"
                              title="Move"
                            >
                              <Move className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDownload(file)}
                              className="text-primary-600 hover:text-primary-900 transition-colors touch-manipulation p-1"
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
                              className="text-red-600 hover:text-red-900 transition-colors touch-manipulation p-1"
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

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <div key={file.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start flex-1 min-w-0">
                        <File className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {file.originalFileName}
                          </div>
                          {file.description && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{file.description}</div>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                              {file.fileType}
                            </span>
                            <span className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</span>
                            <span className="text-xs text-gray-500">{format(new Date(file.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                      {(file.fileType === 'Video' || file.contentType?.startsWith('video/')) && (
                        <button
                          onClick={() => setPlayingVideo(file)}
                          className="flex items-center gap-1 px-3 py-2 text-red-600 hover:text-red-900 active:bg-red-50 rounded-md transition-colors touch-manipulation"
                          title="Play video"
                        >
                          <Play className="h-4 w-4" />
                          <span className="text-xs">Play</span>
                        </button>
                      )}
                      {(file.fileType === 'Image' || file.contentType?.startsWith('image/')) && (
                        <button
                          onClick={() => setPreviewingImage(file)}
                          className="flex items-center gap-1 px-3 py-2 text-green-600 hover:text-green-900 active:bg-green-50 rounded-md transition-colors touch-manipulation"
                          title="Preview image"
                        >
                          <ImageIcon className="h-4 w-4" />
                          <span className="text-xs">View</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(file)}
                        className="flex items-center gap-1 px-3 py-2 text-primary-600 hover:text-primary-900 active:bg-primary-50 rounded-md transition-colors touch-manipulation"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-xs">Download</span>
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
                        className="flex items-center gap-1 px-3 py-2 text-red-600 hover:text-red-900 active:bg-red-50 rounded-md transition-colors touch-manipulation"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="text-xs">Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {playingVideo && (
        <VideoPlayer
          videoUrl={fileService.getStreamUrl(playingVideo.id)}
          fileName={playingVideo.originalFileName}
          fileId={playingVideo.id}
          files={filteredFiles}
          currentIndex={filteredFiles.findIndex(f => f.id === playingVideo.id)}
          onClose={() => setPlayingVideo(null)}
          onNavigate={(file) => {
            setPlayingVideo(file)
          }}
        />
      )}

      {/* Image Preview Modal */}
      {previewingImage && (
        <ImagePreview
          imageUrl={fileService.getStreamUrl(previewingImage.id)}
          fileName={previewingImage.originalFileName}
          fileId={previewingImage.id}
          files={filteredFiles}
          currentIndex={filteredFiles.findIndex(f => f.id === previewingImage.id)}
          onClose={() => setPreviewingImage(null)}
          onNavigate={(file) => {
            setPreviewingImage(file)
          }}
        />
      )}
    </div>
  )
}
