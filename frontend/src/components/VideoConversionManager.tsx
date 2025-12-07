import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Play, Pause, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { videoConversionService, ConversionJob } from '../services/videoConversionService'
import { signalRService } from '../services/signalRService'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

interface VideoConversionManagerProps {
  fileId?: string // Optional: show jobs for specific file
  onJobComplete?: (job: ConversionJob) => void
}

export default function VideoConversionManager({ fileId, onJobComplete }: VideoConversionManagerProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)

  // Fetch user's conversion jobs
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['video-conversions', user?.id, fileId],
    queryFn: async () => {
      if (!user?.id) return []
      const allJobs = await videoConversionService.getUserJobs(user.id)
      return fileId ? allJobs.filter(j => j.fileId === fileId) : allJobs
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Refetch every 5 seconds as fallback
  })

  // Connect to SignalR
  useEffect(() => {
    const connect = async () => {
      try {
        await signalRService.connect()
        setConnected(true)

        // Subscribe to job updates
        signalRService.onJobStatusChanged((data) => {
          queryClient.setQueryData(['video-conversions', user?.id, fileId], (old: ConversionJob[] = []) => {
            const updated = old.map(job =>
              job.jobId === data.jobId
                ? { ...job, status: data.status, progress: data.progress, errorMessage: data.error, convertedFilePath: data.convertedFilePath }
                : job
            )
            return updated
          })

          // Trigger refetch to get latest data
          queryClient.invalidateQueries({ queryKey: ['video-conversions'] })

          // Call onJobComplete if job is completed
          if (data.status === 'Completed' && onJobComplete) {
            const job = jobs.find(j => j.jobId === data.jobId)
            if (job) {
              onJobComplete({ ...job, status: data.status, progress: 100 })
            }
          }

          // Show toast notifications
          if (data.status === 'Completed') {
            toast.success('Video conversion completed!')
          } else if (data.status === 'Failed') {
            toast.error(`Conversion failed: ${data.error || 'Unknown error'}`)
          }
        })

        signalRService.onJobProgress((data) => {
          queryClient.setQueryData(['video-conversions', user?.id, fileId], (old: ConversionJob[] = []) => {
            return old.map(job =>
              job.jobId === data.jobId ? { ...job, progress: data.progress } : job
            )
          })
        })

        // Join groups for active jobs
        jobs.forEach(job => {
          if (job.status === 'Processing' || job.status === 'Queued' || job.status === 'Pending') {
            signalRService.joinJobGroup(job.jobId)
          }
        })
      } catch (error) {
        console.error('Failed to connect to SignalR:', error)
        setConnected(false)
      }
    }

    if (user?.id) {
      connect()
    }

    return () => {
      signalRService.disconnect()
    }
  }, [user?.id, fileId, queryClient, jobs, onJobComplete])

  // Cancel job mutation
  const cancelMutation = useMutation({
    mutationFn: (jobId: string) => videoConversionService.cancelJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-conversions'] })
      toast.success('Conversion cancelled')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel conversion')
    },
  })

  const getStatusIcon = (status: ConversionJob['status']) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'Failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'Processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case 'Queued':
      case 'Pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'Cancelled':
        return <X className="h-5 w-5 text-gray-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: ConversionJob['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800'
      case 'Failed':
        return 'bg-red-100 text-red-800'
      case 'Processing':
        return 'bg-blue-100 text-blue-800'
      case 'Queued':
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString()
  }

  // Only show active jobs (Pending, Queued, Processing) or recent completed/failed jobs
  const activeJobs = jobs.filter(j => 
    j.status === 'Pending' || 
    j.status === 'Queued' || 
    j.status === 'Processing' ||
    (j.status === 'Completed' && new Date(j.completedAt || 0).getTime() > Date.now() - 5 * 60 * 1000) // Show completed jobs from last 5 minutes
  )

  // Don't show loading spinner - just return null if loading
  if (isLoading) {
    return null
  }

  // Only show if there are active or recent jobs
  if (activeJobs.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Video Conversion
          </h3>
          {!connected && (
            <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">Reconnecting...</span>
          )}
        </div>
        <span className="text-xs text-gray-500">{activeJobs.length} active</span>
      </div>

      <div className="space-y-2">
        {activeJobs.map((job) => (
          <div
            key={job.jobId}
            className="border border-gray-200 rounded-md p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getStatusIcon(job.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    {job.status === 'Processing' && (
                      <span className="text-xs text-gray-600 font-medium">{job.progress}%</span>
                    )}
                  </div>

                  {/* Progress bar for processing jobs */}
                  {job.status === 'Processing' && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  )}

                  {job.errorMessage && (
                    <div className="text-xs text-red-600 truncate">{job.errorMessage}</div>
                  )}
                </div>
              </div>

              {/* Cancel button for active jobs */}
              {(job.status === 'Pending' || job.status === 'Queued' || job.status === 'Processing') && (
                <button
                  onClick={() => cancelMutation.mutate(job.jobId)}
                  disabled={cancelMutation.isPending}
                  className="flex-shrink-0 text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded disabled:opacity-50 transition-colors"
                  title="Cancel conversion"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

