import { useEffect, useState } from 'react'
import { chatService } from '../../services/chatService'
import { chatSignalRService } from '../../services/chatSignalRService'

interface NotificationBadgeProps {
  className?: string
}

export default function NotificationBadge({ className = '' }: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Connect to SignalR
    chatSignalRService
      .connect()
      .then(() => {
        setConnected(true)
      })
      .catch((error) => {
        console.error('Failed to connect to Chat SignalR:', error)
      })

    // Subscribe to notification count updates
    chatSignalRService.onNotificationCountUpdated((count: number) => {
      setUnreadCount(count)
    })

    // Load initial count
    loadUnreadCount()

    return () => {
      chatSignalRService.disconnect()
    }
  }, [])

  const loadUnreadCount = async () => {
    try {
      const count = await chatService.getUnreadNotificationCount()
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to load unread count:', error)
    }
  }

  if (unreadCount === 0) {
    return null
  }

  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full ${className}`}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )
}
