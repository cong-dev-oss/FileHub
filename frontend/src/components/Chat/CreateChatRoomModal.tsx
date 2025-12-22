import { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, Button, message, Space, Avatar, Typography } from 'antd'
import { UserOutlined, TeamOutlined } from '@ant-design/icons'
import { chatService } from '../../services/chatService'
import { userService, UserListItem } from '../../services/userService'
import type { ChatRoomDto } from '../../types'
import { ChatRoomType } from '../../types'

const { TextArea } = Input
const { Text } = Typography
const { Option } = Select

interface CreateChatRoomModalProps {
  open: boolean
  onCancel: () => void
  onSuccess: (room: ChatRoomDto) => void
}

export default function CreateChatRoomModal({ open, onCancel, onSuccess }: CreateChatRoomModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [roomType, setRoomType] = useState<ChatRoomType>(ChatRoomType.Direct)

  useEffect(() => {
    if (open) {
      loadUsers()
      form.resetFields()
      setRoomType(ChatRoomType.Direct)
    }
  }, [open])

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      const data = await userService.getUsers()
      // Filter out inactive users
      setUsers(data.filter((u) => u.isActive))
    } catch (error) {
      console.error('Failed to load users:', error)
      message.error('Không thể tải danh sách người dùng')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      // For Direct chat, auto-generate name from selected user
      let roomName = values.name || ''
      const memberIds = Array.isArray(values.memberIds) ? values.memberIds : values.memberIds ? [values.memberIds] : []
      
      if (roomType === ChatRoomType.Direct && memberIds.length === 1) {
        const selectedUser = users.find((u) => u.id === memberIds[0])
        if (selectedUser) {
          roomName = `${selectedUser.firstName} ${selectedUser.lastName}`
        }
      }

      const createDto = {
        name: roomName,
        description: values.description,
        roomType: roomType,
        memberIds: memberIds,
      }

      const room = await chatService.createChatRoom(createDto)
      message.success('Tạo phòng chat thành công!')
      form.resetFields()
      onSuccess(room)
      onCancel()
    } catch (error: any) {
      if (error?.errorFields) {
        // Form validation errors
        return
      }
      console.error('Failed to create chat room:', error)
      message.error('Không thể tạo phòng chat')
    } finally {
      setLoading(false)
    }
  }

  const handleRoomTypeChange = (type: ChatRoomType) => {
    setRoomType(type)
    form.setFieldsValue({ memberIds: [] })
  }

  return (
    <Modal
      title={
        <Space>
          <TeamOutlined />
          <span>Tạo cuộc trò chuyện mới</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          Tạo
        </Button>,
      ]}
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="Loại cuộc trò chuyện" required>
          <Space>
            <Button
              type={roomType === ChatRoomType.Direct ? 'primary' : 'default'}
              icon={<UserOutlined />}
              onClick={() => handleRoomTypeChange(ChatRoomType.Direct)}
            >
              Chat 1-1
            </Button>
            <Button
              type={roomType === ChatRoomType.Group ? 'primary' : 'default'}
              icon={<TeamOutlined />}
              onClick={() => handleRoomTypeChange(ChatRoomType.Group)}
            >
              Nhóm
            </Button>
          </Space>
        </Form.Item>

        {roomType === ChatRoomType.Group && (
          <Form.Item
            name="name"
            label="Tên nhóm"
            rules={[{ required: true, message: 'Vui lòng nhập tên nhóm' }]}
          >
            <Input placeholder="Nhập tên nhóm..." />
          </Form.Item>
        )}

        {roomType === ChatRoomType.Group && (
          <Form.Item name="description" label="Mô tả">
            <TextArea rows={3} placeholder="Nhập mô tả (tùy chọn)..." />
          </Form.Item>
        )}

        <Form.Item
          name="memberIds"
          label={roomType === ChatRoomType.Direct ? 'Chọn người để chat' : 'Thêm thành viên'}
          rules={[
            {
              required: true,
              message: roomType === ChatRoomType.Direct
                ? 'Vui lòng chọn người để chat'
                : 'Vui lòng chọn ít nhất một thành viên',
            },
            {
              validator: (_, value) => {
                if (roomType === ChatRoomType.Direct) {
                  if (!value || (Array.isArray(value) && value.length !== 1)) {
                    return Promise.reject(new Error('Chat 1-1 chỉ có thể chọn 1 người'))
                  }
                  if (typeof value === 'string' && !value) {
                    return Promise.reject(new Error('Chat 1-1 chỉ có thể chọn 1 người'))
                  }
                }
                return Promise.resolve()
              },
            },
          ]}
        >
          <Select
            mode={roomType === ChatRoomType.Direct ? undefined : 'multiple'}
            placeholder={
              roomType === ChatRoomType.Direct
                ? 'Chọn người để chat...'
                : 'Chọn thành viên...'
            }
            loading={loadingUsers}
            showSearch
            filterOption={(input, option) => {
              const label = option?.label as string
              const searchText = input.toLowerCase()
              return label?.toLowerCase().includes(searchText) || false
            }}
            optionLabelProp="label"
          >
            {users.map((user) => (
              <Option
                key={user.id}
                value={user.id}
                label={`${user.firstName} ${user.lastName}`}
              >
                <Space>
                  <Avatar
                    size="small"
                    style={{ backgroundColor: '#667eea' }}
                    icon={<UserOutlined />}
                  >
                    {user.firstName[0]?.toUpperCase()}
                    {user.lastName[0]?.toUpperCase()}
                  </Avatar>
                  <div>
                    <Text strong>
                      {user.firstName} {user.lastName}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {user.email}
                    </Text>
                  </div>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  )
}
