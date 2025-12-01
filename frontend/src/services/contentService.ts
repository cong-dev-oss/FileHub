import api from './api'

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

    const response = await api.get<ContentDto[]>('/content', { params })
    return response.data
  },

  getById: async (id: string): Promise<ContentDto> => {
    const response = await api.get<ContentDto>(`/content/${id}`)
    return response.data
  },

  create: async (data: CreateContentDto): Promise<ContentDto> => {
    const response = await api.post<ContentDto>('/content', data)
    return response.data
  },

  update: async (id: string, data: UpdateContentDto): Promise<ContentDto> => {
    const response = await api.put<ContentDto>(`/content/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/content/${id}`)
  },
}



