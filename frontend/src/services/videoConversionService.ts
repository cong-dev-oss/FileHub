import api from './api'
import { extractData, ApiResponse } from './apiResponse'

export interface ConversionJob {
  jobId: string
  fileId: string
  status: 'Pending' | 'Queued' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled'
  progress: number
  errorMessage?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  convertedFilePath?: string
}

export interface ConversionSettings {
  videoCodec?: string
  audioCodec?: string
  videoBitrate?: number
  audioBitrate?: number
  resolution?: string
  frameRate?: number
  preset?: string
}

export const videoConversionService = {
  // Start conversion for a video file
  async startConversion(fileId: string, settings?: ConversionSettings): Promise<ConversionJob> {
    const response = await api.post<ApiResponse<ConversionJob>>(`/video-conversion/${fileId}/convert`, settings || {})
    return extractData(response)
  },

  // Get job status
  async getJobStatus(jobId: string): Promise<ConversionJob> {
    const response = await api.get<ApiResponse<ConversionJob>>(`/video-conversion/${jobId}`)
    return extractData(response)
  },

  // Get all jobs for current user
  async getUserJobs(userId: string): Promise<ConversionJob[]> {
    const response = await api.get<ApiResponse<ConversionJob[]>>(`/video-conversion/user/${userId}`)
    return extractData(response)
  },

  // Cancel a job
  async cancelJob(jobId: string): Promise<void> {
    await api.post(`/video-conversion/${jobId}/cancel`)
  },
}









