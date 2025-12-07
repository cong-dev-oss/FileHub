import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { X, Calendar, User, FileText, Tag, Eye, Edit, Trash2, Volume2, VolumeX } from 'lucide-react'
import { format } from 'date-fns'
import { contentService, ContentDto } from '../services/contentService'
import { fileService } from '../services/fileService'

interface ContentDetailProps {
  contentId: string
  onClose: () => void
  onEdit?: (content: ContentDto) => void
  onDelete?: (contentId: string) => void
}

export default function ContentDetail({ contentId, onClose, onEdit, onDelete }: ContentDetailProps) {
  const [isReading, setIsReading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const { data: content, isLoading, error } = useQuery({
    queryKey: ['content', contentId],
    queryFn: () => contentService.getById(contentId),
  })

  // Extract text from HTML content
  const extractTextFromHTML = (html: string): string => {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    return tempDiv.textContent || tempDiv.innerText || ''
  }

  // Get text content for reading (only body)
  const getFullText = (): string => {
    if (!content || !content.body) return ''
    return extractTextFromHTML(content.body)
  }

  // Start reading
  const startReading = () => {
    if (!content) return

    // Stop any existing speech
    if (speechSynthesisRef.current) {
      window.speechSynthesis.cancel()
    }

    const text = getFullText()
    if (!text.trim()) {
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'vi-VN' // Vietnamese
    utterance.rate = 1.0 // Normal speed
    utterance.pitch = 1.0 // Normal pitch
    utterance.volume = 1.0 // Full volume

    utterance.onstart = () => {
      setIsReading(true)
      setIsPaused(false)
    }

    utterance.onend = () => {
      setIsReading(false)
      setIsPaused(false)
      speechSynthesisRef.current = null
    }

    utterance.onerror = () => {
      setIsReading(false)
      setIsPaused(false)
      speechSynthesisRef.current = null
    }

    speechSynthesisRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  // Pause/Resume reading
  const togglePause = () => {
    if (isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    } else {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }

  // Stop reading
  const stopReading = () => {
    window.speechSynthesis.cancel()
    setIsReading(false)
    setIsPaused(false)
    speechSynthesisRef.current = null
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Stop reading when content changes
  useEffect(() => {
    if (speechSynthesisRef.current) {
      window.speechSynthesis.cancel()
      setIsReading(false)
      setIsPaused(false)
      speechSynthesisRef.current = null
    }
  }, [contentId])

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
          <p className="mt-4 text-center text-gray-600">Đang tải nội dung...</p>
        </div>
      </div>
    )
  }

  if (error || !content) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy nội dung</h3>
            <p className="text-gray-600 mb-6">Nội dung này không tồn tại hoặc đã bị xóa.</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Archived':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Page':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Post':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Media':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'Custom':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">{content.title}</h2>
            {content.description && (
              <p className="text-primary-100 text-sm mt-1 line-clamp-2">{content.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-white/90 hover:text-white hover:bg-white/20 rounded-full p-2 transition-colors touch-manipulation flex-shrink-0"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Meta Information */}
          <div className="border-b border-gray-200 bg-gray-50 px-4 md:px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Type */}
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">Loại</div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(content.contentType)}`}>
                    {content.contentType}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">Trạng thái</div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(content.status)}`}>
                    {content.status}
                  </span>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">Ngày tạo</div>
                  <div className="text-sm font-medium text-gray-900">
                    {format(new Date(content.createdAt), 'dd/MM/yyyy HH:mm')}
                  </div>
                </div>
              </div>

              {/* Updated Date */}
              {content.updatedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">Cập nhật</div>
                    <div className="text-sm font-medium text-gray-900">
                      {format(new Date(content.updatedAt), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Published Date */}
            {content.publishedAt && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">Ngày xuất bản</div>
                    <div className="text-sm font-medium text-green-700">
                      {format(new Date(content.publishedAt), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Created By */}
            {content.createdBy && (
              <div className="mt-3 flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">Người tạo</div>
                  <div className="text-sm font-medium text-gray-900">{content.createdBy}</div>
                </div>
              </div>
            )}

            {/* Slug */}
            <div className="mt-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">Slug</div>
                <div className="text-sm font-mono text-gray-900 truncate bg-white px-2 py-1 rounded border border-gray-200">
                  {content.slug}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {content.description && (
            <div className="px-4 md:px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Mô tả</h3>
              <p className="text-gray-600 leading-relaxed">{content.description}</p>
            </div>
          )}

          {/* Body Content */}
          <div className="px-4 md:px-6 py-4 md:py-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-600" />
                Nội dung
              </h3>
              {content && content.body && (
                <div className="flex items-center gap-2">
                  {isReading ? (
                    <>
                      <button
                        onClick={togglePause}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 active:bg-yellow-700 transition-colors touch-manipulation text-sm"
                        title={isPaused ? 'Tiếp tục đọc' : 'Tạm dừng'}
                      >
                        {isPaused ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        <span>{isPaused ? 'Tiếp tục' : 'Tạm dừng'}</span>
                      </button>
                      <button
                        onClick={stopReading}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 active:bg-red-700 transition-colors touch-manipulation text-sm"
                        title="Dừng đọc"
                      >
                        <VolumeX className="h-4 w-4" />
                        <span>Dừng</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startReading}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 active:bg-green-700 transition-colors touch-manipulation text-sm"
                      title="Đọc nội dung"
                    >
                      <Volume2 className="h-4 w-4" />
                      <span>Đọc</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            {content.body ? (
              <div 
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:my-4 prose-p:pl-0 prose-p:pr-0 prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-primary-700 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-blockquote:border-primary-300 prose-blockquote:text-gray-600 prose-img:rounded-lg prose-img:shadow-md whitespace-pre-wrap break-words"
                style={{ paddingLeft: 0, paddingRight: 0, marginLeft: 0, marginRight: 0 }}
                dangerouslySetInnerHTML={{ __html: content.body }}
              />
            ) : (
              <p className="text-gray-500 italic">Không có nội dung</p>
            )}
          </div>

          {/* Attached Files */}
          {content.fileIds && content.fileIds.length > 0 && (
            <div className="px-4 md:px-6 py-4 border-t border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Tệp đính kèm ({content.fileIds.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {content.fileIds.map((fileId) => (
                  <a
                    key={fileId}
                    href={fileService.getStreamUrl(fileId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group"
                  >
                    <FileText className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors flex-shrink-0" />
                    <span className="text-xs text-gray-600 group-hover:text-primary-600 truncate flex-1">
                      File {fileId.substring(0, 8)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 bg-gray-50 px-4 md:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>ID: {content.id}</span>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(content)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 active:bg-primary-800 transition-colors touch-manipulation"
              >
                <Edit className="h-4 w-4" />
                <span>Chỉnh sửa</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(content.id)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation"
              >
                <Trash2 className="h-4 w-4" />
                <span>Xóa</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 active:bg-gray-400 transition-colors touch-manipulation"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

