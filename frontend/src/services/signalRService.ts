import * as signalR from '@microsoft/signalr'
import { useAuthStore } from '../store/authStore'

class SignalRService {
  private connection: signalR.HubConnection | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve()
    }

    const token = useAuthStore.getState().token
    // Use same base URL logic as api.ts
    const getBaseURL = () => {
      if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace('/api', '') // Remove /api suffix for SignalR
      }
      // In development, use proxy or direct backend
      if (import.meta.env.DEV) {
        return 'http://localhost:5000' // Direct backend URL for SignalR
      }
      return window.location.origin
    }
    const baseUrl = getBaseURL()
    const hubUrl = `${baseUrl}/hubs/video-conversion`

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

    // Connection event handlers
    this.connection.onclose((error) => {
      console.log('SignalR connection closed', error)
      this.reconnectAttempts++
    })

    this.connection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error)
    })

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR reconnected', connectionId)
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

  // Join a job group to receive updates
  async joinJobGroup(jobId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinJobGroup', jobId)
    }
  }

  // Leave a job group
  async leaveJobGroup(jobId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('LeaveJobGroup', jobId)
    }
  }

  // Subscribe to job status changes
  onJobStatusChanged(callback: (data: any) => void): void {
    if (this.connection) {
      this.connection.on('JobStatusChanged', callback)
    }
  }

  // Subscribe to job progress updates
  onJobProgress(callback: (data: { jobId: string; progress: number }) => void): void {
    if (this.connection) {
      this.connection.on('JobProgress', callback)
    }
  }

  // Remove all listeners
  off(eventName: string): void {
    if (this.connection) {
      this.connection.off(eventName)
    }
  }

  getConnectionState(): signalR.HubConnectionState | null {
    return this.connection?.state || null
  }
}

export const signalRService = new SignalRService()

