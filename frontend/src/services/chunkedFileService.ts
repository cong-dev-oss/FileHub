import api from './api'
import { extractData, ApiResponse } from './apiResponse'
import { FileResponse } from './fileService'

const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB per chunk - optimal for large files
const MAX_RETRIES = 5
const RETRY_DELAY_BASE = 1000 // 1 second base delay

export interface ChunkedUploadProgress {
  loaded: number
  total: number
  percentage: number
  speed: number // bytes per second
  timeRemaining: number // seconds
  currentChunk: number
  totalChunks: number
}

export interface ChunkedUploadOptions {
  file: File
  description?: string
  folderId?: string
  onProgress?: (progress: ChunkedUploadProgress) => void
}

/**
 * Upload file using chunked upload for files up to 5GB
 * Chunks are uploaded sequentially with retry mechanism for reliability
 */
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

export async function uploadChunked(options: ChunkedUploadOptions): Promise<FileResponse> {
  const { file, description, folderId, onProgress } = options
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  let uploadedBytes = 0
  const speedCalculator = new SpeedCalculator()

  try {
    // Initialize upload session
    const initResponse = await api.post<ApiResponse<{ uploadId: string }>>('/files/upload/chunked/init', {
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      totalChunks,
      description,
      folderId,
    })

    const sessionUploadId = extractData(initResponse).uploadId

    // Upload chunks sequentially
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)

      let retryCount = 0
      let chunkUploaded = false

      // Retry logic for each chunk
      while (retryCount < MAX_RETRIES && !chunkUploaded) {
        try {
          const formData = new FormData()
          formData.append('chunk', chunk, file.name)
          formData.append('uploadId', sessionUploadId)
          formData.append('chunkIndex', chunkIndex.toString())
          formData.append('totalChunks', totalChunks.toString())
          formData.append('fileName', file.name)
          formData.append('contentType', file.type)

          await api.post('/files/upload/chunked', formData, {
            timeout: 300000, // 5 minutes per chunk
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const chunkProgress = progressEvent.loaded
                const overallLoaded = uploadedBytes + chunkProgress
                const overallProgress = (overallLoaded / file.size) * 100

                const currentTime = Date.now()
                const { speed } = speedCalculator.update(overallLoaded, currentTime)
                const remaining = file.size - overallLoaded
                const timeRemaining = speed > 100 ? remaining / speed : 0 // Only show if speed > 100 bytes/s

                if (onProgress) {
                  onProgress({
                    loaded: overallLoaded,
                    total: file.size,
                    percentage: Math.round(overallProgress),
                    speed,
                    timeRemaining,
                    currentChunk: chunkIndex + 1,
                    totalChunks,
                  })
                }
              }
            },
          })

          uploadedBytes += chunk.size
          chunkUploaded = true
        } catch (error: any) {
          retryCount++
          if (retryCount >= MAX_RETRIES) {
            throw new Error(
              `Failed to upload chunk ${chunkIndex + 1}/${totalChunks} after ${MAX_RETRIES} retries: ${error.message}`
            )
          }
          // Exponential backoff
          const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount - 1)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    // Finalize upload
    const finalizeResponse = await api.post<ApiResponse<FileResponse>>('/files/upload/chunked/finalize', {
      uploadId: sessionUploadId,
    })

    return extractData(finalizeResponse)
  } catch (error: any) {
    // Cancel upload on error
    try {
      await api.post('/files/upload/chunked/cancel', { uploadId })
    } catch {
      // Ignore cancel errors
    }
    throw error
  }
}

