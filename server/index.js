import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  },
})

// In-memory store for rooms
const rooms = new Map()

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const getInitials = (nickname) => {
  return (nickname || '??').substring(0, 2).toUpperCase()
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('createRoom', ({ nickname }) => {
    const code = generateRoomCode()
    const user = {
      id: socket.id,
      nickname: nickname?.trim() || 'Anonymous',
      role: 'host',
      avatar: getInitials(nickname),
    }

    rooms.set(code, {
      code,
      hostId: socket.id,
      videoId: null,
      isPlaying: false,
      currentTime: 0,
      users: [user],
      messages: [{
        id: `msg-${Date.now()}`,
        userId: 'system',
        nickname: 'System',
        role: 'viewer',
        text: `Welcome to room ${code}! Share the room code with friends to watch together.`,
        timestamp: new Date().toISOString(),
      }],
    })

    socket.join(code)
    socket.roomCode = code
    socket.user = user

    socket.emit('roomCreated', {
      roomCode: code,
      user,
      users: [user],
      messages: rooms.get(code).messages,
      videoId: null,
      isPlaying: false,
      currentTime: 0,
    })
  })

  socket.on('joinRoom', ({ roomCode: code, nickname }) => {
    const roomCode = (code || '').toUpperCase().trim()
    const room = rooms.get(roomCode)

    if (!room) {
      socket.emit('roomError', { message: 'Room not found' })
      return
    }

    const user = {
      id: socket.id,
      nickname: nickname?.trim() || 'Anonymous',
      role: 'viewer',
      avatar: getInitials(nickname),
    }

    room.users.push(user)
    room.messages.push({
      id: `msg-${Date.now()}`,
      userId: 'system',
      nickname: 'System',
      role: 'viewer',
      text: `${user.nickname} joined the room!`,
      timestamp: new Date().toISOString(),
    })

    socket.join(roomCode)
    socket.roomCode = roomCode
    socket.user = user

    socket.emit('roomJoined', {
      roomCode,
      user,
      users: room.users,
      messages: room.messages,
      videoId: room.videoId,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
    })

    socket.to(roomCode).emit('userJoined', { user })
    socket.to(roomCode).emit('newMessage', room.messages[room.messages.length - 1])
  })

  socket.on('joinRoomSync', () => {
    const roomCode = socket.roomCode
    if (!roomCode) return

    const room = rooms.get(roomCode)
    if (!room) return

    socket.emit('roomState', {
      users: room.users,
      messages: room.messages,
      videoId: room.videoId,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
    })
  })

  socket.on('disconnect', () => {
    const roomCode = socket.roomCode
    if (!roomCode) return

    const room = rooms.get(roomCode)
    if (!room) return

    const user = room.users.find((u) => u.id === socket.id)
    if (user) {
      room.users = room.users.filter((u) => u.id !== socket.id)
      room.messages.push({
        id: `msg-${Date.now()}`,
        userId: 'system',
        nickname: 'System',
        role: 'viewer',
        text: `${user.nickname} left the room`,
        timestamp: new Date().toISOString(),
      })

      if (room.users.length === 0) {
        rooms.delete(roomCode)
      } else if (room.hostId === socket.id) {
        room.hostId = room.users[0].id
        room.users[0].role = 'host'
        io.to(roomCode).emit('userLeft', { userId: socket.id })
        io.to(roomCode).emit('roleUpdated', { users: room.users })
        io.to(roomCode).emit('newMessage', room.messages[room.messages.length - 1])
      } else {
        io.to(roomCode).emit('userLeft', { userId: socket.id })
        io.to(roomCode).emit('roleUpdated', { users: room.users })
        io.to(roomCode).emit('newMessage', room.messages[room.messages.length - 1])
      }
    }
  })

  socket.on('leaveRoom', () => {
    const roomCode = socket.roomCode
    if (!roomCode) return

    const room = rooms.get(roomCode)
    if (!room) return

    const user = room.users.find((u) => u.id === socket.id)
    if (user) {
      room.users = room.users.filter((u) => u.id !== socket.id)
      room.messages.push({
        id: `msg-${Date.now()}`,
        userId: 'system',
        nickname: 'System',
        role: 'viewer',
        text: `${user.nickname} left the room`,
        timestamp: new Date().toISOString(),
      })

      if (room.users.length === 0) {
        rooms.delete(roomCode)
      } else if (room.hostId === socket.id) {
        room.hostId = room.users[0].id
        room.users[0].role = 'host'
        io.to(roomCode).emit('userLeft', { userId: socket.id })
        io.to(roomCode).emit('roleUpdated', { users: room.users })
        io.to(roomCode).emit('newMessage', room.messages[room.messages.length - 1])
      } else {
        io.to(roomCode).emit('userLeft', { userId: socket.id })
        io.to(roomCode).emit('roleUpdated', { users: room.users })
        io.to(roomCode).emit('newMessage', room.messages[room.messages.length - 1])
      }
    }

    socket.leave(roomCode)
    socket.roomCode = null
    socket.user = null
  })

  socket.on('sendMessage', ({ text }) => {
    const roomCode = socket.roomCode
    if (!roomCode || !text?.trim()) return

    const room = rooms.get(roomCode)
    if (!room) return

    const user = room.users.find((u) => u.id === socket.id)
    if (!user) return

    const message = {
      id: `msg-${Date.now()}`,
      userId: user.id,
      nickname: user.nickname,
      role: user.role,
      text: text.trim().substring(0, 500),
      timestamp: new Date().toISOString(),
    }

    room.messages.push(message)
    io.to(roomCode).emit('newMessage', message)
  })

  socket.on('sendReaction', ({ emoji }) => {
    const roomCode = socket.roomCode
    if (!roomCode || !emoji) return

    const room = rooms.get(roomCode)
    const user = room?.users?.find((u) => u.id === socket.id) || socket.user
    if (!user) return

    const reaction = {
      id: `reaction-${Date.now()}`,
      emoji,
      nickname: user.nickname,
      x: Math.random() * 80 + 10,
      y: Math.random() * 30 + 35,
    }

    io.to(roomCode).emit('newReaction', reaction)
  })

  socket.on('playerState', ({ action, currentTime, videoId }) => {
    const roomCode = socket.roomCode
    if (!roomCode) return

    const room = rooms.get(roomCode)
    if (!room) return

    const user = room.users.find((u) => u.id === socket.id)
    if (!user || (user.role !== 'host' && user.role !== 'controller')) return

    if (videoId) room.videoId = videoId
    if (action === 'play') room.isPlaying = true
    if (action === 'pause') room.isPlaying = false
    if (typeof currentTime === 'number') room.currentTime = currentTime

    socket.to(roomCode).emit('syncPlayer', {
      action,
      currentTime: room.currentTime,
      videoId: room.videoId,
    })
  })

  socket.on('assignController', ({ targetUserId, makeController }) => {
    const roomCode = socket.roomCode
    if (!roomCode) return

    const room = rooms.get(roomCode)
    if (!room) return

    const user = room.users.find((u) => u.id === socket.id)
    if (!user || user.role !== 'host') return

    const target = room.users.find((u) => u.id === targetUserId)
    if (!target) return

    target.role = makeController ? 'controller' : 'viewer'
    io.to(roomCode).emit('roleUpdated', { users: room.users })
  })

})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
