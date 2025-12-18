import api from './api'
import { extractData, ApiResponse } from './apiResponse'

export interface FolderDto {
  id: string
  name: string
  parentId?: string
  children: FolderDto[]
}

export interface CreateFolderDto {
  name: string
  parentId?: string
}

export interface UpdateFolderDto {
  name: string
  parentId?: string
}

export const folderService = {
  getTree: async (): Promise<FolderDto[]> => {
    const response = await api.get<ApiResponse<FolderDto[]>>('/folders/tree')
    return extractData(response)
  },

  getAll: async (parentId?: string): Promise<FolderDto[]> => {
    const params = parentId ? { parentId } : {}
    const response = await api.get<ApiResponse<FolderDto[]>>('/folders', { params })
    return extractData(response)
  },

  create: async (dto: CreateFolderDto): Promise<FolderDto> => {
    const response = await api.post<ApiResponse<FolderDto>>('/folders', dto)
    return extractData(response)
  },

  update: async (id: string, dto: UpdateFolderDto): Promise<void> => {
    await api.put(`/folders/${id}`, dto)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/folders/${id}`)
  },
}









