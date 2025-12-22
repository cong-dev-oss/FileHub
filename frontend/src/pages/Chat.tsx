import ChatWindow from '../components/Chat/ChatWindow'

export default function Chat() {
  return (
    <div style={{ 
      background: '#fff', 
      padding: 24, 
      borderRadius: 8, 
      height: 'calc(100vh - 112px)', // 100vh - header (64px) - margin top (24px) - margin bottom (24px)
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      <ChatWindow />
    </div>
  )
}
