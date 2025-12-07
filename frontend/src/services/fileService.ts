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
  folderId?: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
  speed: number // bytes per second
  timeRemaining: number // seconds
}

// Helper class for calculating accurate upload speed and time remaining
class SpeedCalculator {
  private speedHistory: Array<{ time: number; bytes: number }> = []
  private readonly HISTORY_DURATION = 5000 // Keep last 5 seconds of history
  private readonly MIN_INTERVAL = 100 // Minimum 100ms between updates
  private lastUpdateTime = 0
  private lastBytes = 0
  private averageSpeed = 0

  update(currentBytes: number, currentTime: number): { speed: number; timeRemaining: number; remaining: number } {
    // Only update if enough time has passed
    if (currentTime - this.lastUpdateTime < this.MIN_INTERVAL && this.speedHistory.length > 0) {
      // Use last calculated values if update too soon
      const remaining = this.lastBytes > 0 ? this.lastBytes : 0
      return {
        speed: this.averageSpeed,
        timeRemaining: this.averageSpeed > 0 ? remaining / this.averageSpeed : 0,
        remaining,
      }
    }

    // Add current point to history
    this.speedHistory.push({ time: currentTime, bytes: currentBytes })

    // Remove old entries (older than HISTORY_DURATION)
    const cutoffTime = currentTime - this.HISTORY_DURATION
    this.speedHistory = this.speedHistory.filter((entry) => entry.time >= cutoffTime)

    // Calculate average speed from history
    if (this.speedHistory.length >= 2) {
      const oldest = this.speedHistory[0]
      const newest = this.speedHistory[this.speedHistory.length - 1]
      const timeDiff = (newest.time - oldest.time) / 1000 // seconds
      const bytesDiff = newest.bytes - oldest.bytes

      if (timeDiff > 0.1) {
        // Only calculate if we have meaningful time difference
        this.averageSpeed = bytesDiff / timeDiff
      }
    } else if (this.lastBytes > 0 && this.lastUpdateTime > 0) {
      // Fallback: calculate from last update
      const timeDiff = (currentTime - this.lastUpdateTime) / 1000
      const bytesDiff = currentBytes - this.lastBytes
      if (timeDiff > 0.1) {
        // Use exponential smoothing: 70% old speed + 30% new speed
        const instantSpeed = bytesDiff / timeDiff
        this.averageSpeed = this.averageSpeed * 0.7 + instantSpeed * 0.3
      }
    }

    this.lastUpdateTime = currentTime
    this.lastBytes = currentBytes

    return {
      speed: Math.max(0, this.averageSpeed),
      timeRemaining: 0, // Will be calculated by caller based on remaining bytes
      remaining: 0,
    }
  }

  reset() {
    this.speedHistory = []
    this.lastUpdateTime = 0
    this.lastBytes = 0
    this.averageSpeed = 0
  }
}

// Helper function for direct upload with better timeout and progress tracking
async function uploadDirect(
  file: File,
  description?: string,
  folderId?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<FileResponse> {
  const formData = new FormData()
  formData.append('file', file)
  if (description && description.trim()) {
    formData.append('description', description)
  }
  if (folderId && folderId.trim()) {
    formData.append('folderId', folderId)
  }

  const speedCalculator = new SpeedCalculator()

  const response = await api.post<FileResponse>('/files/upload', formData, {
    timeout: 600000, // 10 minutes for large files
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const loaded = progressEvent.loaded
        const total = progressEvent.total
        const percentage = Math.round((loaded / total) * 100)
        const currentTime = Date.now()

        // Update speed calculator with current progress
        const { speed } = speedCalculator.update(loaded, currentTime)
        const remaining = total - loaded
        const timeRemaining = speed > 100 ? remaining / speed : 0 // Only show if speed > 100 bytes/s

        onProgress({
          loaded,
          total,
          percentage,
          speed,
          timeRemaining,
        })
      }
    },
  })
  return response.data
}

export const fileService = {
  upload: async (
    file: File,
    description?: string,
    folderId?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileResponse> => {
    const FILE_SIZE_THRESHOLD = 50 * 1024 * 1024 // 50MB threshold

    // For files < 50MB, use direct upload (faster)
    if (file.size < FILE_SIZE_THRESHOLD) {
      return uploadDirect(file, description, folderId, onProgress)
    }

    // For files >= 50MB, use chunked upload (more reliable)
    const { uploadChunked } = await import('./chunkedFileService')
    return uploadChunked({
      file,
      description,
      folderId,
      onProgress: onProgress
        ? (chunkedProgress) => {
            onProgress({
              loaded: chunkedProgress.loaded,
              total: chunkedProgress.total,
              percentage: chunkedProgress.percentage,
              speed: chunkedProgress.speed,
              timeRemaining: chunkedProgress.timeRemaining,
            })
          }
        : undefined,
    })
  },

  getAll: async (fileType?: string, folderId?: string): Promise<FileResponse[]> => {
    const params: any = {}
    if (fileType) params.fileType = fileType
    if (folderId) params.folderId = folderId
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

  move: async (id: string, folderId?: string): Promise<void> => {
    await api.post(`/files/${id}/move`, { folderId })
  },

  getStreamUrl: (id: string): string => {
    const baseUrl = api.defaults.baseURL || ''
    // Ensure we have a proper URL - handle both relative and absolute baseURLs
    let url: string
    if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
      // Absolute URL - remove trailing slash if present
      const cleanBaseUrl = baseUrl.replace(/\/$/, '')
      url = `${cleanBaseUrl}/files/${id}/stream`
    } else {
      // Relative URL - use window.location.origin in browser
      if (typeof window !== 'undefined') {
        const origin = window.location.origin
        // Ensure baseUrl starts with / and doesn't end with /
        const cleanBaseUrl = baseUrl.replace(/^\/?/, '/').replace(/\/$/, '')
        url = `${origin}${cleanBaseUrl}/files/${id}/stream`
      } else {
        // Fallback for SSR
        const cleanBaseUrl = baseUrl.replace(/\/$/, '')
        url = `${cleanBaseUrl}/files/${id}/stream`
      }
    }
    
    // Log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[getStreamUrl] Generated URL:', url, 'from baseURL:', baseUrl, 'fileId:', id)
    }
    
    return url
  },
}



