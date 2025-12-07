import { useState, useRef, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, Download, Maximize, Minimize, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { FileResponse } from '../services/fileService'
import { fileService } from '../services/fileService'

interface ImagePreviewProps {
  imageUrl: string
  fileName: string
  fileId: string
  files: FileResponse[]
  currentIndex: number
  onClose: () => void
  onNavigate?: (file: FileResponse) => void
}

export default function ImagePreview({ imageUrl, fileName, fileId, files, currentIndex, onClose, onNavigate }: ImagePreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [imageSrc, setImageSrc] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter only image files
  const imageFiles = files.filter(f => f.fileType === 'Image' || f.contentType?.startsWith('image/'))
  const currentImageIndex = imageFiles.findIndex(f => f.id === fileId)
  const hasPrevious = currentImageIndex > 0
  const hasNext = currentImageIndex < imageFiles.length - 1

  useEffect(() => {
    const loadImage = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setZoom(1) // Reset zoom when changing image
        setRotation(0) // Reset rotation when changing image
        
        const token = useAuthStore.getState().token
        const url = token ? `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : imageUrl
        
        setImageSrc(url)
      } catch (error) {
        console.error('Error loading image:', error)
        setError('Không thể tải ảnh')
        setIsLoading(false)
      }
    }

    loadImage()
  }, [imageUrl, fileId])

  const handleImageLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setError('Không thể hiển thị ảnh')
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    setZoom(1) // Reset zoom when toggling fullscreen
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleReset = () => {
    setZoom(1)
    setRotation(0)
  }

  const handleDownload = async () => {
    try {
      const token = useAuthStore.getState().token
      const url = token ? `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : imageUrl
      
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Error downloading image:', error)
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)))
    }
  }

  const handlePrevious = () => {
    if (hasPrevious && onNavigate) {
      const prevFile = imageFiles[currentImageIndex - 1]
      onNavigate(prevFile)
    }
  }

  const handleNext = () => {
    if (hasNext && onNavigate) {
      const nextFile = imageFiles[currentImageIndex + 1]
      onNavigate(nextFile)
    }
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrevious && onNavigate) {
        const prevFile = imageFiles[currentImageIndex - 1]
        if (prevFile) onNavigate(prevFile)
      } else if (e.key === 'ArrowRight' && hasNext && onNavigate) {
        const nextFile = imageFiles[currentImageIndex + 1]
        if (nextFile) onNavigate(nextFile)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [hasPrevious, hasNext, currentImageIndex, imageFiles, onNavigate, onClose])

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
        onClick={!isFullscreen ? onClose : undefined}
        onWheel={handleWheel}
        style={{ margin: 0, padding: 0 }}
      >
        {/* Modal container */}
        <div 
          ref={containerRef}
          className={`relative bg-black rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${
            isFullscreen 
              ? 'w-full h-full rounded-none m-0' 
              : 'w-auto max-w-[90vw] h-auto max-h-[90vh] mx-auto animate-in fade-in zoom-in-95 duration-300'
          }`}
          onClick={(e) => e.stopPropagation()}
          style={isFullscreen ? { margin: 0, padding: 0 } : { margin: '1rem auto' }}
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

          {/* Image container */}
          <div className={`relative flex items-center justify-center ${isFullscreen ? 'w-full h-full' : 'w-auto h-auto'}`} style={isFullscreen ? {} : { minHeight: '200px', minWidth: '200px' }}>
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/50 pointer-events-none">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
                <div className="text-white text-lg">Đang tải ảnh...</div>
              </div>
            )}

            {/* Error overlay */}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/90 pointer-events-auto">
                <div className="text-white text-center max-w-md px-6">
                  <div className="text-red-500 text-4xl mb-4">⚠️</div>
                  <h3 className="text-xl font-bold mb-2">Không thể hiển thị ảnh</h3>
                  <p className="text-gray-300 mb-4">{error}</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        setError(null)
                        setIsLoading(true)
                        const url = useAuthStore.getState().token 
                          ? `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(useAuthStore.getState().token!)}` 
                          : imageUrl
                        setImageSrc(url)
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

            {/* Navigation buttons - Previous */}
            {hasPrevious && (
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 text-white hover:bg-white/20 rounded-full p-2 transition-colors backdrop-blur-sm bg-black/30"
                aria-label="Previous image"
                title="Previous image (←)"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Navigation buttons - Next */}
            {hasNext && (
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 text-white hover:bg-white/20 rounded-full p-2 transition-colors backdrop-blur-sm bg-black/30"
                aria-label="Next image"
                title="Next image (→)"
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Image */}
            {imageSrc && !error && (
              <div className={`relative flex items-center justify-center ${isFullscreen ? 'w-full h-full overflow-auto' : 'w-auto h-auto'}`}>
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt={fileName}
                  className={`transition-transform duration-200 ${
                    isFullscreen 
                      ? 'max-w-full max-h-full object-contain' 
                      : 'max-w-[90vw] max-h-[90vh] object-contain rounded-lg'
                  }`}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                    width: isFullscreen ? 'auto' : 'auto',
                    height: isFullscreen ? 'auto' : 'auto',
                  }}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  draggable={false}
                />
              </div>
            )}

            {/* Controls overlay */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-30 ${!isFullscreen ? 'rounded-b-lg' : ''}`}>
              <div className="flex items-center justify-center gap-4">
                {/* Zoom Out */}
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Zoom out"
                  title="Zoom out (Ctrl + Scroll)"
                >
                  <ZoomOut size={20} />
                </button>

                {/* Reset */}
                <button
                  onClick={handleReset}
                  className="text-white hover:text-gray-300 transition-colors"
                  aria-label="Reset"
                  title="Reset zoom and rotation"
                >
                  <RotateCw size={20} />
                </button>

                {/* Rotate */}
                <button
                  onClick={handleRotate}
                  className="text-white hover:text-gray-300 transition-colors"
                  aria-label="Rotate"
                  title="Rotate 90°"
                >
                  <RotateCw size={20} />
                </button>

                {/* Zoom In */}
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Zoom in"
                  title="Zoom in (Ctrl + Scroll)"
                >
                  <ZoomIn size={20} />
                </button>

                {/* Download */}
                <button
                  onClick={handleDownload}
                  className="text-white hover:text-gray-300 transition-colors ml-4"
                  aria-label="Download"
                  title="Download image"
                >
                  <Download size={20} />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-gray-300 transition-colors ml-4"
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>

                {/* Zoom indicator */}
                <div className="ml-4 text-white text-sm">
                  {Math.round(zoom * 100)}%
                </div>

                {/* Image counter */}
                {imageFiles.length > 1 && (
                  <div className="ml-4 text-white/70 text-sm">
                    {currentImageIndex + 1} / {imageFiles.length}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

