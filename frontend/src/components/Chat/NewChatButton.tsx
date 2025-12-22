import { useState } from 'react'
import { Button, FloatButton } from 'antd'
import { PlusOutlined, MessageOutlined } from '@ant-design/icons'
import CreateChatRoomModal from './CreateChatRoomModal'
import type { ChatRoomDto } from '../../types'

interface NewChatButtonProps {
  onRoomCreated?: (room: ChatRoomDto) => void
  floatButton?: boolean
  style?: React.CSSProperties
}

export default function NewChatButton({ onRoomCreated, floatButton = false, style }: NewChatButtonProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const handleSuccess = (room: ChatRoomDto) => {
    onRoomCreated?.(room)
  }

  if (floatButton) {
    return (
      <>
        <FloatButton
          icon={<PlusOutlined />}
          type="primary"
          style={{ right: 24, bottom: 24, ...style }}
          onClick={() => setModalOpen(true)}
          tooltip="Tạo cuộc trò chuyện mới"
        />
        <CreateChatRoomModal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onSuccess={handleSuccess}
        />
      </>
    )
  }

  return (
    <>
      <Button
        type="primary"
        icon={<MessageOutlined />}
        onClick={() => setModalOpen(true)}
        block
        style={style}
      >
        Tạo cuộc trò chuyện mới
      </Button>
      <CreateChatRoomModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  )
}
