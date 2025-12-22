import { useEffect, useRef, useState } from 'react'
import { List, Avatar, Empty, Spin, Typography, Dropdown, message as antdMessage } from 'antd'
import { DeleteOutlined, MessageOutlined, DownloadOutlined } from '@ant-design/icons'
import { chatService } from '../../services/chatService'
import { chatSignalRService } from '../../services/chatSignalRService'
import type { MessageDto } from '../../types'
import { useAuthStore } from '../../store/authStore'

const { Text } = Typography

interface MessageListProps {
  roomId?: string
  receiverId?: string
  onReply?: (message: MessageDto) => void
}

export default function MessageList({ roomId, receiverId, onReply }: MessageListProps) {
  const [messages, setMessages] = useState<MessageDto[]>([])
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { user } = useAuthStore()

  useEffect(() => {
    if (roomId || receiverId) {
      setMessages([])
      loadMessages()
    }
  }, [roomId, receiverId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle scroll to show/hide scrollbar
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      if (container) {
        container.classList.add('scrolling')
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        scrollTimeoutRef.current = setTimeout(() => {
          container.classList.remove('scrolling')
        }, 1000) // Hide scrollbar after 1 second of no scrolling
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // Subscribe to SignalR for real-time messages
  useEffect(() => {
    // Use ref to track current roomId/receiverId to avoid stale closures
    const currentRoomId = roomId
    const currentReceiverId = receiverId
    
    const handleNewMessage = (message: MessageDto) => {
      console.log('Received new message via SignalR:', message, 'Current roomId:', currentRoomId, 'Current receiverId:', currentReceiverId)
      
      // Only add message if it belongs to current room/receiver
      const belongsToCurrentChat = 
        (currentRoomId && message.chatRoomId && String(message.chatRoomId) === String(currentRoomId)) ||
        (currentReceiverId && (
          (message.receiverId && String(message.receiverId) === String(currentReceiverId)) || 
          (message.senderId && String(message.senderId) === String(currentReceiverId))
        ))
      
      console.log('Message belongs to current chat:', belongsToCurrentChat)
      
      if (belongsToCurrentChat) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === message.id)) {
            console.log('Message already exists, skipping')
            return prev
          }
          console.log('Adding new message to list')
          return [...prev, message]
        })
      }
    }

    const handleMessageDeleted = (data: { messageId: string; roomId?: string; receiverId?: string }) => {
      // Check if deleted message belongs to current chat
      const belongsToCurrentChat = 
        (currentRoomId && data.roomId && String(data.roomId) === String(currentRoomId)) ||
        (currentReceiverId && data.receiverId && String(data.receiverId) === String(currentReceiverId))
      
      if (belongsToCurrentChat) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId))
      }
    }

    // Subscribe to new messages
    chatSignalRService.onNewMessage(handleNewMessage)
    // Subscribe to message deleted
    chatSignalRService.onMessageDeleted(handleMessageDeleted)

    return () => {
      // Note: We don't remove the listener here because other components might be using it
      // The handler checks if message belongs to current chat, so it's safe
    }
  }, [roomId, receiverId])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const data = await chatService.getMessages({
        roomId,
        receiverId,
        page: 1,
        pageSize: 50,
      })
      setMessages(data)
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua'
    } else {
      return date.toLocaleDateString('vi-VN')
    }
  }

  const handleDeleteMessage = async (message: MessageDto) => {
    try {
      await chatService.deleteMessage(message.id)
      setMessages((prev) => prev.filter((m) => m.id !== message.id))
      antdMessage.success('Đã thu hồi tin nhắn')
    } catch (error: any) {
      console.error('Failed to delete message:', error)
      antdMessage.error(error?.response?.data?.message || 'Lỗi khi thu hồi tin nhắn')
    }
  }

  const handleDownloadAttachments = async (message: MessageDto) => {
    if (!message.attachments || message.attachments.length === 0) return

    try {
      for (const attachment of message.attachments) {
        const isImage = attachment.contentType.startsWith('image/')
        const isVideo = attachment.contentType.startsWith('video/')
        
        if (isImage || isVideo) {
          // Get full URL with token
          const getFullUrl = (url: string) => {
            if (!url) return url
            if (url.startsWith('http://') || url.startsWith('https://')) {
              return url
            }
            let fullUrl = url.startsWith('/') 
              ? `${window.location.origin}${url}`
              : url
            if (fullUrl.includes('/stream')) {
              const token = useAuthStore.getState().token
              if (token) {
                const separator = fullUrl.includes('?') ? '&' : '?'
                fullUrl = `${fullUrl}${separator}token=${encodeURIComponent(token)}`
              }
            }
            return fullUrl
          }

          const fileUrl = getFullUrl(attachment.filePath)
          
          // Download file
          const response = await fetch(fileUrl)
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = attachment.fileName
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      }
      antdMessage.success('Đã tải xuống')
    } catch (error: any) {
      console.error('Failed to download attachments:', error)
      antdMessage.error('Lỗi khi tải xuống')
    }
  }

  // Render message content with code blocks and emoji support
  const renderMessageContent = (content: string, isOwnMessage: boolean) => {
    if (!content) return null

    // Split content by code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = []
    let lastIndex = 0
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index),
        })
      }

      // Add code block
      parts.push({
        type: 'code',
        content: match[2],
        language: match[1] || '',
      })

      lastIndex = codeBlockRegex.lastIndex
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex),
      })
    }

    // If no code blocks found, return original content
    if (parts.length === 0) {
      return <span>{content}</span>
    }

    return (
      <>
        {parts.map((part, index) => {
          if (part.type === 'code') {
            return (
              <div
                key={index}
                style={{
                  background: isOwnMessage ? 'rgba(0,0,0,0.2)' : '#f5f5f5',
                  padding: window.innerWidth < 768 ? '6px 10px' : '8px 12px',
                  borderRadius: 4,
                  marginTop: window.innerWidth < 768 ? 6 : 8,
                  marginBottom: window.innerWidth < 768 ? 6 : 8,
                  fontFamily: 'monospace',
                  fontSize: window.innerWidth < 768 ? 12 : 13,
                  overflowX: 'auto',
                  whiteSpace: 'pre',
                }}
              >
                {part.language && (
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.7,
                      marginBottom: 4,
                      textTransform: 'uppercase',
                    }}
                  >
                    {part.language}
                  </div>
                )}
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {part.content}
                </pre>
              </div>
            )
          } else {
            return <span key={index}>{part.content}</span>
          }
        })}
      </>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!roomId && !receiverId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#fafafa' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                Chọn một cuộc trò chuyện
              </Text>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Để bắt đầu nhắn tin
              </Text>
            </div>
          }
        />
      </div>
    )
  }

  let lastDate: string | null = null

  return (
    <div 
      ref={scrollContainerRef}
      className="custom-scrollbar"
      style={{ 
        width: '100%',
        height: '100%',
        overflowY: 'auto', 
        overflowX: 'hidden', 
        padding: '16px', 
        background: '#fafafa', 
        boxSizing: 'border-box',
      }}
    >
      {messages.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                Chưa có tin nhắn nào
              </Text>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Bắt đầu cuộc trò chuyện!
              </Text>
            </div>
          }
          style={{ marginTop: '20%' }}
        />
      ) : (
        <>
          {messages.map((message, index) => {
            const messageDate = formatDate(message.createdAt)
            const showDate = lastDate !== messageDate
            if (showDate) lastDate = messageDate

            const isOwnMessage = message.senderId === user?.id
            const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId

            return (
              <div key={message.id} data-message-id={message.id}>
                {showDate && (
                  <div style={{ textAlign: 'center', margin: '16px 0' }}>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 12,
                        background: '#fff',
                        padding: '4px 12px',
                        borderRadius: 12,
                        display: 'inline-block',
                      }}
                    >
                      {messageDate}
                    </Text>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    marginBottom: 8,
                    justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                    alignItems: 'flex-end',
                  }}
                >
                  {!isOwnMessage && (
                    <div style={{ marginRight: 8, marginBottom: 4 }}>
                      {showAvatar ? (
                        <Avatar
                          style={{
                            backgroundColor: '#667eea',
                          }}
                        >
                          {message.senderName.charAt(0).toUpperCase()}
                        </Avatar>
                      ) : (
                        <div style={{ width: 32 }} />
                      )}
                    </div>
                  )}
                  <div
                    style={{
                      maxWidth: window.innerWidth < 768 ? '85%' : '60%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {!isOwnMessage && showAvatar && (
                      <Text
                        type="secondary"
                        style={{ fontSize: window.innerWidth < 768 ? 11 : 12, marginBottom: 4, marginLeft: 12 }}
                      >
                        {message.senderName}
                      </Text>
                    )}
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'reply',
                            label: 'Trả lời',
                            icon: <MessageOutlined />,
                            onClick: () => onReply?.(message),
                          },
                          ...(message.attachments && message.attachments.some(a => 
                            a.contentType.startsWith('image/') || a.contentType.startsWith('video/')
                          ) ? [{
                            key: 'download',
                            label: 'Tải xuống',
                            icon: <DownloadOutlined />,
                            onClick: () => handleDownloadAttachments(message),
                          }] : []),
                          ...(isOwnMessage ? [{
                            key: 'delete',
                            label: 'Thu hồi',
                            icon: <DeleteOutlined />,
                            danger: true,
                            onClick: () => handleDeleteMessage(message),
                          }] : []),
                        ],
                      }}
                      trigger={['contextMenu', 'click']}
                      placement="bottomRight"
                    >
                      <div
                        style={{
                          background: isOwnMessage ? '#1890ff' : '#fff',
                          color: isOwnMessage ? '#fff' : '#000',
                          padding: window.innerWidth < 768 ? '6px 10px' : '8px 12px',
                          borderRadius: window.innerWidth < 768 ? 10 : 12,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          wordBreak: 'break-word',
                          cursor: 'pointer',
                          position: 'relative',
                          fontSize: window.innerWidth < 768 ? 14 : undefined,
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {/* Reply preview - Zalo style */}
                        {message.replyToMessage && (
                          <div
                            style={{
                              borderLeft: `3px solid ${isOwnMessage ? 'rgba(255,255,255,0.6)' : '#1890ff'}`,
                              paddingLeft: window.innerWidth < 768 ? 6 : 10,
                              marginBottom: window.innerWidth < 768 ? 6 : 8,
                              padding: window.innerWidth < 768 ? '4px 6px' : '6px 10px',
                              background: isOwnMessage ? 'rgba(255,255,255,0.15)' : 'rgba(24,144,255,0.08)',
                              borderRadius: 6,
                              fontSize: window.innerWidth < 768 ? 11 : 12,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              if (window.innerWidth >= 768) {
                                e.currentTarget.style.background = isOwnMessage ? 'rgba(255,255,255,0.25)' : 'rgba(24,144,255,0.15)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (window.innerWidth >= 768) {
                                e.currentTarget.style.background = isOwnMessage ? 'rgba(255,255,255,0.15)' : 'rgba(24,144,255,0.08)'
                              }
                            }}
                            onClick={() => {
                              // Scroll to replied message
                              const repliedMessageElement = document.querySelector(`[data-message-id="${message.replyToMessage?.id}"]`)
                              if (repliedMessageElement) {
                                repliedMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                // Highlight briefly
                                repliedMessageElement.classList.add('highlight-message')
                                setTimeout(() => {
                                  repliedMessageElement.classList.remove('highlight-message')
                                }, 2000)
                              }
                            }}
                          >
                            <div style={{ 
                              fontWeight: 600, 
                              marginBottom: window.innerWidth < 768 ? 2 : 4,
                              color: isOwnMessage ? 'rgba(255,255,255,0.9)' : '#1890ff',
                              fontSize: window.innerWidth < 768 ? 11 : undefined,
                            }}>
                              {message.replyToMessage.senderName}
                            </div>
                            <div style={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: window.innerWidth < 768 ? 4 : 6,
                            }}>
                              {message.replyToMessage.attachments && message.replyToMessage.attachments.length > 0 && (
                                message.replyToMessage.attachments[0].contentType.startsWith('image/') ? (
                                  <img
                                    src={(() => {
                                      const url = message.replyToMessage.attachments[0].filePath.startsWith('/')
                                        ? `${window.location.origin}${message.replyToMessage.attachments[0].filePath}`
                                        : message.replyToMessage.attachments[0].filePath
                                      const token = useAuthStore.getState().token
                                      return token && url.includes('/stream')
                                        ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
                                        : url
                                    })()}
                                    alt="Preview"
                                    style={{
                                      width: window.innerWidth < 768 ? 28 : 32,
                                      height: window.innerWidth < 768 ? 28 : 32,
                                      objectFit: 'cover',
                                      borderRadius: 4,
                                      flexShrink: 0,
                                    }}
                                  />
                                ) : message.replyToMessage.attachments[0].contentType.startsWith('video/') ? (
                                  <div
                                    style={{
                                      width: window.innerWidth < 768 ? 28 : 32,
                                      height: window.innerWidth < 768 ? 28 : 32,
                                      background: isOwnMessage ? 'rgba(255,255,255,0.2)' : '#e6f7ff',
                                      borderRadius: 4,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      fontSize: window.innerWidth < 768 ? 14 : 16,
                                    }}
                                  >
                                    ▶️
                                  </div>
                                ) : (
                                  <span style={{ fontSize: window.innerWidth < 768 ? 14 : 16 }}>📎</span>
                                )
                              )}
                              <div style={{ 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap',
                                maxWidth: window.innerWidth < 768 ? 140 : 180,
                                color: isOwnMessage ? 'rgba(255,255,255,0.8)' : '#666',
                                fontSize: window.innerWidth < 768 ? 11 : undefined,
                              }}>
                                {message.replyToMessage.content || (message.replyToMessage.attachments && message.replyToMessage.attachments.length > 0 ? 'Đã gửi file' : 'Tin nhắn')}
                              </div>
                            </div>
                          </div>
                        )}
                        <div
                          style={{
                            color: isOwnMessage ? '#fff' : '#000',
                            fontSize: window.innerWidth < 768 ? 14 : undefined,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {renderMessageContent(message.content, isOwnMessage)}
                        </div>
                      {message.attachments && message.attachments.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          {message.attachments.map((attachment) => {
                            const isImage = attachment.contentType.startsWith('image/')
                            const isVideo = attachment.contentType.startsWith('video/')
                            
                            // Ensure URL is absolute and includes token for authentication
                            const getFullUrl = (url: string) => {
                              if (!url) return url
                              
                              // If already absolute URL with token, return as is
                              if (url.startsWith('http://') || url.startsWith('https://')) {
                                return url
                              }
                              
                              // If relative URL, make it absolute and add token
                              let fullUrl = url.startsWith('/') 
                                ? `${window.location.origin}${url}`
                                : url
                              
                              // Add token to query string for stream endpoint (required for img/video tags)
                              if (fullUrl.includes('/stream')) {
                                const token = useAuthStore.getState().token
                                if (token) {
                                  const separator = fullUrl.includes('?') ? '&' : '?'
                                  fullUrl = `${fullUrl}${separator}token=${encodeURIComponent(token)}`
                                }
                              }
                              
                              return fullUrl
                            }
                            
                            const fileUrl = getFullUrl(attachment.filePath)
                            
                            return (
                              <div key={attachment.id} style={{ marginTop: 8 }}>
                                {isImage ? (
                                  <img
                                    src={fileUrl}
                                    alt={attachment.fileName}
                                    style={{
                                      maxWidth: '100%',
                                      maxHeight: window.innerWidth < 768 ? 250 : 300,
                                      borderRadius: 8,
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => window.open(fileUrl, '_blank')}
                                    onError={(e) => {
                                      console.error('Failed to load image:', fileUrl, e)
                                    }}
                                  />
                                ) : isVideo ? (
                                  <video
                                    src={fileUrl}
                                    controls
                                    style={{
                                      maxWidth: '100%',
                                      maxHeight: window.innerWidth < 768 ? 250 : 300,
                                      borderRadius: 8,
                                    }}
                                    onError={(e) => {
                                      console.error('Failed to load video:', fileUrl, e)
                                    }}
                                  />
                                ) : (
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      fontSize: 12,
                                      opacity: 0.9,
                                      color: isOwnMessage ? '#fff' : '#1890ff',
                                      textDecoration: 'underline',
                                    }}
                                  >
                                    📎 {attachment.fileName}
                                  </a>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.7,
                          marginTop: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 4,
                        }}
                      >
                        {formatTime(message.createdAt)}
                        {isOwnMessage && message.isRead && (
                          <span style={{ marginLeft: 4 }}>✓✓</span>
                        )}
                      </div>
                    </div>
                    </Dropdown>
                  </div>
                  {isOwnMessage && (
                    <div style={{ marginLeft: 8, marginBottom: 4 }}>
                      {showAvatar ? (
                        <Avatar
                          style={{
                            backgroundColor: '#52c41a',
                          }}
                        >
                          {user?.firstName?.charAt(0).toUpperCase() || 'U'}
                        </Avatar>
                      ) : (
                        <div style={{ width: 32 }} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  )
}
