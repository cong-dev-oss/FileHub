import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { fileService } from '../services/fileService'
import { contentService } from '../services/contentService'
import { FileText, FolderOpen, TrendingUp, Users } from 'lucide-react'
import { format } from 'date-fns'

export default function Dashboard() {
  const { user } = useAuthStore()

  const { data: files = [], isLoading: filesLoading, error: filesError } = useQuery({
    queryKey: ['files'],
    queryFn: () => fileService.getAll(),
    retry: 1,
  })

  const { data: contents = [], isLoading: contentsLoading, error: contentsError } = useQuery({
    queryKey: ['contents'],
    queryFn: () => contentService.getAll(),
    retry: 1,
  })

  // Log errors for debugging
  if (filesError) {
    console.error('Files error:', filesError)
  }
  if (contentsError) {
    console.error('Contents error:', contentsError)
  }

  const stats = [
    {
      name: 'Total Files',
      value: files.length,
      icon: FolderOpen,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Content',
      value: contents.length,
      icon: FileText,
      color: 'bg-green-500',
    },
    {
      name: 'Published Content',
      value: contents.filter(c => c.status === 'Published').length,
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
    {
      name: 'Draft Content',
      value: contents.filter(c => c.status === 'Draft').length,
      icon: FileText,
      color: 'bg-yellow-500',
    },
  ]

  const recentFiles = files.slice(0, 5)
  const recentContents = contents.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.firstName} {user?.lastName}
        </p>
      </div>

      {/* Error Messages */}
      {(filesError || contentsError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            {filesError && `Error loading files: ${filesError instanceof Error ? filesError.message : 'Unknown error'}`}
            {contentsError && `Error loading content: ${contentsError instanceof Error ? contentsError.message : 'Unknown error'}`}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`${stat.color} p-3 rounded-md`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900">
                        {filesLoading || contentsLoading ? '...' : stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Files */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Files</h3>
            <div className="space-y-3">
              {filesLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : filesError ? (
                <p className="text-sm text-red-500">Error loading files</p>
              ) : recentFiles.length === 0 ? (
                <p className="text-sm text-gray-500">No files yet</p>
              ) : (
                recentFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.originalFileName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {file.fileType} • {(file.fileSize / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 ml-4">
                      {format(new Date(file.createdAt), 'MMM d')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Content */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Content</h3>
            <div className="space-y-3">
              {contentsLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : contentsError ? (
                <p className="text-sm text-red-500">Error loading content</p>
              ) : recentContents.length === 0 ? (
                <p className="text-sm text-gray-500">No content yet</p>
              ) : (
                recentContents.map((content) => (
                  <div key={content.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {content.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {content.contentType} • {content.status}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 ml-4">
                      {format(new Date(content.createdAt), 'MMM d')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

