import { useEffect, useState } from 'react'
import { Layout, Typography, Badge, Button, Space, Modal, Drawer, Dropdown, message as antMessage } from 'antd'
import { MessageOutlined, UserOutlined, MoreOutlined, SettingOutlined, ArrowLeftOutlined, MenuOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { chatService } from '../../services/chatService'
import { chatSignalRService } from '../../services/chatSignalRService'
import type { ChatRoomDto, MessageDto } from '../../types'
import ChatRoomList from './ChatRoomList'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import NewChatButton from './NewChatButton'
import MessageAutoDeleteSettings from './MessageAutoDeleteSettings'
import { useAuthStore } from '../../store/authStore'

const { Header, Content } = Layout
const { Text } = Typography

export default function ChatWindow() {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomDto | null>(null)
  const [connected, setConnected] = useState(false)
  const [replyToMessage, setReplyToMessage] = useState<MessageDto | null>(null)
  const [showAutoDeleteSettings, setShowAutoDeleteSettings] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { user } = useAuthStore()

  // Detect mobile screen size
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) {
        setSidebarOpen(false) // Close sidebar on desktop
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Get display name for room (for Direct messages, show other person's name)
  const getRoomDisplayName = (room: ChatRoomDto | null) => {
    if (!room) return ''
    if (room.roomType === 0 && room.members.length > 0) {
      return room.members.find((m) => m.userId !== user?.id)?.userName || room.name
    }
    return room.name
  }

  // Get avatar for room
  const getRoomAvatar = (room: ChatRoomDto | null) => {
    if (!room) return 'U'
    if (room.roomType === 0 && room.members.length > 0) {
      const otherMember = room.members.find((m) => m.userId !== user?.id)
      return otherMember?.userName?.charAt(0).toUpperCase() || 'U'
    }
    return room.name.charAt(0).toUpperCase()
  }

  useEffect(() => {
    // Connect to SignalR
    chatSignalRService
      .connect()
      .then(() => {
        setConnected(true)
        console.log('Chat SignalR connected')
      })
      .catch((error) => {
        console.error('Failed to connect to Chat SignalR:', error)
        setConnected(false)
      })

    return () => {
      // Don't disconnect here as MessageList and other components might still need it
      // The connection will be managed globally
    }
  }, [])

  useEffect(() => {
    if (selectedRoom?.id) {
      // Set unread count to 0 immediately when selecting room (user is actively viewing)
      setSelectedRoom((prev) => prev ? { ...prev, unreadCount: 0 } : null)

      // Ensure connection is established before joining room
      chatSignalRService
        .connect()
        .then(() => {
          console.log('Joining room:', selectedRoom.id)
          return chatSignalRService.joinRoom(selectedRoom.id)
        })
        .then(() => {
          console.log('Successfully joined room:', selectedRoom.id)
          // Mark room as read and refresh room data
          chatService.markRoomAsRead(selectedRoom.id).then(() => {
            // Refresh room data to update unread count (should be 0 now)
            chatService.getChatRoomById(selectedRoom.id).then((updatedRoom) => {
              setSelectedRoom({ ...updatedRoom, unreadCount: 0 }) // Ensure it's 0
            }).catch(console.error)
          }).catch(console.error)
        })
        .catch((error) => {
          console.error('Failed to join room:', error)
        })

      return () => {
        if (selectedRoom?.id) {
          chatSignalRService.leaveRoom(selectedRoom.id).catch(console.error)
        }
      }
    }
  }, [selectedRoom?.id])

  const handleSelectRoom = (room: ChatRoomDto) => {
    setSelectedRoom(room)
    if (isMobile) {
      setSidebarOpen(false) // Close sidebar on mobile after selecting room
    }
  }

  const handleDeleteRoom = async () => {
    if (!selectedRoom) return

    setDeleting(true)
    try {
      await chatService.deleteChatRoom(selectedRoom.id)
      antMessage.success('Đã xóa cuộc trò chuyện thành công')
      
      // Leave SignalR room
      await chatSignalRService.leaveRoom(selectedRoom.id).catch(console.error)
      
      // Clear selected room
      setSelectedRoom(null)
      
      // Refresh room list
      setRefreshKey(prev => prev + 1)
      
      // Close confirmation modal
      setShowDeleteConfirm(false)
    } catch (error: any) {
      console.error('Failed to delete chat room:', error)
      antMessage.error(error?.response?.data?.errorMessage || 'Không thể xóa cuộc trò chuyện')
    } finally {
      setDeleting(false)
    }
  }

  const handleMessageSent = async (message: MessageDto) => {
    // Message will be added via SignalR, no need to manually add here
    console.log('Message sent:', message)
    
    // Refresh selected room data to update last message
    // UnreadCount should remain 0 since user is actively viewing
    if (selectedRoom?.id) {
      try {
        const updatedRoom = await chatService.getChatRoomById(selectedRoom.id)
        setSelectedRoom({ ...updatedRoom, unreadCount: 0 }) // Keep unreadCount at 0 when actively chatting
      } catch (error) {
        console.error('Failed to refresh room data:', error)
      }
    }
  }

  // Refresh room data when new message arrives
  useEffect(() => {
    if (!selectedRoom?.id) return

    const handleNewMessage = async (message: MessageDto) => {
      // Check if message belongs to selected room
      if (message.chatRoomId === selectedRoom.id) {
        try {
          const updatedRoom = await chatService.getChatRoomById(selectedRoom.id)
          // When actively viewing, unreadCount should be 0 (room is marked as read)
          setSelectedRoom({ ...updatedRoom, unreadCount: 0 })
        } catch (error) {
          console.error('Failed to refresh room data:', error)
        }
      }
    }

    chatSignalRService.onNewMessage(handleNewMessage)

    return () => {
      // Cleanup handled by chatSignalRService
    }
  }, [selectedRoom?.id])

  return (
    <Layout style={{ height: '100%', background: 'transparent', overflow: 'hidden' }}>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
        {/* Sidebar - Chat Room List */}
        {/* Desktop: Always visible */}
        {!isMobile && (
          <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid #f0f0f0', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ChatRoomList
              key={refreshKey}
              onSelectRoom={handleSelectRoom}
              selectedRoomId={selectedRoom?.id}
              onRoomCreated={(room) => {
                setSelectedRoom(room)
              }}
            />
          </div>
        )}

        {/* Mobile: Drawer */}
        {isMobile && (
          <Drawer
            title="Tin nhắn"
            placement="left"
            onClose={() => setSidebarOpen(false)}
            open={sidebarOpen}
            width={320}
            bodyStyle={{ padding: 0 }}
            styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column' } }}
          >
            <ChatRoomList
              key={refreshKey}
              onSelectRoom={handleSelectRoom}
              selectedRoomId={selectedRoom?.id}
              onRoomCreated={(room) => {
                setSelectedRoom(room)
              }}
            />
          </Drawer>
        )}

        {/* Main Chat Area */}
        <Layout style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <Header
                style={{
                  background: '#fff',
                  borderBottom: '1px solid #f0f0f0',
                  padding: isMobile ? '0 12px' : '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: isMobile ? 56 : 64,
                  flexShrink: 0,
                }}
              >
                <Space size={isMobile ? 'small' : 'middle'}>
                  {isMobile && (
                    <Button
                      type="text"
                      icon={<ArrowLeftOutlined />}
                      onClick={() => setSelectedRoom(null)}
                      style={{ padding: '4px 8px' }}
                    />
                  )}
                  {isMobile && (
                    <Button
                      type="text"
                      icon={<MenuOutlined />}
                      onClick={() => setSidebarOpen(true)}
                      style={{ padding: '4px 8px' }}
                    />
                  )}
                  <div
                    style={{
                      width: isMobile ? 36 : 40,
                      height: isMobile ? 36 : 40,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: isMobile ? 14 : 16,
                      flexShrink: 0,
                    }}
                  >
                    {getRoomAvatar(selectedRoom)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text strong style={{ fontSize: isMobile ? 14 : 16, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getRoomDisplayName(selectedRoom)}
                    </Text>
                    {selectedRoom.description && selectedRoom.roomType !== 0 && !isMobile && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {selectedRoom.description}
                      </Text>
                    )}
                  </div>
                </Space>
                <Space size={isMobile ? 'small' : 'middle'}>
                  {!isMobile && (
                    <Button
                      type="text"
                      icon={<SettingOutlined />}
                      onClick={() => setShowAutoDeleteSettings(true)}
                      title="Cài đặt tự động xóa tin nhắn"
                    />
                  )}
                  <Button
                    type="text"
                    icon={<UserOutlined />}
                    onClick={() => {
                      // TODO: Show room members
                      console.log('Show room members')
                    }}
                    style={{ padding: isMobile ? '4px 8px' : undefined }}
                  />
                  <Dropdown
                    menu={{
                      items: [
                        ...(!isMobile ? [{
                          key: 'autoDelete',
                          label: 'Cài đặt tự động xóa',
                          icon: <SettingOutlined />,
                          onClick: () => setShowAutoDeleteSettings(true),
                        }] : []),
                        {
                          key: 'delete',
                          label: 'Xóa cuộc trò chuyện',
                          icon: <DeleteOutlined />,
                          danger: true,
                          onClick: () => setShowDeleteConfirm(true),
                        },
                      ],
                    } as MenuProps}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button
                      type="text"
                      icon={<MoreOutlined />}
                      style={{ padding: isMobile ? '4px 8px' : undefined }}
                    />
                  </Dropdown>
                </Space>
              </Header>

              {/* Messages */}
              <Content 
                style={{ 
                  flex: 1, 
                  overflow: 'hidden', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  minHeight: 0,
                  height: 0, // Force flex to calculate correctly
                }}
              >
                <MessageList 
                  roomId={selectedRoom.id} 
                  receiverId={undefined}
                  onReply={(message) => setReplyToMessage(message)}
                />
              </Content>

              {/* Message Input */}
              <div style={{ flexShrink: 0 }}>
                <MessageInput
                  roomId={selectedRoom.id}
                  receiverId={undefined}
                  replyToMessage={replyToMessage}
                  onMessageSent={(message) => {
                    handleMessageSent(message)
                    setReplyToMessage(null) // Clear reply after sending
                  }}
                  onCancelReply={() => setReplyToMessage(null)}
                />
              </div>
            </>
          ) : (
            <Content
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fafafa',
                overflow: 'hidden',
              }}
            >
              <div style={{ textAlign: 'center', padding: isMobile ? '24px' : '40px' }}>
                <MessageOutlined style={{ fontSize: isMobile ? 48 : 64, color: '#d9d9d9', marginBottom: 16 }} />
                <Text type="secondary" style={{ fontSize: isMobile ? 14 : 16, display: 'block', marginBottom: 8 }}>
                  {isMobile ? 'Chọn cuộc trò chuyện' : 'Chọn một cuộc trò chuyện'}
                </Text>
                {!isMobile && (
                  <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 24 }}>
                    Để bắt đầu nhắn tin
                  </Text>
                )}
                {isMobile ? (
                  <Button
                    type="primary"
                    icon={<MessageOutlined />}
                    onClick={() => setSidebarOpen(true)}
                    size="large"
                    style={{ marginTop: 16 }}
                  >
                    Xem danh sách
                  </Button>
                ) : (
                  <NewChatButton
                    onRoomCreated={(room) => {
                      setSelectedRoom(room)
                    }}
                  />
                )}
              </div>
            </Content>
          )}

          {/* Connection Status */}
          {!connected && (
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                background: '#faad14',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                fontSize: 14,
                zIndex: 1000,
              }}
            >
              Đang kết nối...
            </div>
          )}
        </Layout>
      </div>

      {/* Auto Delete Settings Modal */}
      <Modal
        title="Cài đặt tự động xóa tin nhắn"
        open={showAutoDeleteSettings}
        onCancel={() => setShowAutoDeleteSettings(false)}
        footer={null}
        width={isMobile ? '100%' : 700}
        style={isMobile ? { top: 0, paddingBottom: 0 } : undefined}
        styles={isMobile ? { body: { padding: '16px' } } : undefined}
        destroyOnClose
      >
        <MessageAutoDeleteSettings />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
            <span>Xác nhận xóa cuộc trò chuyện</span>
          </div>
        }
        open={showDeleteConfirm}
        onOk={handleDeleteRoom}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmLoading={deleting}
        okText="Xóa"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        width={isMobile ? '90%' : 480}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ marginBottom: 12, fontSize: isMobile ? 14 : 15 }}>
            Bạn có chắc chắn muốn xóa cuộc trò chuyện này không?
          </p>
          <p style={{ margin: 0, color: '#ff4d4f', fontSize: isMobile ? 12 : 13 }}>
            ⚠️ Hành động này không thể hoàn tác. Tất cả tin nhắn, file đính kèm và dữ liệu liên quan sẽ bị xóa vĩnh viễn.
          </p>
        </div>
      </Modal>
    </Layout>
  )
}
