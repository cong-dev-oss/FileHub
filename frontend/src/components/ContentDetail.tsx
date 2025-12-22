import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { 
  Typography, 
  Tag, 
  Space, 
  Button, 
  Divider, 
  Descriptions, 
  Spin,
  Alert,
  Card,
  Tooltip,
  message
} from 'antd'
import {
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined,
  SoundOutlined,
  PauseCircleOutlined,
  StopOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { format } from 'date-fns'
import { contentService, ContentDto } from '../services/contentService'
import { fileService } from '../services/fileService'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

interface ContentDetailProps {
  contentId: string
  onClose: () => void
  onEdit?: (content: ContentDto) => void
  onDelete?: (contentId: string) => void
}

export default function ContentDetail({ contentId, onClose, onEdit, onDelete }: ContentDetailProps) {
  const [isReading, setIsReading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  
  const { data: content, isLoading, error } = useQuery({
    queryKey: ['content', contentId],
    queryFn: () => contentService.getById(contentId),
  })

  // Extract text from HTML content
  const extractTextFromHTML = (html: string): string => {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    return tempDiv.textContent || tempDiv.innerText || ''
  }

  // Get text content for reading (only body)
  const getFullText = (): string => {
    if (!content || !content.body) return ''
    return extractTextFromHTML(content.body)
  }

  // Start reading
  const startReading = () => {
    if (!content) return

    // Stop any existing speech
    if (speechSynthesisRef.current) {
      window.speechSynthesis.cancel()
    }

    const text = getFullText()
    if (!text.trim()) {
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'vi-VN' // Vietnamese
    utterance.rate = 1.0 // Normal speed
    utterance.pitch = 1.0 // Normal pitch
    utterance.volume = 1.0 // Full volume

    utterance.onstart = () => {
      setIsReading(true)
      setIsPaused(false)
    }

    utterance.onend = () => {
      setIsReading(false)
      setIsPaused(false)
      speechSynthesisRef.current = null
    }

    utterance.onerror = () => {
      setIsReading(false)
      setIsPaused(false)
      speechSynthesisRef.current = null
    }

    speechSynthesisRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  // Pause/Resume reading
  const togglePause = () => {
    if (isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    } else {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }

  // Stop reading
  const stopReading = () => {
    window.speechSynthesis.cancel()
    setIsReading(false)
    setIsPaused(false)
    speechSynthesisRef.current = null
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Stop reading when content changes
  useEffect(() => {
    if (speechSynthesisRef.current) {
      window.speechSynthesis.cancel()
      setIsReading(false)
      setIsPaused(false)
      speechSynthesisRef.current = null
    }
  }, [contentId])

  // Copy to clipboard function
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    message.success(`Đã sao chép ${label}`)
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Đang tải nội dung...</Text>
        </div>
      </div>
    )
  }

  if (error || !content) {
    return (
      <Alert
        message="Không tìm thấy nội dung"
        description="Nội dung này không tồn tại hoặc đã bị xóa."
        type="error"
        showIcon
        action={
          <Button size="small" onClick={onClose}>
            Đóng
          </Button>
        }
      />
    )
  }

  return (
    <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '4px' }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={4} style={{ marginBottom: 4, wordBreak: 'break-word' }}>
            {content.title}
          </Title>
          {content.description && (
            <Paragraph type="secondary" style={{ marginBottom: 0, wordBreak: 'break-word' }}>
              {content.description}
            </Paragraph>
          )}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Meta Information */}
        <Descriptions 
          bordered 
          column={{ xs: 1, sm: 2, md: 2 }}
          size="small"
          labelStyle={{ fontWeight: 500, width: '120px' }}
        >
          <Descriptions.Item label="Loại">
            <Tag color="blue">{content.contentType}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={content.status === 'Published' ? 'green' : content.status === 'Draft' ? 'orange' : 'default'}>
              {content.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            <Space>
              <CalendarOutlined style={{ color: '#8c8c8c' }} />
              <Text>{dayjs(content.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
            </Space>
          </Descriptions.Item>
          {content.updatedAt && (
            <Descriptions.Item label="Ngày cập nhật">
              <Space>
                <CalendarOutlined style={{ color: '#8c8c8c' }} />
                <Text>{dayjs(content.updatedAt).format('DD/MM/YYYY HH:mm')}</Text>
              </Space>
            </Descriptions.Item>
          )}
          {content.publishedAt && (
            <Descriptions.Item label="Ngày xuất bản" span={2}>
              <Space>
                <CalendarOutlined style={{ color: '#52c41a' }} />
                <Text type="success">
                  {dayjs(content.publishedAt).format('DD/MM/YYYY HH:mm')}
                </Text>
              </Space>
            </Descriptions.Item>
          )}
          {content.createdBy && (
            <Descriptions.Item label="Người tạo" span={2}>
              <Space>
                <UserOutlined style={{ color: '#8c8c8c' }} />
                <Tooltip title={content.createdBy}>
                  <Text 
                    ellipsis 
                    style={{ maxWidth: '300px', display: 'inline-block' }}
                  >
                    {content.createdBy}
                  </Text>
                </Tooltip>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(content.createdBy!, 'ID người tạo')}
                  style={{ padding: '0 4px' }}
                />
              </Space>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Slug" span={2}>
            <Space style={{ width: '100%' }}>
              <Tooltip title={content.slug}>
                <Text 
                  code 
                  ellipsis 
                  style={{ maxWidth: '400px', display: 'inline-block' }}
                >
                  {content.slug}
                </Text>
              </Tooltip>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(content.slug, 'slug')}
                style={{ padding: '0 4px', flexShrink: 0 }}
              />
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="ID" span={2}>
            <Space style={{ width: '100%' }}>
              <Tooltip title={content.id}>
                <Text 
                  code 
                  ellipsis 
                  style={{ maxWidth: '400px', display: 'inline-block', fontSize: '12px' }}
                >
                  {content.id}
                </Text>
              </Tooltip>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(content.id, 'ID')}
                style={{ padding: '0 4px', flexShrink: 0 }}
              />
            </Space>
          </Descriptions.Item>
        </Descriptions>

        {/* Body Content */}
        <Card
          title={
            <Space>
              <FileTextOutlined />
              <span>Nội dung</span>
            </Space>
          }
          extra={
            content.body && (
              <Space size="small">
                {isReading ? (
                  <>
                    <Button
                      icon={isPaused ? <SoundOutlined /> : <PauseCircleOutlined />}
                      onClick={togglePause}
                      size="small"
                    >
                      {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
                    </Button>
                    <Button
                      icon={<StopOutlined />}
                      onClick={stopReading}
                      danger
                      size="small"
                    >
                      Dừng
                    </Button>
                  </>
                ) : (
                  <Button
                    icon={<SoundOutlined />}
                    onClick={startReading}
                    type="primary"
                    size="small"
                  >
                    Đọc
                  </Button>
                )}
              </Space>
            )
          }
          style={{ marginBottom: 0 }}
        >
          {content.body ? (
            <div
              dangerouslySetInnerHTML={{ __html: content.body }}
              style={{
                lineHeight: 1.8,
                color: '#333',
                wordBreak: 'break-word',
              }}
            />
          ) : (
            <Text type="secondary" italic>Không có nội dung</Text>
          )}
        </Card>

        {/* Attached Files */}
        {content.fileIds && content.fileIds.length > 0 && (
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span>Tệp đính kèm ({content.fileIds.length})</span>
              </Space>
            }
            style={{ marginBottom: 0 }}
          >
            <Space wrap>
              {content.fileIds.map((fileId) => (
                <Button
                  key={fileId}
                  icon={<FileTextOutlined />}
                  href={fileService.getStreamUrl(fileId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                >
                  File {fileId.substring(0, 8)}
                </Button>
              ))}
            </Space>
          </Card>
        )}
      </Space>
    </div>
  )
}
