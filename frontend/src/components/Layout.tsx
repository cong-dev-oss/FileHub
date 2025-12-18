import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout as AntLayout, Menu, Avatar, Dropdown, Button, Typography, Space, Badge } from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  FolderOutlined,
  FileTextOutlined,
  UserOutlined,
  SafetyOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
} from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'
import { usePermissions } from '../hooks/usePermissions'
import { ROUTES } from '../constants'
import { useState } from 'react'

const { Header, Sider, Content } = AntLayout
const { Text } = Typography

export default function Layout() {
  const { user, logout } = useAuth()
  const { isAdmin } = usePermissions()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const menuItems: MenuProps['items'] = [
    {
      key: ROUTES.DASHBOARD,
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: ROUTES.FILES,
      icon: <FolderOutlined />,
      label: 'Files',
    },
    {
      key: ROUTES.CONTENT,
      icon: <FileTextOutlined />,
      label: 'Content',
    },
    ...(isAdmin()
      ? [
          {
            type: 'divider' as const,
          },
          {
            key: ROUTES.USERS,
            icon: <UserOutlined />,
            label: 'Users',
          },
          {
            key: ROUTES.ROLES,
            icon: <SafetyOutlined />,
            label: 'Roles & Permissions',
          },
        ]
      : []),
  ]

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Thông tin cá nhân',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      logout()
    } else if (key === 'profile') {
      // Navigate to profile page if exists
      // navigate('/profile')
    }
  }

  return (
    <AntLayout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={260}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
        }}
        theme="light"
      >
        {/* Logo Section */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 24px',
            borderBottom: '1px solid #f0f0f0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          {!collapsed ? (
            <Space>
              <FolderOutlined style={{ fontSize: 28, color: '#fff' }} />
              <Text strong style={{ color: '#fff', fontSize: 20, fontWeight: 600 }}>
                File Hub
              </Text>
            </Space>
          ) : (
            <FolderOutlined style={{ fontSize: 28, color: '#fff' }} />
          )}
        </div>

        {/* Menu */}
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            borderRight: 0,
            marginTop: 8,
            background: 'transparent',
          }}
        />
      </Sider>

      <AntLayout style={{ marginLeft: collapsed ? 80 : 260, transition: 'all 0.2s' }}>
        {/* Header */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: 18,
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />

          <Space size="large">
            <Badge count={0} showZero={false}>
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 18 }} />}
                style={{ width: 48, height: 48 }}
              />
            </Badge>

            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: handleUserMenuClick,
              }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Space
                style={{
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: 8,
                  transition: 'all 0.2s',
                }}
                className="hover:bg-gray-50"
              >
                <Avatar
                  style={{
                    backgroundColor: '#667eea',
                    verticalAlign: 'middle',
                  }}
                  size="default"
                >
                  {user?.firstName?.[0]?.toUpperCase()}
                  {user?.lastName?.[0]?.toUpperCase()}
                </Avatar>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Text strong style={{ fontSize: 14, lineHeight: 1.2 }}>
                    {user?.firstName} {user?.lastName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.2 }}>
                    {user?.email}
                  </Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: '24px',
            padding: 0,
            minHeight: 280,
            background: 'transparent',
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
