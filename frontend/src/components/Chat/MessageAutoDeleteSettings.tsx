import { useState, useEffect } from 'react'
import { Card, Switch, Select, InputNumber, Button, Form, message, Space, Typography, Divider, Alert } from 'antd'
import { SaveOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { chatService } from '../../services/chatService'
import type { MessageAutoDeleteSettingDto, CreateMessageAutoDeleteSettingDto } from '../../types'
import { AutoDeletePeriod } from '../../types'

const { Option } = Select
const { Text, Title } = Typography

export default function MessageAutoDeleteSettings() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [setting, setSetting] = useState<MessageAutoDeleteSettingDto | null>(null)

  useEffect(() => {
    loadSetting()
  }, [])

  const loadSetting = async () => {
    try {
      setLoading(true)
      const data = await chatService.getAutoDeleteSetting()
      setSetting(data)
      form.setFieldsValue({
        isEnabled: data.isEnabled,
        period: data.period,
        periodValue: data.periodValue,
      })
    } catch (error: any) {
      message.error('Không thể tải cài đặt: ' + (error.message || 'Lỗi không xác định'))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (values: CreateMessageAutoDeleteSettingDto) => {
    try {
      setSaving(true)
      const saved = await chatService.createOrUpdateAutoDeleteSetting(values)
      setSetting(saved)
      message.success('Đã lưu cài đặt thành công')
    } catch (error: any) {
      message.error('Không thể lưu cài đặt: ' + (error.message || 'Lỗi không xác định'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setSaving(true)
      await chatService.deleteAutoDeleteSetting()
      setSetting(null)
      form.resetFields()
      form.setFieldsValue({
        isEnabled: false,
        period: AutoDeletePeriod.Never,
        periodValue: undefined,
      })
      message.success('Đã xóa cài đặt thành công')
    } catch (error: any) {
      message.error('Không thể xóa cài đặt: ' + (error.message || 'Lỗi không xác định'))
    } finally {
      setSaving(false)
    }
  }

  const getPeriodLabel = (period: AutoDeletePeriod): string => {
    switch (period) {
      case AutoDeletePeriod.Never:
        return 'Không tự động xóa'
      case AutoDeletePeriod.Hours:
        return 'Giờ'
      case AutoDeletePeriod.Days:
        return 'Ngày'
      case AutoDeletePeriod.Weeks:
        return 'Tuần'
      case AutoDeletePeriod.Months:
        return 'Tháng'
      default:
        return 'Không xác định'
    }
  }

  const getDescription = (period: AutoDeletePeriod, periodValue?: number): string => {
    if (period === AutoDeletePeriod.Never || !periodValue) {
      return 'Tin nhắn sẽ không bị tự động xóa'
    }
    const periodLabel = getPeriodLabel(period).toLowerCase()
    return `Tin nhắn cũ hơn ${periodValue} ${periodLabel} sẽ bị tự động xóa`
  }

  const isMobile = window.innerWidth < 768

  return (
    <Card
      title={
        <Space>
          <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
            Cài đặt tự động xóa tin nhắn
          </Title>
        </Space>
      }
      loading={loading}
      style={{ maxWidth: isMobile ? '100%' : 600, margin: '0 auto' }}
      styles={isMobile ? { body: { padding: '16px' } } : undefined}
    >
      <Alert
        message="Thông tin"
        description="Chức năng này sẽ tự động xóa các tin nhắn cũ của bạn theo khoảng thời gian đã cài đặt. Job chạy ngầm sẽ kiểm tra và xóa tin nhắn mỗi giờ."
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          isEnabled: false,
          period: AutoDeletePeriod.Never,
          periodValue: undefined,
        }}
      >
        <Form.Item
          name="isEnabled"
          label="Bật tự động xóa tin nhắn"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.isEnabled !== currentValues.isEnabled}
        >
          {({ getFieldValue }) =>
            getFieldValue('isEnabled') ? (
              <>
                <Form.Item
                  name="period"
                  label="Chu kỳ xóa"
                  rules={[{ required: true, message: 'Vui lòng chọn chu kỳ xóa' }]}
                >
                  <Select placeholder="Chọn chu kỳ xóa">
                    <Option value={AutoDeletePeriod.Hours}>Theo giờ</Option>
                    <Option value={AutoDeletePeriod.Days}>Theo ngày</Option>
                    <Option value={AutoDeletePeriod.Weeks}>Theo tuần</Option>
                    <Option value={AutoDeletePeriod.Months}>Theo tháng</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) => prevValues.period !== currentValues.period}
                >
                  {({ getFieldValue }) =>
                    getFieldValue('period') !== AutoDeletePeriod.Never ? (
                      <Form.Item
                        name="periodValue"
                        label="Số lượng"
                        rules={[
                          { required: true, message: 'Vui lòng nhập số lượng' },
                          { type: 'number', min: 1, message: 'Số lượng phải lớn hơn 0' },
                        ]}
                      >
                        <InputNumber
                          min={1}
                          max={1000}
                          style={{ width: '100%' }}
                          placeholder="Nhập số lượng"
                        />
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) =>
                    prevValues.period !== currentValues.period ||
                    prevValues.periodValue !== currentValues.periodValue
                  }
                >
                  {({ getFieldValue }) => {
                    const period = getFieldValue('period')
                    const periodValue = getFieldValue('periodValue')
                    return (
                      <Alert
                        message={getDescription(period, periodValue)}
                        type="warning"
                        style={{ marginBottom: 24 }}
                      />
                    )
                  }}
                </Form.Item>
              </>
            ) : (
              <Alert
                message="Tự động xóa tin nhắn đã được tắt"
                description="Tin nhắn của bạn sẽ không bị tự động xóa"
                type="info"
                style={{ marginBottom: 24 }}
              />
            )
          }
        </Form.Item>

        <Divider />

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
            >
              Lưu cài đặt
            </Button>
            {setting && setting.id && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
                loading={saving}
              >
                Xóa cài đặt
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>

      {setting && setting.id && (
        <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Cài đặt hiện tại: {setting.isEnabled ? 'Đã bật' : 'Đã tắt'}
            {setting.isEnabled && setting.period !== AutoDeletePeriod.Never && (
              <> - {getDescription(setting.period, setting.periodValue)}</>
            )}
            <br />
            Tạo lúc: {new Date(setting.createdAt).toLocaleString('vi-VN')}
            {setting.updatedAt && (
              <>
                <br />
                Cập nhật lúc: {new Date(setting.updatedAt).toLocaleString('vi-VN')}
              </>
            )}
          </Text>
        </div>
      )}
    </Card>
  )
}
