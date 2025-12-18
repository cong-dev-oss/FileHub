import api from './api'
import { extractData, ApiResponse } from './apiResponse'

export interface ContentDto {
  id: string
  title: string
  slug: string
  description?: string
  body: string
  contentType: string
  status: string
  createdAt: string
  updatedAt?: string
  publishedAt?: string
  createdBy?: string
  fileIds?: string[]
}

export interface CreateContentDto {
  title: string
  description?: string
  body: string
  contentType: string
  status?: string
  fileIds?: string[]
}

export interface UpdateContentDto {
  title: string
  description?: string
  body: string
  status?: string
  fileIds?: string[]
}

export const contentService = {
  getAll: async (contentType?: string, status?: string): Promise<ContentDto[]> => {
    const params: Record<string, string> = {}
    if (contentType) params.contentType = contentType
    if (status) params.status = status

    const response = await api.get<ApiResponse<ContentDto[]>>('/content', { params })
    return extractData(response)
  },

  getById: async (id: string): Promise<ContentDto> => {
    const response = await api.get<ApiResponse<ContentDto>>(`/content/${id}`)
    return extractData(response)
  },

  create: async (data: CreateContentDto): Promise<ContentDto> => {
    const response = await api.post<ApiResponse<ContentDto>>('/content', data)
    return extractData(response)
  },

  update: async (id: string, data: UpdateContentDto): Promise<ContentDto> => {
    const response = await api.put<ApiResponse<ContentDto>>(`/content/${id}`, data)
    return extractData(response)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/content/${id}`)
  },
}

















