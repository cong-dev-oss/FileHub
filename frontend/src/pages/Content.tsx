import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  Table, 
  Button, 
  Input, 
  Select, 
  Space, 
  Typography, 
  Tag, 
  Popconfirm,
  Modal,
  message,
  Card
} from 'antd'
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { contentService, ContentDto } from '../services/contentService'
import { useConfirm } from '../components/ConfirmDialog'
import ContentDetail from '../components/ContentDetail'
import { extractAllErrorMessages } from '../utils/errorHandler'
import { CONTENT_TYPES, CONTENT_STATUS } from '../constants'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Search } = Input

export default function Content() {
  const navigate = useNavigate()
  const [selectedContentType, setSelectedContentType] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewingContentId, setViewingContentId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ['contents', selectedContentType, selectedStatus],
    queryFn: () => contentService.getAll(selectedContentType || undefined, selectedStatus || undefined),
  })

  const deleteMutation = useMutation({
    mutationFn: contentService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] })
      message.success('Xóa nội dung thành công')
    },
    onError: (error: any) => {
      const errorMessages = extractAllErrorMessages(error)
      errorMessages.forEach((msg) => message.error(msg))
    },
  })

  const filteredContents = contents.filter((content) =>
    content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    content.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: ContentDto) => (
        <div>
          <Text strong>{text}</Text>
          {record.description && (
            <div>
              <Text type="secondary" ellipsis style={{ maxWidth: 300 }}>
                {record.description}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'contentType',
      key: 'contentType',
      render: (type: string) => (
        <Tag color="blue">{type}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'Published' ? 'green' : status === 'Draft' ? 'orange' : 'default'
        return <Tag color={color}>{status}</Tag>
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: ContentDto) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => setViewingContentId(record.id)}
          >
            Xem
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/content/${record.id}`)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa nội dung"
            description={`Bạn có chắc chắn muốn xóa "${record.title}"?`}
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 8, minHeight: '100%' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ marginBottom: 8 }}>Content</Title>
            <Text type="secondary">Quản lý nội dung của bạn</Text>
          </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/content/new')}
          size="large"
        >
          Tạo mới
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Search
            placeholder="Tìm kiếm nội dung..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%' }}
          />
          <Space wrap>
            <Select
              placeholder="Tất cả loại"
              style={{ width: 200 }}
              value={selectedContentType || undefined}
              onChange={(value) => setSelectedContentType(value || '')}
              allowClear
            >
              <Select.Option value="Page">Page</Select.Option>
              <Select.Option value="Post">Post</Select.Option>
              <Select.Option value="Media">Media</Select.Option>
              <Select.Option value="Custom">Custom</Select.Option>
            </Select>
            <Select
              placeholder="Tất cả trạng thái"
              style={{ width: 200 }}
              value={selectedStatus || undefined}
              onChange={(value) => setSelectedStatus(value || '')}
              allowClear
            >
              <Select.Option value="Draft">Draft</Select.Option>
              <Select.Option value="Published">Published</Select.Option>
              <Select.Option value="Archived">Archived</Select.Option>
            </Select>
          </Space>
        </Space>
      </Card>

      {/* Content Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredContents}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} nội dung`,
          }}
          locale={{
            emptyText: 'Chưa có nội dung nào',
          }}
        />
      </Card>

      {/* Content Detail Modal */}
      <Modal
        title="Chi tiết nội dung"
        open={!!viewingContentId}
        onCancel={() => setViewingContentId(null)}
        footer={null}
        width={800}
      >
        {viewingContentId && (
          <ContentDetail
            contentId={viewingContentId}
            onClose={() => setViewingContentId(null)}
            onEdit={(content) => {
              setViewingContentId(null)
              navigate(`/content/${content.id}`)
            }}
            onDelete={async (contentId) => {
              const content = contents.find(c => c.id === contentId)
              const ok = await confirm({
                title: 'Xóa nội dung',
                message: `Bạn có chắc chắn muốn xóa nội dung "${content?.title}"?`,
                confirmText: 'Xóa nội dung',
              })
              if (ok) {
                deleteMutation.mutate(contentId)
                setViewingContentId(null)
              }
            }}
          />
        )}
      </Modal>
      </Space>
    </div>
  )
}
