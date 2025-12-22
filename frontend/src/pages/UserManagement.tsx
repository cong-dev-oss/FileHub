import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  Button,
  Input,
  Space,
  Typography,
  Tag,
  Popconfirm,
  Modal,
  Form,
  Select,
  Switch,
  Card,
  Row,
  Col,
  Avatar,
  Badge,
  message,
  Drawer,
  Divider,
  Tooltip,
  Statistic,
} from 'antd'
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MailOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { userService, UserListItem, CreateUserRequest } from '../services/userService'
import { roleService, Role } from '../services/roleService'
import { extractAllErrorMessages } from '../utils/errorHandler'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Search } = Input

export default function UserManagement() {
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [searchText, setSearchText] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getUsers(),
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleService.getRoles(),
  })

  const createUserMutation = useMutation({
    mutationFn: (payload: CreateUserRequest) => userService.createUser(payload),
    onSuccess: () => {
      message.success('Tạo user thành công!')
      setIsCreateModalOpen(false)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      const errorMessages = extractAllErrorMessages(error)
      errorMessages.forEach((msg) => message.error(msg))
    },
  })

  const updateRolesMutation = useMutation({
    mutationFn: (payload: { userId: string; roles: string[] }) =>
      userService.updateUserRoles(payload.userId, payload.roles),
    onSuccess: () => {
      message.success('Cập nhật roles thành công!')
      setIsEditDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      const errorMessages = extractAllErrorMessages(error)
      errorMessages.forEach((msg) => message.error(msg))
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { userId: string; isActive: boolean }) =>
      userService.updateUserStatus(payload.userId, payload.isActive),
    onSuccess: () => {
      message.success('Cập nhật trạng thái thành công!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      const errorMessages = extractAllErrorMessages(error)
      errorMessages.forEach((msg) => message.error(msg))
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    onSuccess: () => {
      message.success('Xóa user thành công!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      const errorMessages = extractAllErrorMessages(error)
      errorMessages.forEach((msg) => message.error(msg))
    },
  })

  const handleCreateUser = async (values: any) => {
    const payload: CreateUserRequest = {
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName || '',
      password: values.password,
      confirmPassword: values.confirmPassword,
      roles: values.roles || [],
    }
    createUserMutation.mutate(payload)
  }

  const handleEditUser = (user: UserListItem) => {
    setSelectedUser(user)
    setSelectedRoles(user.roles)
    setIsEditDrawerOpen(true)
  }

  const handleSaveRoles = () => {
    if (!selectedUser) return
    updateRolesMutation.mutate({ userId: selectedUser.id, roles: selectedRoles })
  }

  const handleToggleStatus = (user: UserListItem) => {
    updateStatusMutation.mutate({ userId: user.id, isActive: !user.isActive })
  }

  const filteredUsers = users.filter((user) => {
    if (!searchText.trim()) return true
    const keyword = searchText.toLowerCase()
    return (
      user.email.toLowerCase().includes(keyword) ||
      user.firstName.toLowerCase().includes(keyword) ||
      user.lastName.toLowerCase().includes(keyword) ||
      user.roles.some((role) => role.toLowerCase().includes(keyword))
    )
  })

  const activeUsersCount = users.filter((u) => u.isActive).length
  const inactiveUsersCount = users.length - activeUsersCount

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_: any, record: UserListItem) => (
        <Space>
          <Avatar
            style={{
              backgroundColor: record.isActive ? '#52c41a' : '#ff4d4f',
            }}
            icon={<UserOutlined />}
          >
            {record.firstName[0]?.toUpperCase()}
            {record.lastName[0]?.toUpperCase()}
          </Avatar>
          <div>
            <div>
              <Text strong>{record.firstName} {record.lastName}</Text>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <MailOutlined style={{ marginRight: 4 }} />
                {record.email}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'status',
      width: 120,
      render: (isActive: boolean, record: UserListItem) => (
        <Tooltip title={isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}>
          <Badge
            status={isActive ? 'success' : 'error'}
            text={
              <Tag
                color={isActive ? 'success' : 'error'}
                icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              >
                {isActive ? 'Active' : 'Inactive'}
              </Tag>
            }
          />
        </Tooltip>
      ),
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[]) => (
        <Space wrap>
          {roles.length > 0 ? (
            roles.map((role) => (
              <Tag key={role} color="blue" icon={<SafetyOutlined />}>
                {role}
              </Tag>
            ))
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Chưa có role
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(date).format('DD/MM/YYYY')}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 200,
      render: (_: any, record: UserListItem) => (
        <Space>
          <Tooltip title="Chỉnh sửa roles">
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditUser(record)}
            >
              Sửa
            </Button>
          </Tooltip>
          <Tooltip title={record.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}>
            <Switch
              checked={record.isActive}
              onChange={() => handleToggleStatus(record)}
              checkedChildren={<CheckCircleOutlined />}
              unCheckedChildren={<CloseCircleOutlined />}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa user"
            description={`Bạn có chắc chắn muốn xóa user "${record.email}"?`}
            onConfirm={() => deleteUserMutation.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa user">
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
              >
                Xóa
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 8, minHeight: '100%' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ marginBottom: 8 }}>
              <UserOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              Quản lý Người dùng
            </Title>
            <Text type="secondary">
              Quản lý tài khoản người dùng, phân quyền và trạng thái hoạt động
            </Text>
          </div>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            size="large"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Tạo User mới
          </Button>
        </div>

        {/* Statistics */}
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Tổng số Users"
                value={users.length}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Users đang hoạt động"
                value={activeUsersCount}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Users đã vô hiệu hóa"
                value={inactiveUsersCount}
                prefix={<CloseCircleOutlined />}
                styles={{ content: { color: '#ff4d4f' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Search and Filters */}
        <Card>
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            <Search
              placeholder="Tìm kiếm theo tên, email hoặc role..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
            />
          </Space>
        </Card>

        {/* Users Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="id"
            loading={isLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} users`,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            locale={{
              emptyText: 'Không có users nào',
            }}
          />
        </Card>

        {/* Create User Modal */}
        <Modal
          title={
            <Space>
              <UserAddOutlined />
              <span>Tạo User mới</span>
            </Space>
          }
          open={isCreateModalOpen}
          onCancel={() => {
            setIsCreateModalOpen(false)
            form.resetFields()
          }}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateUser}
            autoComplete="off"
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email!' },
                { type: 'email', message: 'Email không hợp lệ!' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="user@example.com"
                size="large"
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="firstName"
                  label="Họ"
                  rules={[{ required: true, message: 'Vui lòng nhập họ!' }]}
                >
                  <Input placeholder="Nhập họ" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="lastName"
                  label="Tên"
                >
                  <Input placeholder="Nhập tên" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu!' },
                { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
              ]}
            >
              <Input.Password placeholder="Tối thiểu 6 ký tự" size="large" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Xác nhận mật khẩu"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('Mật khẩu không khớp!'))
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Nhập lại mật khẩu" size="large" />
            </Form.Item>

            <Form.Item
              name="roles"
              label="Roles"
            >
              <Select
                mode="multiple"
                placeholder="Chọn roles"
                size="large"
                options={roles.map((role) => ({
                  label: role.name,
                  value: role.name,
                }))}
              />
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => {
                  setIsCreateModalOpen(false)
                  form.resetFields()
                }}>
                  Hủy
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={createUserMutation.isPending}
                  icon={<UserAddOutlined />}
                >
                  Tạo User
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Edit User Roles Drawer */}
        <Drawer
          title={
            <Space>
              <SafetyOutlined />
              <span>Quản lý Roles cho User</span>
            </Space>
          }
          placement="right"
          onClose={() => {
            setIsEditDrawerOpen(false)
            setSelectedUser(null)
            setSelectedRoles([])
          }}
          open={isEditDrawerOpen}
          size="default"
          styles={{ body: { width: 400 } }}
          extra={
            <Space>
              <Button onClick={() => setIsEditDrawerOpen(false)}>
                Hủy
              </Button>
              <Button
                type="primary"
                onClick={handleSaveRoles}
                loading={updateRolesMutation.isPending}
                icon={<SafetyOutlined />}
              >
                Lưu Roles
              </Button>
            </Space>
          }
        >
          {selectedUser && (
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Space>
                  <Avatar
                    size={64}
                    style={{
                      backgroundColor: selectedUser.isActive ? '#52c41a' : '#ff4d4f',
                    }}
                    icon={<UserOutlined />}
                  >
                    {selectedUser.firstName[0]?.toUpperCase()}
                    {selectedUser.lastName[0]?.toUpperCase()}
                  </Avatar>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {selectedUser.firstName} {selectedUser.lastName}
                    </Title>
                    <Text type="secondary">
                      <MailOutlined style={{ marginRight: 4 }} />
                      {selectedUser.email}
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      <Tag
                        color={selectedUser.isActive ? 'success' : 'error'}
                        icon={selectedUser.isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                      >
                        {selectedUser.isActive ? 'Active' : 'Inactive'}
                      </Tag>
                    </div>
                  </div>
                </Space>
              </div>

              <Divider />

              <div>
                <Title level={5}>Chọn Roles</Title>
                <Space orientation="vertical" style={{ width: '100%' }} size="small">
                  {roles.map((role) => (
                    <Card
                      key={role.id}
                      size="small"
                      hoverable
                      style={{
                        border: selectedRoles.includes(role.name)
                          ? '2px solid #1890ff'
                          : '1px solid #d9d9d9',
                        backgroundColor: selectedRoles.includes(role.name)
                          ? '#e6f7ff'
                          : '#fff',
                      }}
                      onClick={() => {
                        setSelectedRoles((prev) =>
                          prev.includes(role.name)
                            ? prev.filter((r) => r !== role.name)
                            : [...prev, role.name]
                        )
                      }}
                    >
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          <SafetyOutlined />
                          <Text strong={selectedRoles.includes(role.name)}>
                            {role.name}
                          </Text>
                        </Space>
                        {selectedRoles.includes(role.name) && (
                          <CheckCircleOutlined style={{ color: '#1890ff' }} />
                        )}
                      </Space>
                    </Card>
                  ))}
                </Space>
              </div>

              {selectedRoles.length > 0 && (
                <div>
                  <Divider />
                  <Title level={5}>Roles đã chọn ({selectedRoles.length})</Title>
                  <Space wrap>
                    {selectedRoles.map((role) => (
                      <Tag
                        key={role}
                        color="blue"
                        closable
                        onClose={() => {
                          setSelectedRoles((prev) => prev.filter((r) => r !== role))
                        }}
                      >
                        {role}
                      </Tag>
                    ))}
                  </Space>
                </div>
              )}
            </Space>
          )}
        </Drawer>
      </Space>
    </div>
  )
}
