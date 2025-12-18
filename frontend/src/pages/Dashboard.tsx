import { useQuery } from '@tanstack/react-query'
import { Row, Col, Card, Statistic, Typography, Space, List, Tag, Alert, Spin } from 'antd'
import { 
  FileTextOutlined, 
  FolderOutlined, 
  RiseOutlined, 
  FileOutlined 
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import { fileService } from '../services/fileService'
import { contentService } from '../services/contentService'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function Dashboard() {
  const { user } = useAuthStore()

  const { data: files = [], isLoading: filesLoading, error: filesError } = useQuery({
    queryKey: ['files'],
    queryFn: () => fileService.getAll(),
    retry: 1,
  })

  const { data: contents = [], isLoading: contentsLoading, error: contentsError } = useQuery({
    queryKey: ['contents'],
    queryFn: () => contentService.getAll(),
    retry: 1,
  })

  const stats = [
    {
      title: 'Tổng số Files',
      value: files.length,
      prefix: <FolderOutlined />,
      valueStyle: { color: '#3f8600' },
    },
    {
      title: 'Tổng số Content',
      value: contents.length,
      prefix: <FileTextOutlined />,
      valueStyle: { color: '#1890ff' },
    },
    {
      title: 'Content đã Publish',
      value: contents.filter(c => c.status === 'Published').length,
      prefix: <RiseOutlined />,
      valueStyle: { color: '#722ed1' },
    },
    {
      title: 'Content Draft',
      value: contents.filter(c => c.status === 'Draft').length,
      prefix: <FileOutlined />,
      valueStyle: { color: '#faad14' },
    },
  ]

  const recentFiles = files.slice(0, 5)
  const recentContents = contents.slice(0, 5)

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 8, minHeight: '100%' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ marginBottom: 8 }}>Dashboard</Title>
          <Text type="secondary">
            Chào mừng trở lại, {user?.firstName} {user?.lastName}
          </Text>
        </div>

      {/* Error Messages */}
      {(filesError || contentsError) && (
        <Alert
          message="Lỗi tải dữ liệu"
          description={
            <>
              {filesError && `Lỗi tải files: ${filesError instanceof Error ? filesError.message : 'Lỗi không xác định'}`}
              {contentsError && `Lỗi tải content: ${contentsError instanceof Error ? contentsError.message : 'Lỗi không xác định'}`}
            </>
          }
          type="error"
          showIcon
          closable
        />
      )}

      {/* Stats */}
      <Row gutter={[16, 16]}>
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={filesLoading || contentsLoading ? 0 : stat.value}
                prefix={stat.prefix}
                valueStyle={stat.valueStyle}
                loading={filesLoading || contentsLoading}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* Recent Files */}
        <Col xs={24} lg={12}>
          <Card 
            title="Files gần đây" 
            loading={filesLoading}
          >
            {filesError ? (
              <Alert message="Lỗi tải files" type="error" />
            ) : recentFiles.length === 0 ? (
              <Text type="secondary">Chưa có files nào</Text>
            ) : (
              <List
                dataSource={recentFiles}
                renderItem={(file) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<FolderOutlined style={{ fontSize: 20 }} />}
                      title={<Text strong>{file.originalFileName}</Text>}
                      description={
                        <Space>
                          <Tag>{file.fileType}</Tag>
                          <Text type="secondary">
                            {(file.fileSize / 1024).toFixed(2)} KB
                          </Text>
                          <Text type="secondary">
                            {dayjs(file.createdAt).format('DD/MM/YYYY')}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* Recent Content */}
        <Col xs={24} lg={12}>
          <Card 
            title="Content gần đây" 
            loading={contentsLoading}
          >
            {contentsError ? (
              <Alert message="Lỗi tải content" type="error" />
            ) : recentContents.length === 0 ? (
              <Text type="secondary">Chưa có content nào</Text>
            ) : (
              <List
                dataSource={recentContents}
                renderItem={(content) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<FileTextOutlined style={{ fontSize: 20 }} />}
                      title={<Text strong>{content.title}</Text>}
                      description={
                        <Space>
                          <Tag>{content.contentType}</Tag>
                          <Tag color={content.status === 'Published' ? 'green' : 'orange'}>
                            {content.status}
                          </Tag>
                          <Text type="secondary">
                            {dayjs(content.createdAt).format('DD/MM/YYYY')}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
      </Space>
    </div>
  )
}
