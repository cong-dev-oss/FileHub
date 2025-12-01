import api from './api'

export interface FileResponse {
  id: string
  fileName: string
  originalFileName: string
  contentType: string
  fileSize: number
  fileType: string
  description?: string
  createdAt: string
  downloadUrl: string
}

export const fileService = {
  upload: async (file: File, description?: string): Promise<FileResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    if (description) {
      formData.append('description', description)
    }

    const response = await api.post<FileResponse>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getAll: async (fileType?: string): Promise<FileResponse[]> => {
    const params = fileType ? { fileType } : {}
    const response = await api.get<FileResponse[]>('/files', { params })
    return response.data
  },

  getById: async (id: string): Promise<FileResponse> => {
    const response = await api.get<FileResponse>(`/files/${id}`)
    return response.data
  },

  download: async (id: string): Promise<Blob> => {
    const response = await api.get(`/files/${id}/download`, {
      responseType: 'blob',
    })
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/files/${id}`)
  },
}



