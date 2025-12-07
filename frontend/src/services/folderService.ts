import api from './api'

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
    const response = await api.get<FolderDto[]>('/folders/tree')
    return response.data
  },

  getAll: async (parentId?: string): Promise<FolderDto[]> => {
    const params = parentId ? { parentId } : {}
    const response = await api.get<FolderDto[]>('/folders', { params })
    return response.data
  },

  create: async (dto: CreateFolderDto): Promise<FolderDto> => {
    const response = await api.post<FolderDto>('/folders', dto)
    return response.data
  },

  update: async (id: string, dto: UpdateFolderDto): Promise<void> => {
    await api.put(`/folders/${id}`, dto)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/folders/${id}`)
  },
}


