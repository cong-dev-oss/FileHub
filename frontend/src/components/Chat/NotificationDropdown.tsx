import { useEffect, useState } from 'react'
import { Dropdown, Badge, List, Avatar, Button, Empty, Spin } from 'antd'
import type { DropdownProps } from 'antd'
import { BellOutlined, MessageOutlined } from '@ant-design/icons'
import { chatService } from '../../services/chatService'
import { chatSignalRService } from '../../services/chatSignalRService'
import type { MessageNotificationDto } from '../../types'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../constants'

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<MessageNotificationDto[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Connect to SignalR
    chatSignalRService
      .connect()
      .then(() => {
        console.log('Notification SignalR connected')
      })
      .catch((error) => {
        console.error('Failed to connect to Notification SignalR:', error)
      })

    // Subscribe to notification count updates
    chatSignalRService.onNotificationCountUpdated((count: number) => {
      // Ensure count is a number, not an object
      setUnreadCount(typeof count === 'number' ? count : 0)
    })

    // Subscribe to new messages
    chatSignalRService.onNewMessage(() => {
      loadNotifications()
      loadUnreadCount()
    })

    // Load initial data
    loadNotifications()
    loadUnreadCount()

    return () => {
      // Don't disconnect here as it might be used by other components
    }
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await chatService.getNotifications(1, 10)
      setNotifications(data)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const count = await chatService.getUnreadNotificationCount()
      // Ensure count is a number, not an object
      setUnreadCount(typeof count === 'number' ? count : 0)
    } catch (error) {
      console.error('Failed to load unread count:', error)
      setUnreadCount(0)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await chatService.markNotificationAsRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await chatService.markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const handleNotificationClick = async (notification: MessageNotificationDto) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id)
    }
    
    // Navigate to chat
    if (notification.message?.chatRoomId) {
      navigate(`${ROUTES.CHAT}?roomId=${notification.message.chatRoomId}`)
    } else {
      navigate(ROUTES.CHAT)
    }
    setOpen(false)
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

  const notificationContent = (
    <div style={{ width: 360, maxHeight: 500, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 16 }}>Thông báo</span>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllAsRead}>
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không có thông báo nào"
            style={{ padding: '40px 20px' }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: notification.isRead ? 'transparent' : '#f0f7ff',
                  borderLeft: notification.isRead ? 'none' : '3px solid #1890ff',
                }}
                onClick={() => handleNotificationClick(notification)}
                onMouseEnter={(e) => {
                  if (!notification.isRead) {
                    e.currentTarget.style.backgroundColor = '#e6f4ff'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!notification.isRead) {
                    e.currentTarget.style.backgroundColor = '#f0f7ff'
                  }
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      style={{
                        backgroundColor: notification.isRead ? '#d9d9d9' : '#1890ff',
                      }}
                      icon={<MessageOutlined />}
                    />
                  }
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: notification.isRead ? 400 : 600, fontSize: 14 }}>
                        {notification.message?.senderName || 'Tin nhắn mới'}
                      </span>
                      {!notification.isRead && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#1890ff',
                            display: 'inline-block',
                          }}
                        />
                      )}
                    </div>
                  }
                  description={
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          color: '#666',
                          marginBottom: 4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {notification.message?.content || 'Bạn có tin nhắn mới'}
                      </div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        {formatTime(notification.createdAt)}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>

      {notifications.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #f0f0f0',
            textAlign: 'center',
          }}
        >
          <Button type="link" onClick={() => navigate(ROUTES.CHAT)}>
            Xem tất cả thông báo
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <Dropdown
      dropdownRender={() => <div>{notificationContent}</div>}
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <div style={{ display: 'inline-block' }}>
        <Badge count={unreadCount} overflowCount={99} offset={[-5, 5]}>
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            style={{ width: 48, height: 48 }}
          />
        </Badge>
      </div>
    </Dropdown>
  )
}
