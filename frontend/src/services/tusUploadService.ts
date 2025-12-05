import * as tus from 'tus-js-client'
import api from './api'
import { FileResponse } from './fileService'
import { useAuthStore } from '../store/authStore'

export interface TusUploadProgress {
  bytesUploaded: number
  bytesTotal: number
  percentage: number
  speed: number // bytes per second
  timeRemaining: number // seconds
}

export interface TusUploadOptions {
  file: File
  description?: string
  folderId?: string
  onProgress?: (progress: TusUploadProgress) => void
  onSuccess?: (fileResponse: FileResponse) => void
  onError?: (error: Error) => void
}

class TusUploadService {
  private uploads = new Map<string, tus.Upload>()

  /**
   * Upload file using TUS protocol (industry standard for resumable uploads)
   * TUS protocol: https://tus.io/
   */
  async upload(options: TusUploadOptions): Promise<FileResponse> {
    const { file, description, folderId, onProgress, onSuccess, onError } = options

    return new Promise<FileResponse>((resolve, reject) => {
      // Get upload URL from backend
      const getUploadUrl = async (): Promise<string> => {
        try {
          const response = await api.post<{ uploadUrl: string }>('/files/upload/tus/init', {
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            description,
            folderId,
          })
          return response.data.uploadUrl
        } catch (error: any) {
          throw new Error(`Failed to initialize TUS upload: ${error.message}`)
        }
      }

      let uploadUrl: string
      let startTime = Date.now()
      let lastBytes = 0
      let lastTime = startTime

      getUploadUrl()
        .then((url) => {
          uploadUrl = url

          const upload = new tus.Upload(file, {
            endpoint: uploadUrl,
            retryDelays: [0, 3000, 5000, 10000, 20000], // Retry delays in ms
            chunkSize: 5 * 1024 * 1024, // 5MB chunks
            metadata: {
              filename: file.name,
              filetype: file.type,
            },
            headers: {},
            onBeforeRequest: async (req) => {
              // Add authorization header from auth store
              const token = useAuthStore.getState().token
              if (token) {
                req.setHeader('Authorization', `Bearer ${token}`)
              }
            },
            onError: (error) => {
              this.uploads.delete(file.name)
              if (onError) {
                onError(error)
              }
              reject(error)
            },
            onProgress: (bytesUploaded, bytesTotal) => {
              const currentTime = Date.now()
              const timeDiff = (currentTime - lastTime) / 1000 // seconds
              const bytesDiff = bytesUploaded - lastBytes
              const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0
              const remaining = bytesTotal - bytesUploaded
              const timeRemaining = speed > 0 ? remaining / speed : 0
              const percentage = Math.round((bytesUploaded / bytesTotal) * 100)

              if (onProgress) {
                onProgress({
                  bytesUploaded,
                  bytesTotal,
                  percentage,
                  speed,
                  timeRemaining,
                })
              }

              lastBytes = bytesUploaded
              lastTime = currentTime
            },
            onSuccess: async () => {
              try {
                // Get file metadata after upload completes
                const fileId = upload.url?.split('/').pop() || ''
                const response = await api.get<FileResponse>(`/files/upload/tus/complete/${fileId}`)
                
                this.uploads.delete(file.name)
                
                if (onSuccess) {
                  onSuccess(response.data)
                }
                resolve(response.data)
              } catch (error: any) {
                this.uploads.delete(file.name)
                const err = new Error(`Failed to complete upload: ${error.message}`)
                if (onError) {
                  onError(err)
                }
                reject(err)
              }
            },
            onChunkComplete: (chunkSize, bytesAccepted, bytesTotal) => {
              // Optional: Handle chunk completion
            },
          })

          this.uploads.set(file.name, upload)
          upload.start()
        })
        .catch((error) => {
          if (onError) {
            onError(error)
          }
          reject(error)
        })
    })
  }

  /**
   * Resume a paused or failed upload
   */
  resume(fileName: string): void {
    const upload = this.uploads.get(fileName)
    if (upload) {
      upload.start()
    }
  }

  /**
   * Pause an active upload
   */
  pause(fileName: string): void {
    const upload = this.uploads.get(fileName)
    if (upload) {
      upload.abort()
    }
  }

  /**
   * Cancel an upload
   */
  cancel(fileName: string): void {
    const upload = this.uploads.get(fileName)
    if (upload) {
      upload.abort()
      this.uploads.delete(fileName)
    }
  }

  /**
   * Get upload status
   */
  getUpload(fileName: string): tus.Upload | undefined {
    return this.uploads.get(fileName)
  }
}

export const tusUploadService = new TusUploadService()

