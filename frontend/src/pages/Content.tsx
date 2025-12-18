import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { contentService, ContentDto } from '../services/contentService'
import { Plus, Trash2, Edit, Search, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useConfirm } from '../components/ConfirmDialog'
import ContentDetail from '../components/ContentDetail'
import { extractAllErrorMessages } from '../utils/errorHandler'

export default function Content() {
  const navigate = useNavigate()
  const [selectedContentType, setSelectedContentType] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewingContentId, setViewingContentId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ['contents', selectedContentType, selectedStatus],
    queryFn: () => contentService.getAll(selectedContentType || undefined, selectedStatus || undefined),
  })

  const deleteMutation = useMutation({
    mutationFn: contentService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] })
      toast.success('Content deleted successfully')
    },
    onError: (error: any) => {
      const errorMessages = extractAllErrorMessages(error)
      errorMessages.forEach((msg) => toast.error(msg))
    },
  })

  const filteredContents = contents.filter((content) =>
    content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    content.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your content</p>
        </div>
        <button
          onClick={() => navigate('/content/new')}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Content
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={selectedContentType}
            onChange={(e) => setSelectedContentType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Types</option>
            <option value="Page">Page</option>
            <option value="Post">Post</option>
            <option value="Media">Media</option>
            <option value="Custom">Custom</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Content List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredContents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No content found</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContents.map((content) => (
                  <tr key={content.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{content.title}</div>
                        {content.description && (
                          <div className="text-sm text-gray-500 truncate max-w-md">
                            {content.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {content.contentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          content.status === 'Published'
                            ? 'bg-green-100 text-green-800'
                            : content.status === 'Draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {content.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(content.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setViewingContentId(content.id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors touch-manipulation p-1"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => navigate(`/content/${content.id}`)}
                          className="text-primary-600 hover:text-primary-900 transition-colors touch-manipulation p-1"
                          title="Chỉnh sửa"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Xóa nội dung',
                              message: `Bạn có chắc chắn muốn xóa nội dung "${content.title}"?`,
                              confirmText: 'Xóa nội dung',
                            })
                            if (ok) {
                              deleteMutation.mutate(content.id)
                            }
                          }}
                          className="text-red-600 hover:text-red-900 transition-colors touch-manipulation p-1"
                          title="Xóa"
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
            {filteredContents.map((content) => (
              <div key={content.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-medium text-gray-900 mb-1">{content.title}</div>
                    {content.description && (
                      <div className="text-sm text-gray-500 line-clamp-2 mb-2">{content.description}</div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {content.contentType}
                      </span>
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          content.status === 'Published'
                            ? 'bg-green-100 text-green-800'
                            : content.status === 'Draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {content.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(content.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setViewingContentId(content.id)}
                    className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:text-blue-900 active:bg-blue-50 rounded-md transition-colors touch-manipulation"
                    title="Xem chi tiết"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="text-xs">Xem</span>
                  </button>
                  <button
                    onClick={() => navigate(`/content/${content.id}`)}
                    className="flex items-center gap-1 px-3 py-2 text-primary-600 hover:text-primary-900 active:bg-primary-50 rounded-md transition-colors touch-manipulation"
                    title="Chỉnh sửa"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="text-xs">Sửa</span>
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Xóa nội dung',
                        message: `Bạn có chắc chắn muốn xóa nội dung "${content.title}"?`,
                        confirmText: 'Xóa nội dung',
                      })
                      if (ok) {
                        deleteMutation.mutate(content.id)
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-2 text-red-600 hover:text-red-900 active:bg-red-50 rounded-md transition-colors touch-manipulation"
                    title="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-xs">Xóa</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
        )}
      </div>

      {/* Content Detail Modal */}
      {viewingContentId && (
        <ContentDetail
          contentId={viewingContentId}
          onClose={() => setViewingContentId(null)}
          onEdit={(content) => {
            setViewingContentId(null)
            navigate(`/content/${content.id}`)
          }}
          onDelete={async (contentId) => {
            const content = contents.find(c => c.id === contentId)
            const ok = await confirm({
              title: 'Xóa nội dung',
              message: `Bạn có chắc chắn muốn xóa nội dung "${content?.title}"?`,
              confirmText: 'Xóa nội dung',
            })
            if (ok) {
              deleteMutation.mutate(contentId)
              setViewingContentId(null)
            }
          }}
        />
      )}
    </div>
  )
}

