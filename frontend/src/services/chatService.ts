import api from './api'
import { extractData, ApiResponse } from './apiResponse'
import type {
  ChatRoomDto,
  CreateChatRoomDto,
  MessageDto,
  CreateMessageDto,
  MessageNotificationDto,
  MessageAutoDeleteSettingDto,
  CreateMessageAutoDeleteSettingDto
} from '../types'

class ChatService {
  // Chat Rooms
  async createChatRoom(dto: CreateChatRoomDto): Promise<ChatRoomDto> {
    const response = await api.post<ApiResponse<ChatRoomDto>>('/chat/rooms', dto)
    return extractData(response)
  }

  async getUserChatRooms(): Promise<ChatRoomDto[]> {
    const response = await api.get<ApiResponse<ChatRoomDto[]>>('/chat/rooms')
    return extractData(response)
  }

  async getChatRoomById(roomId: string): Promise<ChatRoomDto> {
    const response = await api.get<ApiResponse<ChatRoomDto>>(`/chat/rooms/${roomId}`)
    return extractData(response)
  }

  async addMemberToRoom(roomId: string, memberId: string): Promise<boolean> {
    const response = await api.post<ApiResponse<boolean>>(`/chat/rooms/${roomId}/members/${memberId}`)
    return extractData(response)
  }

  async removeMemberFromRoom(roomId: string, memberId: string): Promise<boolean> {
    const response = await api.delete<ApiResponse<boolean>>(`/chat/rooms/${roomId}/members/${memberId}`)
    return extractData(response)
  }

  async leaveChatRoom(roomId: string): Promise<boolean> {
    const response = await api.post<ApiResponse<boolean>>(`/chat/rooms/${roomId}/leave`)
    return extractData(response)
  }

  async deleteChatRoom(roomId: string): Promise<boolean> {
    const response = await api.delete<ApiResponse<boolean>>(`/chat/rooms/${roomId}`)
    return extractData(response)
  }

  // GIF Search
  async searchGifs(query: string, limit: number = 20): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/chat/gifs/search`, {
      params: { q: query, limit },
    })
    return extractData(response)
  }

  async getTrendingGifs(limit: number = 20): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/chat/gifs/trending`, {
      params: { limit },
    })
    return extractData(response)
  }

  // Messages
  async sendMessage(dto: CreateMessageDto): Promise<MessageDto> {
    const response = await api.post<ApiResponse<MessageDto>>('/chat/messages', dto)
    return extractData(response)
  }

  async getMessages(params: {
    roomId?: string
    receiverId?: string
    page?: number
    pageSize?: number
  }): Promise<MessageDto[]> {
    const queryParams = new URLSearchParams()
    if (params.roomId) queryParams.append('roomId', params.roomId)
    if (params.receiverId) queryParams.append('receiverId', params.receiverId)
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString())

    const response = await api.get<ApiResponse<MessageDto[]>>(`/chat/messages?${queryParams.toString()}`)
    return extractData(response)
  }

  async markMessageAsRead(messageId: string): Promise<boolean> {
    const response = await api.post<ApiResponse<boolean>>(`/chat/messages/${messageId}/read`)
    return extractData(response)
  }

  async markRoomAsRead(roomId: string): Promise<boolean> {
    const response = await api.post<ApiResponse<boolean>>(`/chat/rooms/${roomId}/read`)
    return extractData(response)
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    const response = await api.delete<ApiResponse<boolean>>(`/chat/messages/${messageId}`)
    return extractData(response)
  }

  // Notifications
  async getNotifications(page: number = 1, pageSize: number = 20): Promise<MessageNotificationDto[]> {
    const response = await api.get<ApiResponse<MessageNotificationDto[]>>(
      `/chat/notifications?page=${page}&pageSize=${pageSize}`
    )
    return extractData(response)
  }

  async getUnreadNotificationCount(): Promise<number> {
    const response = await api.get<ApiResponse<number>>('/chat/notifications/unread-count')
    return extractData(response)
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const response = await api.post<ApiResponse<boolean>>(`/chat/notifications/${notificationId}/read`)
    return extractData(response)
  }

  async markAllNotificationsAsRead(): Promise<boolean> {
    const response = await api.post<ApiResponse<boolean>>('/chat/notifications/read-all')
    return extractData(response)
  }

  // Auto Delete Settings
  async getAutoDeleteSetting(): Promise<MessageAutoDeleteSettingDto> {
    const response = await api.get<ApiResponse<MessageAutoDeleteSettingDto>>('/chat/auto-delete-settings')
    return extractData(response)
  }

  async createOrUpdateAutoDeleteSetting(dto: CreateMessageAutoDeleteSettingDto): Promise<MessageAutoDeleteSettingDto> {
    const response = await api.post<ApiResponse<MessageAutoDeleteSettingDto>>('/chat/auto-delete-settings', dto)
    return extractData(response)
  }

  async deleteAutoDeleteSetting(): Promise<boolean> {
    const response = await api.delete<ApiResponse<boolean>>('/chat/auto-delete-settings')
    return extractData(response)
  }
}

export const chatService = new ChatService()
