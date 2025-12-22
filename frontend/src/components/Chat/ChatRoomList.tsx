import { useEffect, useState, useRef } from 'react'
import { List, Avatar, Badge, Empty, Spin, Input, Button, Dropdown, Modal, message as antMessage } from 'antd'
import { SearchOutlined, MessageOutlined, PlusOutlined, DeleteOutlined, MoreOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { chatService } from '../../services/chatService'
import { chatSignalRService } from '../../services/chatSignalRService'
import type { ChatRoomDto } from '../../types'
import { useAuthStore } from '../../store/authStore'
import NewChatButton from './NewChatButton'

interface ChatRoomListProps {
  onSelectRoom: (room: ChatRoomDto) => void
  selectedRoomId?: string
  onRoomCreated?: (room: ChatRoomDto) => void
  onRoomDeleted?: () => void
}

export default function ChatRoomList({ onSelectRoom, selectedRoomId, onRoomCreated, onRoomDeleted }: ChatRoomListProps) {
  const [rooms, setRooms] = useState<ChatRoomDto[]>([])
  const [filteredRooms, setFilteredRooms] = useState<ChatRoomDto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<ChatRoomDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { user } = useAuthStore()
  const isMobile = window.innerWidth < 768

  useEffect(() => {
    loadRooms()
  }, [])

  // Refresh rooms when new message arrives
  useEffect(() => {
    const handleNewMessage = () => {
      loadRooms()
    }

    // Subscribe to new messages to refresh room list
    chatSignalRService.onNewMessage(handleNewMessage)

    return () => {
      // Cleanup handled by chatSignalRService
    }
  }, [])

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

  useEffect(() => {
    if (searchText.trim()) {
      const filtered = rooms.filter(
        (room) =>
          room.name.toLowerCase().includes(searchText.toLowerCase()) ||
          room.lastMessage?.content.toLowerCase().includes(searchText.toLowerCase())
      )
      setFilteredRooms(filtered)
    } else {
      setFilteredRooms(rooms)
    }
  }, [searchText, rooms])

  const loadRooms = async () => {
    try {
      setLoading(true)
      const data = await chatService.getUserChatRooms()
      setRooms(data)
      setFilteredRooms(data)
    } catch (error) {
      console.error('Failed to load chat rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Vừa xong'
    if (minutes < 60) return `${minutes} phút trước`
    if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`
    return date.toLocaleDateString('vi-VN')
  }

  const getRoomDisplayName = (room: ChatRoomDto) => {
    if (room.roomType === 0 && room.members.length > 0) {
      return room.members.find((m) => m.userId !== user?.id)?.userName || room.name
    }
    return room.name
  }

  const getRoomAvatar = (room: ChatRoomDto) => {
    if (room.roomType === 0 && room.members.length > 0) {
      const otherMember = room.members.find((m) => m.userId !== user?.id)
      return otherMember?.userName?.charAt(0).toUpperCase() || 'U'
    }
    return room.name.charAt(0).toUpperCase()
  }

  const handleRoomCreated = (room: ChatRoomDto) => {
    loadRooms()
    onSelectRoom(room)
    onRoomCreated?.(room)
  }

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return

    setDeleting(true)
    try {
      await chatService.deleteChatRoom(roomToDelete.id)
      antMessage.success('Đã xóa cuộc trò chuyện thành công')
      
      // Leave SignalR room
      await chatSignalRService.leaveRoom(roomToDelete.id).catch(console.error)
      
      // Refresh room list
      await loadRooms()
      
      // Notify parent component
      onRoomDeleted?.()
      
      // Close confirmation modal
      setShowDeleteConfirm(false)
      setRoomToDelete(null)
    } catch (error: any) {
      console.error('Failed to delete chat room:', error)
      antMessage.error(error?.response?.data?.errorMessage || 'Không thể xóa cuộc trò chuyện')
    } finally {
      setDeleting(false)
    }
  }

  const handleRoomContextMenu = (e: React.MouseEvent, room: ChatRoomDto) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: isMobile ? '12px' : '16px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        {!isMobile && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Tin nhắn</h2>
          </div>
        )}
        <NewChatButton onRoomCreated={handleRoomCreated} />
      </div>

      <div style={{ padding: isMobile ? '8px 12px' : '12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <Input
          placeholder="Tìm kiếm..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size={isMobile ? 'middle' : 'large'}
        />
      </div>

      <div 
        ref={scrollContainerRef}
        className="custom-scrollbar" 
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spin />
          </div>
        ) : filteredRooms.length === 0 && searchText ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không tìm thấy kết quả"
            style={{ padding: '40px 20px' }}
          />
        ) : (
          <List
            dataSource={filteredRooms}
            renderItem={(room) => (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'delete',
                      label: 'Xóa cuộc trò chuyện',
                      icon: <DeleteOutlined />,
                      danger: true,
                      onClick: () => {
                        setRoomToDelete(room)
                        setShowDeleteConfirm(true)
                      },
                    },
                  ],
                } as MenuProps}
                trigger={['contextMenu']}
                placement="bottomRight"
              >
                <List.Item
                  style={{
                    padding: isMobile ? '12px' : '12px 16px',
                    cursor: 'pointer',
                    backgroundColor: selectedRoomId === room.id ? '#e6f4ff' : 'transparent',
                    borderLeft: selectedRoomId === room.id ? '3px solid #1890ff' : 'none',
                    minHeight: isMobile ? 64 : undefined,
                    position: 'relative',
                  }}
                  onClick={() => onSelectRoom(room)}
                  onContextMenu={(e) => handleRoomContextMenu(e, room)}
                  onMouseEnter={(e) => {
                    if (!isMobile && selectedRoomId !== room.id) {
                      e.currentTarget.style.backgroundColor = '#fafafa'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile && selectedRoomId !== room.id) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                <List.Item.Meta
                  avatar={
                    <Badge count={room.unreadCount} overflowCount={99} offset={[-5, 5]}>
                      <Avatar
                        style={{
                          backgroundColor: selectedRoomId === room.id ? '#1890ff' : '#667eea',
                        }}
                        size={isMobile ? 'default' : 'large'}
                      >
                        {getRoomAvatar(room)}
                      </Avatar>
                    </Badge>
                  }
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontWeight: room.unreadCount > 0 ? 600 : 400,
                          fontSize: isMobile ? 13 : 14,
                          color: room.unreadCount > 0 ? '#000' : '#666',
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {getRoomDisplayName(room)}
                      </span>
                      {room.lastMessage && (
                        <span style={{ fontSize: isMobile ? 11 : 12, color: '#999', flexShrink: 0 }}>
                          {formatTime(room.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                  }
                  description={
                    <div
                      style={{
                        fontSize: isMobile ? 12 : 13,
                        color: '#666',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 4,
                      }}
                    >
                      {room.lastMessage ? (
                        <>
                          <span style={{ fontWeight: room.unreadCount > 0 ? 500 : 400 }}>
                            {room.lastMessage.senderName}:
                          </span>{' '}
                          {room.lastMessage.content}
                        </>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: '#999' }}>Chưa có tin nhắn</span>
                      )}
                    </div>
                  }
                />
              </List.Item>
              </Dropdown>
            )}
          />
        )}
      </div>

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
        onCancel={() => {
          setShowDeleteConfirm(false)
          setRoomToDelete(null)
        }}
        confirmLoading={deleting}
        okText="Xóa"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        width={isMobile ? '90%' : 480}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ marginBottom: 12, fontSize: isMobile ? 14 : 15 }}>
            Bạn có chắc chắn muốn xóa cuộc trò chuyện <strong>"{roomToDelete?.name || ''}"</strong> không?
          </p>
          <p style={{ margin: 0, color: '#ff4d4f', fontSize: isMobile ? 12 : 13 }}>
            ⚠️ Hành động này không thể hoàn tác. Tất cả tin nhắn, file đính kèm và dữ liệu liên quan sẽ bị xóa vĩnh viễn.
          </p>
        </div>
      </Modal>
    </div>
  )
}
