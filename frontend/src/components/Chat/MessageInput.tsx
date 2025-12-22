import { useState, useRef, useEffect } from 'react'
import { Input, Button, Space, Upload, Modal, message, Popover, Spin, Typography, Dropdown, Divider } from 'antd'
import { SendOutlined, PaperClipOutlined, SmileOutlined, FileImageOutlined, CloseOutlined, MoreOutlined, SearchOutlined, LinkOutlined, UploadOutlined, CloseCircleOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps, MenuProps } from 'antd'
import { chatService } from '../../services/chatService'
import { chatSignalRService } from '../../services/chatSignalRService'
import { fileService } from '../../services/fileService'
import type { MessageDto, MessageType, CreateAttachmentDto } from '../../types'
import { useAuthStore } from '../../store/authStore'

const { TextArea } = Input
const { Text } = Typography

interface MessageInputProps {
  roomId?: string
  receiverId?: string
  replyToMessage?: MessageDto | null
  onMessageSent?: (message: MessageDto) => void
  onCancelReply?: () => void
}

// Simple emoji list
const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '👆', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️',
  '💪', '🦵', '🦶', '👂', '👃', '🧠', '🦷', '🦴', '👀', '👁️',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
]

export default function MessageInput({ roomId, receiverId, replyToMessage, onMessageSent, onCancelReply }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [attachments, setAttachments] = useState<CreateAttachmentDto[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<UploadFile[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifModal, setShowGifModal] = useState(false)
  const [gifUrl, setGifUrl] = useState('')
  const [gifSearchQuery, setGifSearchQuery] = useState('')
  const [gifResults, setGifResults] = useState<any[]>([])
  const [gifLoading, setGifLoading] = useState(false)
  const [gifSearchTimeout, setGifSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuthStore()

  // Detect mobile screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])


  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const handleTyping = () => {
    if (!isTyping && (roomId || receiverId)) {
      setIsTyping(true)
      if (roomId && user) {
        chatSignalRService.sendTyping(roomId, user.id, `${user.firstName} ${user.lastName}`)
      }
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      if (roomId && user) {
        chatSignalRService.stopTyping(roomId, user.id)
      }
    }, 1000)
  }

  const handleFileUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError, onProgress } = options
    const fileObj = file as File

    try {
      // Upload file using fileService
      const uploadedFile = await fileService.upload(
        fileObj,
        undefined,
        undefined,
        (progress) => {
          if (onProgress) {
            onProgress({ percent: progress.percentage })
          }
        }
      )

      // Add to attachments - store relative path, will add token when displaying
      // Backend expects filePath, we'll store relative path and add token when rendering
      const relativePath = `/api/files/${uploadedFile.id}/stream`
      const attachment: CreateAttachmentDto = {
        fileName: uploadedFile.fileName,
        filePath: relativePath, // Store relative path, will add token when displaying
        contentType: uploadedFile.contentType,
        fileSize: uploadedFile.fileSize,
      }

      setAttachments((prev) => [...prev, attachment])
      
      // Update upload file list
      setUploadingFiles((prev) => 
        prev.map((f) => 
          f.uid === fileObj.uid 
            ? { ...f, status: 'done', response: uploadedFile }
            : f
        )
      )

      if (onSuccess) {
        onSuccess(uploadedFile)
      }
      message.success(`Đã tải lên: ${fileObj.name}`)
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadingFiles((prev) => 
        prev.map((f) => 
          f.uid === fileObj.uid 
            ? { ...f, status: 'error' }
            : f
        )
      )
      if (onError) {
        onError(error)
      }
      message.error(`Lỗi tải lên: ${fileObj.name}`)
    }
  }

  const handleFileChange: UploadProps['onChange'] = (info) => {
    setUploadingFiles(info.fileList)
  }

  const handleRemoveFile = (file: UploadFile) => {
    setAttachments((prev) => prev.filter((a) => a.fileName !== file.name))
    setUploadingFiles((prev) => prev.filter((f) => f.uid !== file.uid))
  }

  const handleEmojiSelect = (emoji: string) => {
    setContent((prev) => prev + emoji)
    setShowEmojiPicker(false)
  }

  const handleInsertGif = async () => {
    if (!gifUrl.trim()) {
      message.warning('Vui lòng nhập URL của GIF hoặc chọn file GIF')
      return
    }

    try {
      // If it's a URL, validate it and add as attachment
      if (gifUrl.startsWith('http://') || gifUrl.startsWith('https://')) {
        // Create attachment from URL
        const attachment: CreateAttachmentDto = {
          fileName: 'gif.gif',
          filePath: gifUrl,
          contentType: 'image/gif',
          fileSize: 0, // Unknown size for external URLs
        }
        setAttachments((prev) => [...prev, attachment])
        setGifUrl('')
        setShowGifModal(false)
        message.success('Đã thêm GIF')
      } else {
        message.error('URL không hợp lệ. Vui lòng nhập URL đầy đủ (bắt đầu với http:// hoặc https://)')
      }
    } catch (error) {
      console.error('Failed to insert GIF:', error)
      message.error('Lỗi khi thêm GIF')
    }
  }

  const handleGifFileUpload = async (file: File) => {
    if (!file.type.includes('gif')) {
      message.error('File phải là định dạng GIF')
      return
    }

    try {
      const uploadedFile = await fileService.upload(
        file,
        undefined,
        undefined,
        undefined
      )

      const relativePath = `/api/files/${uploadedFile.id}/stream`
      const attachment: CreateAttachmentDto = {
        fileName: uploadedFile.fileName,
        filePath: relativePath,
        contentType: 'image/gif',
        fileSize: uploadedFile.fileSize,
      }

      setAttachments((prev) => [...prev, attachment])
      setGifUrl('')
      setShowGifModal(false)
      message.success('Đã thêm GIF')
    } catch (error) {
      console.error('Failed to upload GIF:', error)
      message.error('Lỗi khi upload GIF')
    }
  }

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      setGifResults([])
      return
    }

    try {
      setGifLoading(true)
      const response = await chatService.searchGifs(query, 20)
      
      // Response structure: { data: { data: [...] } } from Giphy API wrapped in ApiResponse
      // extractData already extracts the inner data, so response should be the Giphy response object
      if (response?.data && Array.isArray(response.data)) {
        setGifResults(response.data)
      } else if (response && typeof response === 'object' && 'data' in response) {
        // Handle case where response is the Giphy API response directly
        const giphyData = (response as any).data
        if (Array.isArray(giphyData)) {
          setGifResults(giphyData)
        } else {
          setGifResults([])
        }
      } else {
        setGifResults([])
      }
    } catch (error: any) {
      console.error('Failed to search GIFs:', error)
      message.error(error?.response?.data?.message || error?.message || 'Lỗi khi tìm kiếm GIF')
      setGifResults([])
    } finally {
      setGifLoading(false)
    }
  }

  const handleGifSearchChange = (value: string) => {
    setGifSearchQuery(value)
    
    // Debounce search
    if (gifSearchTimeout) {
      clearTimeout(gifSearchTimeout)
    }
    
    const timeout = setTimeout(() => {
      searchGifs(value)
    }, 500) // Wait 500ms after user stops typing
    
    setGifSearchTimeout(timeout)
  }

  const handleSelectGif = (gif: any) => {
    // Use original URL or downsized medium URL
    const gifUrl = gif.images?.original?.url || gif.images?.downsized_medium?.url || gif.images?.fixed_height?.url
    
    if (gifUrl) {
      const attachment: CreateAttachmentDto = {
        fileName: `${gif.title || 'gif'}.gif`,
        filePath: gifUrl,
        contentType: 'image/gif',
        fileSize: 0,
      }
      setAttachments((prev) => [...prev, attachment])
      setShowGifModal(false)
      setGifSearchQuery('')
      setGifResults([])
      setGifUrl('')
      message.success('Đã thêm GIF')
    }
  }

  // Load trending GIFs when modal opens
  useEffect(() => {
    if (showGifModal && !gifSearchQuery) {
      const loadTrending = async () => {
        try {
          setGifLoading(true)
          const response = await chatService.getTrendingGifs(20)
          
          // Response structure: { data: { data: [...] } } from Giphy API wrapped in ApiResponse
          if (response?.data && Array.isArray(response.data)) {
            setGifResults(response.data)
          } else if (response && typeof response === 'object' && 'data' in response) {
            // Handle case where response is the Giphy API response directly
            const giphyData = (response as any).data
            if (Array.isArray(giphyData)) {
              setGifResults(giphyData)
            }
          }
        } catch (error) {
          console.error('Failed to load trending GIFs:', error)
        } finally {
          setGifLoading(false)
        }
      }
      loadTrending()
    }
  }, [showGifModal])

  useEffect(() => {
    return () => {
      if (gifSearchTimeout) {
        clearTimeout(gifSearchTimeout)
      }
    }
  }, [gifSearchTimeout])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if ((!content.trim() && attachments.length === 0) || sending) return

    try {
      setSending(true)
      const message = await chatService.sendMessage({
        content: content.trim(),
        chatRoomId: roomId,
        receiverId: receiverId,
        messageType: 0 as MessageType,
        attachments: attachments.length > 0 ? attachments : undefined,
        replyToMessageId: replyToMessage?.id,
      })

      setContent('')
      setAttachments([])
      setUploadingFiles([])
      if (onCancelReply) {
        onCancelReply() // Clear reply after sending
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      setIsTyping(false)
      if (roomId && user) {
        chatSignalRService.stopTyping(roomId, user.id)
      }

      onMessageSent?.(message)
    } catch (error) {
      console.error('Failed to send message:', error)
      message.error('Gửi tin nhắn thất bại')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getEmojiPickerContent = () => {
    const mobile = window.innerWidth < 768
    return (
      <div style={{ width: mobile ? 'calc(100vw - 80px)' : 300, maxHeight: 300, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${mobile ? 8 : 10}, 1fr)`, gap: mobile ? '6px' : '8px', padding: mobile ? '6px' : '8px' }}>
          {EMOJIS.map((emoji, index) => (
            <button
              key={index}
              onClick={() => handleEmojiSelect(emoji)}
              style={{
                fontSize: mobile ? '20px' : '24px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: mobile ? '6px' : '4px',
                borderRadius: '4px',
                minHeight: mobile ? 36 : undefined,
                minWidth: mobile ? 36 : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                if (!mobile) {
                  e.currentTarget.style.background = '#f0f0f0'
                }
              }}
              onMouseLeave={(e) => {
                if (!mobile) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.background = '#f0f0f0'
              }}
              onTouchEnd={(e) => {
                setTimeout(() => {
                  e.currentTarget.style.background = 'transparent'
                }, 200)
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (!roomId && !receiverId) {
    return null
  }

  return (
    <>
      <div
        style={{
          borderTop: '1px solid #f0f0f0',
          background: '#fff',
          padding: isMobile ? '12px' : '16px',
        }}
      >
        {/* Show reply preview - Zalo style */}
        {replyToMessage && (
          <div
            style={{
              background: '#f0f7ff',
              borderLeft: '3px solid #1890ff',
              padding: isMobile ? '8px 10px' : '10px 12px',
              marginBottom: isMobile ? 6 : 8,
              borderRadius: 6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, marginBottom: isMobile ? 4 : 6, color: '#1890ff' }}>
                Trả lời {replyToMessage.senderName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8 }}>
                {replyToMessage.attachments && replyToMessage.attachments.length > 0 && (
                  replyToMessage.attachments[0].contentType.startsWith('image/') ? (
                    <img
                      src={(() => {
                        const url = replyToMessage.attachments[0].filePath.startsWith('/')
                          ? `${window.location.origin}${replyToMessage.attachments[0].filePath}`
                          : replyToMessage.attachments[0].filePath
                        const token = useAuthStore.getState().token
                        return token && url.includes('/stream')
                          ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
                          : url
                      })()}
                      alt="Preview"
                      style={{
                        width: isMobile ? 32 : 40,
                        height: isMobile ? 32 : 40,
                        objectFit: 'cover',
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                    />
                  ) : replyToMessage.attachments[0].contentType.startsWith('video/') ? (
                    <div
                      style={{
                        width: isMobile ? 32 : 40,
                        height: isMobile ? 32 : 40,
                        background: '#e6f7ff',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: isMobile ? 16 : 20,
                      }}
                    >
                      ▶️
                    </div>
                  ) : null
                )}
                <div
                  style={{
                    fontSize: isMobile ? 11 : 12,
                    color: '#666',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {replyToMessage.content || (replyToMessage.attachments && replyToMessage.attachments.length > 0 ? '📎 Đã gửi file' : 'Tin nhắn')}
                </div>
              </div>
            </div>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={onCancelReply}
              style={{ 
                flexShrink: 0, 
                padding: 0, 
                width: isMobile ? 28 : 24, 
                height: isMobile ? 28 : 24,
                color: '#999',
              }}
            />
          </div>
        )}

        {/* Show attachments preview */}
        {attachments.length > 0 && (
          <div style={{ marginBottom: isMobile ? 6 : 8, display: 'flex', flexWrap: 'wrap', gap: isMobile ? 6 : 8 }}>
            {attachments.map((attachment, index) => {
              const isImage = attachment.contentType.startsWith('image/')
              const isVideo = attachment.contentType.startsWith('video/')
              
              return (
                <div
                  key={index}
                  style={{
                    position: 'relative',
                    border: '1px solid #d9d9d9',
                    borderRadius: 8,
                    overflow: 'hidden',
                    maxWidth: isMobile ? 'calc(50% - 6px)' : 200,
                  }}
                >
                  {isImage ? (
                    <img
                      src={(() => {
                        const url = attachment.filePath.startsWith('/')
                          ? `${window.location.origin}${attachment.filePath}`
                          : attachment.filePath
                        const token = useAuthStore.getState().token
                        return token && url.includes('/stream')
                          ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
                          : url
                      })()}
                      alt={attachment.fileName}
                      style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                    />
                  ) : isVideo ? (
                    <video
                      src={(() => {
                        const url = attachment.filePath.startsWith('/')
                          ? `${window.location.origin}${attachment.filePath}`
                          : attachment.filePath
                        const token = useAuthStore.getState().token
                        return token && url.includes('/stream')
                          ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
                          : url
                      })()}
                      style={{ width: '100%', height: 100, objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ padding: 16, textAlign: 'center' }}>
                      📎 {attachment.fileName}
                    </div>
                  )}
                  <Button
                    type="text"
                    danger
                    size="small"
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      minWidth: 'auto',
                      width: 24,
                      height: 24,
                      padding: 0,
                    }}
                    onClick={() => {
                      setAttachments((prev) => prev.filter((_, i) => i !== index))
                      setUploadingFiles((prev) => prev.filter((_, i) => i !== index))
                    }}
                  >
                    ×
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {isMobile ? (
          // Mobile layout: More compact, buttons in a row above textarea
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Action buttons row */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Popover
                content={getEmojiPickerContent()}
                title="Chọn emoji"
                trigger="click"
                open={showEmojiPicker}
                onOpenChange={setShowEmojiPicker}
                placement="top"
                overlayStyle={{ maxWidth: 'calc(100vw - 40px)' }}
              >
                <Button
                  icon={<SmileOutlined />}
                  style={{ flexShrink: 0, padding: '4px 8px', height: 36 }}
                  size="small"
                />
              </Popover>

              <Button
                icon={<FileImageOutlined />}
                style={{ flexShrink: 0, padding: '4px 8px', height: 36 }}
                onClick={() => setShowGifModal(true)}
                title="Chèn GIF"
                size="small"
              />

              <Upload
                customRequest={handleFileUpload}
                onChange={handleFileChange}
                fileList={uploadingFiles}
                onRemove={handleRemoveFile}
                accept="image/*,video/*"
                multiple
                showUploadList={false}
              >
                <Button
                  icon={<PaperClipOutlined />}
                  style={{ flexShrink: 0, padding: '4px 8px', height: 36 }}
                  size="small"
                />
              </Upload>

              <div style={{ flex: 1 }} />

              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={sending}
                disabled={(!content.trim() && attachments.length === 0)}
                onClick={() => handleSend()}
                style={{ flexShrink: 0, padding: '4px 12px', height: 36 }}
                size="small"
              />
            </div>

            {/* Textarea */}
            <TextArea
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                handleTyping()
              }}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              autoSize={{ minRows: 1, maxRows: 3 }}
              style={{ resize: 'none', fontSize: 16 }}
            />
          </div>
        ) : (
          // Desktop layout: Original compact layout
          <Space.Compact style={{ width: '100%' }}>
            <Popover
              content={getEmojiPickerContent()}
              title="Chọn emoji"
              trigger="click"
              open={showEmojiPicker}
              onOpenChange={setShowEmojiPicker}
              placement="topLeft"
            >
              <Button
                icon={<SmileOutlined />}
                style={{ flexShrink: 0 }}
              />
            </Popover>

            <Button
              icon={<FileImageOutlined />}
              style={{ flexShrink: 0 }}
              onClick={() => setShowGifModal(true)}
              title="Chèn GIF"
            />

            <Upload
              customRequest={handleFileUpload}
              onChange={handleFileChange}
              fileList={uploadingFiles}
              onRemove={handleRemoveFile}
              accept="image/*,video/*"
              multiple
              showUploadList={false}
            >
              <Button
                icon={<PaperClipOutlined />}
                style={{ flexShrink: 0 }}
              />
            </Upload>

            <TextArea
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                handleTyping()
              }}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ resize: 'none' }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sending}
              disabled={(!content.trim() && attachments.length === 0)}
              onClick={() => handleSend()}
              style={{ flexShrink: 0 }}
            >
              Gửi
            </Button>
          </Space.Compact>
        )}
      </div>

      {/* GIF Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileImageOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <span>Chèn GIF</span>
          </div>
        }
        open={showGifModal}
        onCancel={() => {
          setShowGifModal(false)
          setGifUrl('')
          setGifSearchQuery('')
          setGifResults([])
        }}
        footer={null}
        width={isMobile ? '100%' : 700}
        style={isMobile ? { top: 0, paddingBottom: 0 } : { top: 20 }}
        styles={isMobile ? { 
          body: { padding: '12px', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' },
          header: { padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }
        } : undefined}
        closeIcon={<CloseCircleOutlined style={{ fontSize: 18, color: '#999' }} />}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={isMobile ? 'small' : 'middle'}>
          {/* Search Input */}
          <div>
            <Input
              placeholder={isMobile ? "Tìm GIF..." : "Tìm kiếm GIF (ví dụ: happy, cat, dance...)"}
              value={gifSearchQuery}
              onChange={(e) => handleGifSearchChange(e.target.value)}
              onPressEnter={() => searchGifs(gifSearchQuery)}
              prefix={<SearchOutlined style={{ color: '#999' }} />}
              suffix={
                gifSearchQuery ? (
                  <CloseCircleOutlined
                    onClick={() => {
                      setGifSearchQuery('')
                      setGifResults([])
                    }}
                    style={{ color: '#999', cursor: 'pointer' }}
                  />
                ) : null
              }
              size={isMobile ? 'middle' : 'large'}
              style={{ borderRadius: 8 }}
            />
            {gifSearchQuery && (
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => searchGifs(gifSearchQuery)}
                loading={gifLoading}
                block
                style={{ marginTop: 8, borderRadius: 8 }}
                size={isMobile ? 'middle' : 'large'}
              >
                Tìm kiếm
              </Button>
            )}
          </div>

          {/* GIF Results Grid */}
          {gifLoading && (
            <div style={{ textAlign: 'center', padding: isMobile ? '30px 0' : '40px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: 12, color: '#999', fontSize: isMobile ? 13 : 14 }}>
                Đang tìm kiếm GIF...
              </div>
            </div>
          )}
          
          {!gifLoading && gifResults.length > 0 && (
            <div
              style={{
                maxHeight: isMobile ? 'calc(100vh - 350px)' : 400,
                overflowY: 'auto',
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                padding: isMobile ? 6 : 8,
                background: '#fafafa',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: isMobile ? 6 : 8,
                }}
              >
                {gifResults.map((gif) => {
                  const previewUrl = gif.images?.fixed_height_small?.url || gif.images?.preview_gif?.url
                  const originalUrl = gif.images?.original?.url || gif.images?.downsized_medium?.url
                  
                  return (
                    <div
                      key={gif.id}
                      onClick={() => handleSelectGif(gif)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: isMobile ? 6 : 8,
                        overflow: 'hidden',
                        border: isMobile ? '2px solid #e8e8e8' : '2px solid transparent',
                        transition: 'all 0.2s',
                        position: 'relative',
                        background: '#fff',
                        boxShadow: isMobile ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isMobile) {
                          e.currentTarget.style.borderColor = '#1890ff'
                          e.currentTarget.style.transform = 'scale(1.05)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(24,144,255,0.3)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isMobile) {
                          e.currentTarget.style.borderColor = 'transparent'
                          e.currentTarget.style.transform = 'scale(1)'
                          e.currentTarget.style.boxShadow = 'none'
                        }
                      }}
                      onTouchStart={(e) => {
                        if (isMobile) {
                          e.currentTarget.style.borderColor = '#1890ff'
                          e.currentTarget.style.transform = 'scale(0.98)'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(24,144,255,0.4)'
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (isMobile) {
                          setTimeout(() => {
                            e.currentTarget.style.borderColor = '#e8e8e8'
                            e.currentTarget.style.transform = 'scale(1)'
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                          }, 200)
                        }
                      }}
                    >
                      <img
                        src={previewUrl}
                        alt={gif.title || 'GIF'}
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                          borderRadius: 6,
                        }}
                        loading="lazy"
                      />
                      {isMobile && (
                        <div style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          background: 'rgba(0,0,0,0.6)',
                          borderRadius: 4,
                          padding: '2px 6px',
                          fontSize: 10,
                          color: '#fff',
                          fontWeight: 500,
                        }}>
                          GIF
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!gifLoading && gifResults.length === 0 && gifSearchQuery && (
            <div style={{ textAlign: 'center', padding: isMobile ? '30px 0' : '40px 0', color: '#999' }}>
              <FileImageOutlined style={{ fontSize: 48, color: '#d9d9d9', display: 'block', marginBottom: 12 }} />
              <div style={{ fontSize: isMobile ? 13 : 14 }}>Không tìm thấy GIF nào</div>
            </div>
          )}

          {/* Divider */}
          {(gifResults.length > 0 || gifSearchQuery) && (
            <Divider style={{ margin: isMobile ? '12px 0' : '16px 0' }}>Hoặc</Divider>
          )}

          {/* Manual URL Input */}
          <div>
            <label style={{ display: 'block', marginBottom: isMobile ? 6 : 8, fontWeight: 500, fontSize: isMobile ? 13 : 14 }}>
              <LinkOutlined style={{ marginRight: 6, color: '#1890ff' }} />
              Nhập URL GIF:
            </label>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder={isMobile ? "URL GIF..." : "Nhập URL của GIF (ví dụ: https://example.com/image.gif)"}
                value={gifUrl}
                onChange={(e) => setGifUrl(e.target.value)}
                onPressEnter={handleInsertGif}
                prefix={<LinkOutlined style={{ color: '#999' }} />}
                size={isMobile ? 'middle' : 'large'}
                style={{ borderRadius: '8px 0 0 8px' }}
              />
              <Button
                type="primary"
                icon={<FileImageOutlined />}
                onClick={handleInsertGif}
                disabled={!gifUrl.trim()}
                size={isMobile ? 'middle' : 'large'}
                style={{ borderRadius: '0 8px 8px 0' }}
              >
                {isMobile ? '' : 'Chèn'}
              </Button>
            </Space.Compact>
          </div>

          {/* Upload File */}
          <div>
            <Upload
              accept="image/gif"
              beforeUpload={(file) => {
                handleGifFileUpload(file)
                return false // Prevent auto upload
              }}
              showUploadList={false}
            >
              <Button 
                type="dashed" 
                block
                icon={<UploadOutlined />}
                size={isMobile ? 'middle' : 'large'}
                style={{ borderRadius: 8, height: isMobile ? 40 : undefined }}
              >
                {isMobile ? 'Upload GIF' : 'Upload file GIF từ máy tính'}
              </Button>
            </Upload>
          </div>

          {/* URL Preview */}
          {gifUrl && (gifUrl.startsWith('http://') || gifUrl.startsWith('https://')) && (
            <div style={{ marginTop: isMobile ? 12 : 16, textAlign: 'center', padding: isMobile ? '8px' : '12px', background: '#f5f5f5', borderRadius: 8 }}>
              <div style={{ fontSize: isMobile ? 11 : 12, color: '#666', marginBottom: 8, fontWeight: 500 }}>
                <FileImageOutlined style={{ marginRight: 4 }} />
                Preview:
              </div>
              <img
                src={gifUrl}
                alt="GIF preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: isMobile ? 150 : 200,
                  borderRadius: 8,
                  border: '1px solid #d9d9d9',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
                onError={() => {
                  message.error('Không thể load GIF từ URL này')
                }}
              />
            </div>
          )}
        </Space>
      </Modal>
    </>
  )
}
