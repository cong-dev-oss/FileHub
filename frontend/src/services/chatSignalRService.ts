import * as signalR from '@microsoft/signalr'
import { useAuthStore } from '../store/authStore'
import type { MessageDto } from '../types'

class ChatSignalRService {
  private connection: signalR.HubConnection | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve()
    }

    const token = useAuthStore.getState().token
    const getBaseURL = () => {
      if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace('/api', '')
      }
      if (import.meta.env.DEV) {
        return 'http://localhost:5000'
      }
      return window.location.origin
    }
    const baseUrl = getBaseURL()
    const hubUrl = `${baseUrl}/hubs/chat`

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token || '',
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount < this.maxReconnectAttempts) {
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000)
          }
          return null
        },
      })
      .build()

    this.connection.onclose((error) => {
      console.log('Chat SignalR connection closed', error)
      this.reconnectAttempts++
    })

    this.connection.onreconnecting((error) => {
      console.log('Chat SignalR reconnecting...', error)
    })

    this.connection.onreconnected((connectionId) => {
      console.log('Chat SignalR reconnected', connectionId)
      this.reconnectAttempts = 0
    })

    return this.connection.start()
  }

  disconnect(): Promise<void> {
    if (this.connection) {
      return this.connection.stop()
    }
    return Promise.resolve()
  }

  // Join a chat room
  async joinRoom(roomId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinRoom', roomId)
    }
  }

  // Leave a chat room
  async leaveRoom(roomId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('LeaveRoom', roomId)
    }
  }

  // Send typing indicator
  async sendTyping(roomId: string, userId: string, userName: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('SendTyping', roomId, userId, userName)
    }
  }

  // Stop typing indicator
  async stopTyping(roomId: string, userId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('StopTyping', roomId, userId)
    }
  }

  // Subscribe to new messages
  onNewMessage(callback: (message: MessageDto) => void): void {
    if (this.connection) {
      this.connection.on('NewMessage', callback)
    }
  }

  // Subscribe to notification count updates
  onNotificationCountUpdated(callback: (count: number) => void): void {
    if (this.connection) {
      this.connection.on('NotificationCountUpdated', callback)
    }
  }

  // Subscribe to user typing
  onUserTyping(callback: (data: { roomId: string; userId: string; userName: string }) => void): void {
    if (this.connection) {
      this.connection.on('UserTyping', callback)
    }
  }

  // Subscribe to user stopped typing
  onUserStoppedTyping(callback: (data: { roomId: string; userId: string }) => void): void {
    if (this.connection) {
      this.connection.on('UserStoppedTyping', callback)
    }
  }

  // Subscribe to message deleted
  onMessageDeleted(callback: (data: { messageId: string; roomId?: string; receiverId?: string }) => void): void {
    if (this.connection) {
      this.connection.on('MessageDeleted', callback)
    }
  }

  // Remove listeners
  off(eventName: string): void {
    if (this.connection) {
      this.connection.off(eventName)
    }
  }

  getConnectionState(): signalR.HubConnectionState | null {
    return this.connection?.state || null
  }
}

export const chatSignalRService = new ChatSignalRService()
