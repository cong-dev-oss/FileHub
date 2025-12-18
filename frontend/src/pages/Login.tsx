import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Space, message } from 'antd'
import { UserOutlined, LockOutlined, FolderOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import { authService } from '../services/authService'
import { extractAllErrorMessages } from '../utils/errorHandler'

const { Title, Text } = Typography

interface LoginForm {
  email: string
  password: string
}

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const onSubmit = async (values: LoginForm) => {
    setLoading(true)
    try {
      const response = await authService.login(values)
      setAuth(
        {
          ...response.user,
          roles: response.roles,
          permissions: response.permissions,
        },
        response.token
      )
      message.success('Đăng nhập thành công!')
      navigate('/dashboard')
    } catch (error: any) {
      const errorMessages = extractAllErrorMessages(error)
      errorMessages.forEach(msg => message.error(msg))
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          maxWidth: 400, 
          width: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <FolderOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            <Title level={2} style={{ marginTop: 16, marginBottom: 8 }}>
              File Hub
            </Title>
            <Text type="secondary">Đăng nhập vào tài khoản của bạn</Text>
          </div>

          <Form
            form={form}
            name="login"
            onFinish={onSubmit}
            layout="vertical"
            size="large"
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
                prefix={<UserOutlined />} 
                placeholder="Nhập email của bạn"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu!' },
                { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="Nhập mật khẩu"
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                loading={loading}
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  )
}
