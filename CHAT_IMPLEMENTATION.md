# Chat Module Implementation - WebSocket Core

Tài liệu này mô tả cấu trúc và cách triển khai module Chat với WebSocket (SignalR) trong dự án FileHub.

## 📋 Tổng quan

Module Chat được xây dựng theo Clean Architecture pattern với các tính năng:
- ✅ Chat 1-1 (Direct Messages)
- ✅ Chat nhóm (Group Chat)
- ✅ Kênh công khai (Public Channels)
- ✅ Thông báo tin nhắn real-time
- ✅ Typing indicators
- ✅ Đính kèm file trong tin nhắn
- ✅ Đánh dấu đã đọc/chưa đọc

## 🏗️ Cấu trúc Backend

### Core Layer (`WebApp.Core`)

#### Entities
- **Message.cs**: Tin nhắn với các thuộc tính:
  - Content, SenderId, ReceiverId, ChatRoomId
  - MessageType (Text, Image, File, System)
  - IsRead, CreatedAt, ReadAt
  - Navigation properties: Sender, Receiver, ChatRoom, Attachments

- **ChatRoom.cs**: Phòng chat với các thuộc tính:
  - Name, Description, RoomType (Direct, Group, Channel)
  - CreatedById, CreatedAt
  - Navigation properties: CreatedBy, Members, Messages

- **ChatRoomMember.cs**: Thành viên phòng chat:
  - ChatRoomId, UserId, Role (Member, Admin, Owner)
  - JoinedAt, LeftAt, IsActive

- **MessageAttachment.cs**: File đính kèm:
  - FileName, FilePath, ContentType, FileSize

- **MessageNotification.cs**: Thông báo tin nhắn:
  - MessageId, UserId, Type (NewMessage, Mention, Reaction, RoomInvite)
  - IsRead, CreatedAt, ReadAt

### Application Layer (`WebApp.Application`)

#### DTOs (`DTOs/Chat/`)
- **MessageDto.cs**: DTO cho tin nhắn
- **ChatRoomDto.cs**: DTO cho phòng chat
- **CreateMessageDto.cs**: DTO tạo tin nhắn mới
- **CreateChatRoomDto.cs**: DTO tạo phòng chat mới
- **MessageNotificationDto.cs**: DTO cho thông báo

#### Interfaces
- **IChatService.cs**: Interface định nghĩa các phương thức:
  - Chat Rooms: Create, Get, Add/Remove Members, Leave, Delete
  - Messages: Send, Get, Mark as Read, Delete
  - Notifications: Get, Get Count, Mark as Read

### Infrastructure Layer (`WebApp.Infrastructure`)

#### Services
- **ChatService.cs**: Implementation của IChatService với logic nghiệp vụ:
  - Quản lý phòng chat và thành viên
  - Gửi/nhận tin nhắn
  - Tạo và quản lý thông báo
  - Tích hợp SignalR để gửi real-time notifications

#### Hubs
- **ChatHub.cs**: SignalR Hub cho WebSocket:
  - `JoinRoom(roomId)`: Tham gia phòng chat
  - `LeaveRoom(roomId)`: Rời phòng chat
  - `SendTyping(roomId, userId, userName)`: Gửi typing indicator
  - `StopTyping(roomId, userId)`: Dừng typing indicator
  - Events: `NewMessage`, `NotificationCountUpdated`, `UserTyping`, `UserStoppedTyping`

#### Data
- **ApplicationDbContext.cs**: Đã cập nhật với:
  - DbSet cho các Chat entities
  - Configuration cho relationships và indexes

### API Layer (`WebApp.API`)

#### Controllers
- **ChatController.cs**: REST API endpoints:
  - `POST /api/chat/rooms` - Tạo phòng chat
  - `GET /api/chat/rooms` - Lấy danh sách phòng chat của user
  - `GET /api/chat/rooms/{roomId}` - Lấy chi tiết phòng chat
  - `POST /api/chat/rooms/{roomId}/members/{memberId}` - Thêm thành viên
  - `DELETE /api/chat/rooms/{roomId}/members/{memberId}` - Xóa thành viên
  - `POST /api/chat/rooms/{roomId}/leave` - Rời phòng chat
  - `DELETE /api/chat/rooms/{roomId}` - Xóa phòng chat
  - `POST /api/chat/messages` - Gửi tin nhắn
  - `GET /api/chat/messages` - Lấy danh sách tin nhắn
  - `POST /api/chat/messages/{messageId}/read` - Đánh dấu đã đọc
  - `POST /api/chat/rooms/{roomId}/read` - Đánh dấu cả phòng đã đọc
  - `DELETE /api/chat/messages/{messageId}` - Xóa tin nhắn
  - `GET /api/chat/notifications` - Lấy thông báo
  - `GET /api/chat/notifications/unread-count` - Lấy số lượng chưa đọc
  - `POST /api/chat/notifications/{notificationId}/read` - Đánh dấu thông báo đã đọc
  - `POST /api/chat/notifications/read-all` - Đánh dấu tất cả đã đọc

