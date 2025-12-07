import { useState, useRef, useEffect } from 'react'
import { X, Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import { FileResponse } from '../services/fileService'

interface VideoPlayerProps {
  videoUrl: string
  fileName: string
  fileId: string
  files: FileResponse[]
  currentIndex: number
  onClose: () => void
  onNavigate?: (file: FileResponse) => void
}

export default function VideoPlayer({ videoUrl, fileName, fileId, files, currentIndex, onClose, onNavigate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isBuffering, setIsBuffering] = useState(false) // Buffering khi đang phát nhưng thiếu data
  const [videoSrc, setVideoSrc] = useState<string>('')
  const [bufferedProgress, setBufferedProgress] = useState(0)
  const [downloadSpeed, setDownloadSpeed] = useState(0)
  const [networkState, setNetworkState] = useState<string>('')
  const [canPlay, setCanPlay] = useState(false) // Video đã sẵn sàng phát chưa
  const [videoError, setVideoError] = useState<{ code: number; message: string; codeName: string } | null>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const lastBufferedTimeRef = useRef(0)
  const lastTimeRef = useRef(Date.now())
  const videoFileSizeRef = useRef<number>(0)

  // Filter only video files
  const videoFiles = files.filter(f => f.fileType === 'Video' || f.contentType?.startsWith('video/'))
  const currentVideoIndex = videoFiles.findIndex(f => f.id === fileId)
  const hasPrevious = currentVideoIndex > 0
  const hasNext = currentVideoIndex < videoFiles.length - 1

  const handlePrevious = () => {
    if (hasPrevious && onNavigate) {
      const prevFile = videoFiles[currentVideoIndex - 1]
      onNavigate(prevFile)
    }
  }

  const handleNext = () => {
    if (hasNext && onNavigate) {
      const nextFile = videoFiles[currentVideoIndex + 1]
      onNavigate(nextFile)
    }
  }

  // YouTube-style: Use blob URL with fetch for better control and authentication
  useEffect(() => {
    const loadVideo = async () => {
      try {
        // Reset states when loading new video
        setIsLoading(true)
        setIsBuffering(false)
        setCanPlay(false)
        setBufferedProgress(0)
        setDownloadSpeed(0)
        setNetworkState('')
        setVideoError(null) // Clear previous errors
        setIsPlaying(false) // Stop playing when changing video
        
        const token = useAuthStore.getState().token
        const url = token ? `${videoUrl}${videoUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : videoUrl
        
        // For video element, use URL directly with token
        // Browser will handle Range Requests automatically
        setVideoSrc(url)
      } catch (error) {
        console.error('Error setting video source:', error)
        setIsLoading(false)
        setCanPlay(false)
      }
    }

    loadVideo()
  }, [videoUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Tối ưu video element cho streaming nhanh hơn
    // Browser sẽ tự động buffer nhiều data hơn với preload="auto"
    // Log buffered ranges để debug
    if (video.buffered.length > 0) {
      console.log('Video buffered ranges:', video.buffered.length, 'duration:', video.duration)
    }

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => {
      const duration = video.duration
      if (duration && isFinite(duration) && duration > 0) {
        setDuration(duration)
        // Video đã có metadata, có thể sẵn sàng phát
        if (video.readyState >= 3) { // HAVE_FUTURE_DATA hoặc cao hơn
          setIsLoading(false)
          setCanPlay(true)
        }
      }
      // Try to get file size from video element if available
      if ((video as any).fileSize) {
        videoFileSizeRef.current = (video as any).fileSize
      }
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)
    // Removed handleFullscreenChange - we use state-based fullscreen for modal

    // Track buffering progress - improved to handle cases where duration is not yet available
    const updateBuffered = () => {
      if (video.buffered.length > 0) {
        if (video.duration > 0 && isFinite(video.duration)) {
          // Normal case: duration is known
          const bufferedEnd = video.buffered.end(video.buffered.length - 1)
          const bufferedPercent = (bufferedEnd / video.duration) * 100
          setBufferedProgress(Math.min(100, Math.max(0, bufferedPercent)))
        } else {
          // Duration not yet available - estimate progress based on buffered data
          // Calculate total buffered time
          let totalBufferedTime = 0
          let maxBufferedEnd = 0
          for (let i = 0; i < video.buffered.length; i++) {
            const end = video.buffered.end(i)
            totalBufferedTime += end - video.buffered.start(i)
            maxBufferedEnd = Math.max(maxBufferedEnd, end)
          }
          // Show progress indicator: if we have buffered data, show at least some progress
          // This helps user see that video is loading even if duration is not known yet
          if (totalBufferedTime > 0) {
            // Show increasing progress as more data is buffered
            const estimatedProgress = Math.min(50, Math.max(5, totalBufferedTime * 2)) // Scale based on buffered time
            setBufferedProgress(estimatedProgress)
          }
        }
      } else {
        // No buffered data yet - but check if video is loading
        if (video.networkState === 2) { // LOADING
          setBufferedProgress(1) // Show minimal progress to indicate loading
        } else {
          setBufferedProgress(0)
        }
      }
    }

    // Track download speed based on buffered time ranges
    const trackDownloadSpeed = () => {
      const now = Date.now()
      const timeDiff = (now - lastTimeRef.current) / 1000 // seconds
      
      if (video.buffered.length > 0 && video.duration > 0 && timeDiff > 0.5) {
        // Calculate total buffered time
        let totalBufferedTime = 0
        for (let i = 0; i < video.buffered.length; i++) {
          totalBufferedTime += video.buffered.end(i) - video.buffered.start(i)
        }
        
        // Calculate speed based on buffered time increase
        const bufferedTimeDiff = totalBufferedTime - lastBufferedTimeRef.current
        
        if (bufferedTimeDiff > 0 && timeDiff > 0 && video.duration > 0) {
          // Estimate speed: assume average video bitrate
          // Typical: 2-5 Mbps for HD, 5-10 Mbps for Full HD
          // Use conservative estimate: 2 Mbps = 250 KB/s average
          // Speed = (buffered time increase / time) * estimated bitrate
          const estimatedAverageBitrate = 2 * 1024 * 1024 / 8 // 2 Mbps in bytes/sec
          const speed = (bufferedTimeDiff / timeDiff) * estimatedAverageBitrate
          
          if (speed > 0 && isFinite(speed)) {
            setDownloadSpeed(speed)
          }
        }
        
        lastBufferedTimeRef.current = totalBufferedTime
        lastTimeRef.current = now
      }
    }

    // Network state tracking - Logic chuẩn như YouTube
    const updateNetworkState = () => {
      const states = ['EMPTY', 'IDLE', 'LOADING', 'NO_SOURCE', 'LOADED', 'FORMAT_ERROR', 'NETWORK_ERROR']
      const state = video.networkState
      setNetworkState(states[state] || `UNKNOWN(${state})`)
      
      // Logic chuẩn: chỉ loading khi video chưa thể phát được
      if (canPlay) {
        // Video đã sẵn sàng, không còn loading overlay
        setIsLoading(false)
      } else {
        // Video chưa sẵn sàng
        if (state === 2) { // LOADING
          setIsLoading(true)
        } else if (state === 3) { // NO_SOURCE
          console.error('Video NO_SOURCE - URL may be invalid or authentication failed:', videoSrc)
          setIsLoading(false)
        } else if (state === 1 && video.readyState < 3) { // IDLE nhưng chưa có đủ data
          setIsLoading(true)
        } else if (state === 0) { // EMPTY
          setIsLoading(true)
        }
      }
    }

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('loadedmetadata', updateDuration)
    video.addEventListener('progress', () => {
      updateBuffered()
      trackDownloadSpeed()
      // Force update duration nếu chưa có
      if (video.duration && isFinite(video.duration) && video.duration > 0 && duration === 0) {
        setDuration(video.duration)
      }
    })
    video.addEventListener('canplay', () => {
      // Video có thể phát được - ẩn loading overlay
      setIsLoading(false)
      setIsBuffering(false)
      setCanPlay(true)
    })
    video.addEventListener('canplaythrough', () => {
      // Video có đủ data để phát không bị gián đoạn
      setIsLoading(false)
      setIsBuffering(false)
      setCanPlay(true)
    })
    video.addEventListener('waiting', () => {
      // Đang chờ data khi đang phát - chỉ hiển thị buffering spinner nhỏ
      if (canPlay && isPlaying) {
        setIsBuffering(true) // Buffering khi đang phát
      } else {
        setIsLoading(true) // Loading khi chưa bắt đầu phát
      }
    })
    video.addEventListener('playing', () => {
      setIsLoading(false)
      setIsBuffering(false)
    })
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('loadstart', updateNetworkState)
    video.addEventListener('progress', updateNetworkState)
    video.addEventListener('suspend', updateNetworkState)
    video.addEventListener('abort', updateNetworkState)
    video.addEventListener('error', updateNetworkState)
    video.addEventListener('emptied', updateNetworkState)
    video.addEventListener('stalled', updateNetworkState)
    video.addEventListener('loadedmetadata', updateNetworkState)
      // Removed fullscreenchange listener - using state-based fullscreen

    // Update buffered progress periodically - đảm bảo luôn cập nhật
    const bufferedInterval = setInterval(() => {
      updateBuffered()
      trackDownloadSpeed()
      // Force update duration và currentTime nếu có
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        if (duration === 0) setDuration(video.duration)
        if (video.currentTime !== currentTime) setCurrentTime(video.currentTime)
      }
    }, 200) // Update nhanh hơn để responsive hơn

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('loadedmetadata', updateDuration)
      video.removeEventListener('progress', updateBuffered)
      video.removeEventListener('canplay', () => setIsLoading(false))
      video.removeEventListener('canplaythrough', () => setIsLoading(false))
      video.removeEventListener('waiting', () => setIsLoading(true))
      video.removeEventListener('playing', () => setIsLoading(false))
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('loadstart', updateNetworkState)
      video.removeEventListener('progress', updateNetworkState)
      video.removeEventListener('suspend', updateNetworkState)
      video.removeEventListener('abort', updateNetworkState)
      video.removeEventListener('error', updateNetworkState)
      video.removeEventListener('emptied', updateNetworkState)
      video.removeEventListener('stalled', updateNetworkState)
      video.removeEventListener('loadedmetadata', updateNetworkState)
      // Removed fullscreenchange listener
      clearInterval(bufferedInterval)
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video) return

    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    video.currentTime = pos * duration
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    video.volume = newVolume
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (isMuted) {
      video.volume = volume || 0.5
      setIsMuted(false)
    } else {
      video.volume = 0
      setIsMuted(true)
    }
  }

  const toggleFullscreen = () => {
    // Toggle modal fullscreen state (not browser fullscreen)
    setIsFullscreen(!isFullscreen)
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds))
  }

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s'
    if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(2) + ' KB/s'
    return (bytesPerSecond / (1024 * 1024)).toFixed(2) + ' MB/s'
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
        onClick={!isFullscreen ? onClose : undefined}
        onMouseMove={handleMouseMove} 
        onMouseLeave={handleMouseLeave}
        style={{ margin: 0, padding: 0 }}
      >
        {/* Modal container - chỉ fullscreen khi isFullscreen = true */}
        <div 
          className={`relative bg-black rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${
            isFullscreen 
              ? 'w-full h-full rounded-none m-0' 
              : 'w-full max-w-6xl h-auto max-h-[90vh] aspect-video animate-in fade-in zoom-in-95 duration-300 mx-auto'
          }`}
          onClick={(e) => e.stopPropagation()}
          style={isFullscreen ? { margin: 0, padding: 0 } : { minHeight: '400px', margin: '1rem auto' }}
        >
          {/* Header bar - chỉ hiển thị khi không fullscreen */}
          {!isFullscreen && (
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent px-4 py-3 flex items-center justify-between">
              <h3 className="text-white font-medium text-sm truncate flex-1 mr-4">
                {fileName}
              </h3>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Close button - chỉ hiển thị khi fullscreen */}
          {isFullscreen && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-30 text-white hover:bg-white/20 rounded-full p-2 transition-colors backdrop-blur-sm bg-black/30"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          )}

          {/* Navigation buttons - Previous */}
          {hasPrevious && (
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 text-white hover:bg-white/20 rounded-full p-2 transition-colors backdrop-blur-sm bg-black/30"
              aria-label="Previous video"
              title="Previous video (←)"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Navigation buttons - Next */}
          {hasNext && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 text-white hover:bg-white/20 rounded-full p-2 transition-colors backdrop-blur-sm bg-black/30"
              aria-label="Next video"
              title="Next video (→)"
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Video container */}
          <div className={`relative flex items-center justify-center ${isFullscreen ? 'w-full h-full' : 'w-full h-full'}`}>
            {/* Error overlay - hiển thị khi có lỗi */}
            {videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/90 pointer-events-auto">
            <div className="text-white text-center max-w-md px-6">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold mb-2">Không thể phát video</h3>
              <p className="text-gray-300 mb-4">
                {videoError.codeName === 'MEDIA_ERR_DECODE' && (
                  <>Video không được hỗ trợ hoặc bị lỗi codec. Vui lòng chuyển đổi video sang định dạng MP4 (H.264).</>
                )}
                {videoError.codeName === 'MEDIA_ERR_NETWORK' && (
                  <>Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.</>
                )}
                {videoError.codeName === 'MEDIA_ERR_SRC_NOT_SUPPORTED' && (
                  <>Định dạng video không được hỗ trợ bởi trình duyệt. Vui lòng chuyển đổi video sang định dạng MP4 (H.264).</>
                )}
                {videoError.codeName === 'MEDIA_ERR_ABORTED' && (
                  <>Video bị hủy tải. Vui lòng thử lại.</>
                )}
                {!['MEDIA_ERR_DECODE', 'MEDIA_ERR_NETWORK', 'MEDIA_ERR_SRC_NOT_SUPPORTED', 'MEDIA_ERR_ABORTED'].includes(videoError.codeName) && (
                  <>Lỗi: {videoError.message}</>
                )}
              </p>
              <div className="text-gray-400 text-sm mb-4">
                <div>Mã lỗi: {videoError.codeName}</div>
                <div className="text-xs mt-1">File: {fileName}</div>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setVideoError(null)
                    setIsLoading(true)
                    setCanPlay(false)
                    // Reload video
                    const video = videoRef.current
                    if (video) {
                      video.load()
                    }
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  Thử lại
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Đóng
                </button>
              </div>
            </div>
            </div>
            )}

            {/* Loading overlay - chỉ hiển thị khi video chưa thể phát được (chưa có metadata) */}
            {isLoading && !canPlay && !videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/50 pointer-events-none">
            <div className="text-white text-lg mb-4">
              Đang tải video...
            </div>
            {bufferedProgress > 0 && bufferedProgress < 100 && (
              <div className="w-64">
                <div className="w-full bg-white/30 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${bufferedProgress}%` }}
                  />
                </div>
                <div className="text-white text-sm text-center">
                  Đã tải: {bufferedProgress.toFixed(1)}%
                </div>
              </div>
            )}
            {downloadSpeed > 0 && (
              <div className="text-white text-sm mt-2">
                Tốc độ: {formatSpeed(downloadSpeed)}
              </div>
            )}
            </div>
            )}
            
            {/* Buffering spinner nhỏ khi đang phát nhưng thiếu data - không block interaction */}
            {isBuffering && canPlay && isPlaying && (
            <div className="absolute top-4 left-4 z-20 bg-black/70 rounded-full p-3 pointer-events-none">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
            )}

            {videoSrc && !videoError ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className={`w-full h-full object-contain z-0 ${isFullscreen ? '' : 'rounded-lg'}`}
            playsInline
            preload="auto"
            // Tối ưu buffering: browser sẽ tự động buffer nhiều hơn
            // Thêm attributes để tăng tốc độ streaming
            crossOrigin="anonymous"
            // Đảm bảo video có thể seek và buffer hiệu quả
            onSeeking={() => {
              // Khi seek, đảm bảo buffer được tải
              const video = videoRef.current
              if (video) {
                console.log('Seeking to:', video.currentTime, 'buffered:', video.buffered.length)
              }
            }}
            onClick={togglePlay}
            onLoadStart={() => {
              console.log('Video load started:', videoSrc)
              setIsLoading(true)
            }}
            onLoadedData={() => {
              console.log('Video loaded data, duration:', videoRef.current?.duration)
              setIsLoading(false)
            }}
            onLoadedMetadata={() => {
              const duration = videoRef.current?.duration
              const readyState = videoRef.current?.readyState
              console.log('Video metadata loaded, duration:', duration, 'readyState:', readyState)
              if (duration && isFinite(duration) && duration > 0 && readyState && readyState >= 3) {
                setIsLoading(false)
                setCanPlay(true)
              }
            }}
            onCanPlay={() => {
              console.log('Video can play - hiding loading overlay')
              setIsLoading(false)
              setIsBuffering(false)
              setCanPlay(true)
            }}
            onCanPlayThrough={() => {
              console.log('Video can play through - ready for smooth playback')
              setIsLoading(false)
              setIsBuffering(false)
              setCanPlay(true)
            }}
            onWaiting={() => {
              console.log('Video waiting for data')
              if (canPlay && isPlaying) {
                setIsBuffering(true) // Buffering khi đang phát
              } else {
                setIsLoading(true) // Loading khi chưa bắt đầu
              }
            }}
            onPlaying={() => {
              console.log('Video playing')
              setIsLoading(false)
              setIsBuffering(false)
            }}
            onProgress={() => {
              // Update buffered progress on every progress event
              const video = videoRef.current
              if (video) {
                if (video.buffered.length > 0) {
                  if (video.duration > 0 && isFinite(video.duration)) {
                    const bufferedEnd = video.buffered.end(video.buffered.length - 1)
                    const bufferedPercent = (bufferedEnd / video.duration) * 100
                    setBufferedProgress(Math.min(100, Math.max(0, bufferedPercent)))
                  } else {
                    // Duration not available yet - show estimated progress
                    let totalBufferedTime = 0
                    for (let i = 0; i < video.buffered.length; i++) {
                      totalBufferedTime += video.buffered.end(i) - video.buffered.start(i)
                    }
                    if (totalBufferedTime > 0) {
                      const estimatedProgress = Math.min(50, Math.max(5, totalBufferedTime * 2))
                      setBufferedProgress(estimatedProgress)
                    }
                  }
                } else if (video.networkState === 2) {
                  // Loading but no buffered data yet
                  setBufferedProgress(1)
                }
              }
            }}
            onError={(e) => {
              const video = e.currentTarget
              const error = video.error
              const errorMessages = [
                'MEDIA_ERR_ABORTED',
                'MEDIA_ERR_NETWORK',
                'MEDIA_ERR_DECODE',
                'MEDIA_ERR_SRC_NOT_SUPPORTED'
              ]
              
              const errorCode = error?.code || 0
              const errorCodeName = errorMessages[errorCode] || 'Unknown error'
              const errorMessage = error?.message || 'Unknown error occurred'
              
              const errorInfo = {
                code: errorCode,
                message: errorMessage,
                codeName: errorCodeName
              }
              
              console.error('Video playback error:', {
                ...errorInfo,
                src: videoSrc,
                networkState: video.networkState,
                readyState: video.readyState,
                fileName: fileName,
                videoElement: {
                  networkState: video.networkState,
                  readyState: video.readyState,
                  currentSrc: video.currentSrc,
                  src: video.src
                }
              })
              
              setIsLoading(false)
              setCanPlay(false)
              setVideoError(errorInfo)
              setNetworkState(`ERROR: ${errorCodeName}`)
            }}
          />
        ) : !videoError ? (
          <div className="text-white text-lg">Preparing video...</div>
        ) : null}

        {/* Controls overlay - z-index cao hơn loading overlay */}
        {showControls && (
          <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-30 ${!isFullscreen ? 'rounded-b-lg' : ''}`}>
            {/* Progress bar with buffered indicator - luôn hiển thị */}
            <div
              className="w-full h-2 bg-white/30 rounded-full mb-4 cursor-pointer group relative"
              onClick={handleSeek}
            >
              {/* Buffered progress (gray background) - luôn hiển thị, ngay cả khi = 0 */}
              <div
                className="absolute h-full bg-white/20 rounded-full transition-all"
                style={{ width: `${Math.max(0, Math.min(100, bufferedProgress))}%` }}
              />
              {/* Played progress (red) */}
              <div
                className="h-full bg-red-600 rounded-full transition-all group-hover:bg-red-500 relative z-10"
                style={{ width: `${duration > 0 && isFinite(duration) ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0}%` }}
              >
                <div className="h-full w-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity float-right -mr-1.5" />
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>

              {/* Skip backward */}
              <button
                onClick={() => skip(-10)}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="Skip backward 10 seconds"
              >
                <SkipBack size={20} />
              </button>

              {/* Skip forward */}
              <button
                onClick={() => skip(10)}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="Skip forward 10 seconds"
              >
                <SkipForward size={20} />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-gray-300 transition-colors"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-red-600"
                />
              </div>

              {/* Time, Speed and Buffered Progress - luôn hiển thị khi cần */}
              <div className="text-white text-sm ml-auto flex items-center gap-3">
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                
                {/* Video counter */}
                {videoFiles.length > 1 && (
                  <span className="text-white/70 text-xs">
                    {currentVideoIndex + 1} / {videoFiles.length}
                  </span>
                )}
                {/* Luôn hiển thị % tải khi đang loading hoặc chưa buffer đủ */}
                {(isLoading || bufferedProgress < 100 || !canPlay) && (
                  <span className="text-white/70 text-xs flex items-center gap-1">
                    <span>⏳</span>
                    <span>{bufferedProgress.toFixed(0)}%</span>
                  </span>
                )}
                {/* Hiển thị tốc độ khi đang tải */}
                {downloadSpeed > 0 && (isLoading || bufferedProgress < 100) && (
                  <span className="text-white/70 text-xs flex items-center gap-1">
                    <span>📊</span>
                    <span>{formatSpeed(downloadSpeed)}</span>
                  </span>
                )}
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        )}

            {/* Play button overlay (when paused) */}
            {!isPlaying && !showControls && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center text-white hover:text-gray-300 transition-colors z-10"
                aria-label="Play"
              >
                <div className="bg-black/50 rounded-full p-6">
                  <Play size={64} fill="white" />
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