#### Program.cs
- Đã cấu hình SignalR với JWT authentication
- Đã đăng ký ChatHub tại `/hubs/chat`
- Cấu hình JWT cho SignalR để nhận token từ query string

## 🎨 Cấu trúc Frontend

### Services (`src/services/`)

- **chatService.ts**: REST API client cho Chat:
  - Các phương thức tương ứng với backend endpoints
  - Xử lý request/response

- **chatSignalRService.ts**: SignalR client cho WebSocket:
  - Kết nối/disconnect
  - Join/Leave room
  - Subscribe to events: NewMessage, NotificationCountUpdated, UserTyping
  - Send typing indicators

### Components (`src/components/Chat/`)

- **ChatWindow.tsx**: Component chính chứa toàn bộ giao diện chat
- **ChatRoomList.tsx**: Danh sách phòng chat với unread count
- **MessageList.tsx**: Hiển thị danh sách tin nhắn với format đẹp
- **MessageInput.tsx**: Input để gửi tin nhắn với typing indicator
- **NotificationBadge.tsx**: Badge hiển thị số thông báo chưa đọc

### Types (`src/types/index.ts`)

Đã thêm các types TypeScript tương ứng với backend DTOs:
- MessageDto, ChatRoomDto, MessageNotificationDto
- Enums: MessageType, ChatRoomType, ChatRoomRole, NotificationType

### Pages (`src/pages/`)

- **Chat.tsx**: Trang Chat chính

### Routes (`src/routes/index.tsx`)

Đã thêm route `/chat` để truy cập trang chat

## 🔧 Cấu hình Database

### Migration

Cần tạo migration để thêm các bảng Chat vào database:

```bash
cd backend/src/WebApp.API
dotnet ef migrations add AddChatModule
dotnet ef database update
```

### Database Schema

Các bảng sẽ được tạo:
- `ChatRooms`: Phòng chat
- `ChatRoomMembers`: Thành viên phòng chat
- `Messages`: Tin nhắn
- `MessageAttachments`: File đính kèm
- `MessageNotifications`: Thông báo tin nhắn

## 🚀 Cách sử dụng

### Backend

1. **Tạo phòng chat**:
```csharp
var createRoomDto = new CreateChatRoomDto
{
    Name = "Team Chat",
    Description = "Chat cho team",
    RoomType = ChatRoomTypeDto.Group,
    MemberIds = new List<string> { "user1", "user2" }
};
var result = await _chatService.CreateChatRoomAsync(userId, createRoomDto);
```

2. **Gửi tin nhắn**:
```csharp
var createMessageDto = new CreateMessageDto
{
    Content = "Hello!",
    ChatRoomId = roomId,
    MessageType = MessageTypeDto.Text
};
var result = await _chatService.SendMessageAsync(userId, createMessageDto);
```

### Frontend

1. **Kết nối SignalR**:
```typescript
await chatSignalRService.connect()
await chatSignalRService.joinRoom(roomId)
```

2. **Subscribe to events**:
```typescript
chatSignalRService.onNewMessage((message) => {
  console.log('New message:', message)
})

chatSignalRService.onNotificationCountUpdated((count) => {
  console.log('Unread count:', count)
})
```

3. **Gửi tin nhắn**:
```typescript
const message = await chatService.sendMessage({
  content: 'Hello!',
  chatRoomId: roomId,
  messageType: MessageType.Text
})
```

## 📡 WebSocket Events

### Client → Server (Invoke)
- `JoinRoom(roomId)`: Tham gia phòng chat
- `LeaveRoom(roomId)`: Rời phòng chat
- `SendTyping(roomId, userId, userName)`: Gửi typing indicator
- `StopTyping(roomId, userId)`: Dừng typing indicator

### Server → Client (Send)
- `NewMessage(message)`: Tin nhắn mới
- `NotificationCountUpdated(count)`: Cập nhật số thông báo chưa đọc
- `UserTyping({ roomId, userId, userName })`: User đang gõ
- `UserStoppedTyping({ roomId, userId })`: User dừng gõ

## 🔐 Bảo mật

- Tất cả endpoints yêu cầu JWT authentication (`[Authorize]`)
- SignalR Hub yêu cầu authentication (`[Authorize]`)
- JWT token được truyền qua query string `access_token` cho SignalR
- Kiểm tra quyền thành viên trước khi truy cập phòng chat
- Chỉ owner/admin mới có thể thêm/xóa thành viên

## 📝 Ghi chú

- Module Chat tuân theo Clean Architecture pattern
- Sử dụng SignalR cho real-time communication
- Hỗ trợ pagination cho messages và notifications
- Typing indicators với timeout tự động
- Unread count được cập nhật real-time
- Soft delete cho messages (IsDeleted flag)

## 🔄 Cải tiến trong tương lai

- [ ] Emoji reactions
- [ ] Message search
- [ ] File upload trong chat
- [ ] Voice messages
- [ ] Video calls
- [ ] Message editing
- [ ] Message pinning
- [ ] Read receipts chi tiết
