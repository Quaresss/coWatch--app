import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSocket } from '../composables/useSocket'
import { parseVideoUrl, serializeVideo } from '../utils/videoParser'

export const useRoomStore = defineStore('room', () => {
  const roomCode = ref('')
  const currentUser = ref(null)
  const users = ref([])
  const messages = ref([])
  const reactions = ref([])
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const videoId = ref(null)
  const videoUrlInput = ref('')
  const videoAddError = ref('')

  const getInitials = (nickname) => {
    return (nickname || '??').substring(0, 2).toUpperCase()
  }

  let pendingCallback = null

  const setupSocketListeners = (socket) => {
    if (!socket) return

    socket.off('roomCreated')
    socket.off('roomJoined')
    socket.off('roomError')
    socket.off('roomState')
    socket.off('userJoined')
    socket.off('userLeft')
    socket.off('roleUpdated')
    socket.off('newMessage')
    socket.off('newReaction')
    socket.off('syncPlayer')

    socket.on('roomCreated', (data) => {
      roomCode.value = data.roomCode
      currentUser.value = data.user
      users.value = data.users
      messages.value = data.messages
      reactions.value = []
      isPlaying.value = data.isPlaying ?? false
      currentTime.value = data.currentTime ?? 0
      videoId.value = data.videoId ?? null
      if (data.user?.nickname) {
        localStorage.setItem('watch-together-nickname', data.user.nickname)
        localStorage.setItem('watch-together-room', data.roomCode)
      }
      if (pendingCallback) {
        pendingCallback(null)
        pendingCallback = null
      }
    })

    socket.on('roomJoined', (data) => {
      roomCode.value = data.roomCode
      currentUser.value = data.user
      users.value = data.users
      messages.value = data.messages
      reactions.value = []
      isPlaying.value = data.isPlaying ?? false
      currentTime.value = data.currentTime ?? 0
      videoId.value = data.videoId ?? null
      if (data.user?.nickname) {
        localStorage.setItem('watch-together-nickname', data.user.nickname)
        localStorage.setItem('watch-together-room', data.roomCode)
      }
      if (pendingCallback) {
        pendingCallback(null)
        pendingCallback = null
      }
    })

    socket.on('roomError', (data) => {
      if (pendingCallback) {
        pendingCallback(new Error(data.message || 'Room error'))
        pendingCallback = null
      }
    })

    socket.on('roomState', (data) => {
      users.value = data.users ?? users.value
      messages.value = data.messages ?? messages.value
      isPlaying.value = data.isPlaying ?? isPlaying.value
      currentTime.value = data.currentTime ?? currentTime.value
      videoId.value = data.videoId ?? videoId.value
    })

    socket.on('userJoined', (data) => {
      users.value = [...users.value.filter((u) => u.id !== data.user.id), data.user]
    })

    socket.on('userLeft', (data) => {
      users.value = users.value.filter((u) => u.id !== data.userId)
    })

    socket.on('roleUpdated', (data) => {
      users.value = data.users ?? users.value
      if (currentUser.value && data.users) {
        const updated = data.users.find((u) => u.id === currentUser.value.id)
        if (updated) currentUser.value = { ...currentUser.value, role: updated.role }
      }
    })

    socket.on('newMessage', (message) => {
      if (message?.id && messages.value.some((m) => m.id === message.id)) return
      messages.value = [...messages.value, message]
    })

    socket.on('newReaction', (reaction) => {
      const id = `reaction-${Date.now()}-${Math.random()}`
      reactions.value = [...reactions.value, { ...reaction, id }]
      setTimeout(() => {
        reactions.value = reactions.value.filter((r) => r.id !== id)
      }, 3000)
    })

    socket.on('syncPlayer', (data) => {
      if (data.action === 'play') isPlaying.value = true
      if (data.action === 'pause') isPlaying.value = false
      if (typeof data.currentTime === 'number') currentTime.value = data.currentTime
      if (data.videoId) videoId.value = data.videoId
    })
  }

  const createRoom = (nickname, onSuccess) => {
    pendingCallback = onSuccess || null
    const { connect } = useSocket()
    const socket = connect()
    setupSocketListeners(socket)
    socket.emit('createRoom', { nickname: nickname?.trim() || 'Anonymous' })
  }

  const joinRoom = (code, nickname, onSuccess) => {
    const roomCodeVal = (code || '').toUpperCase().trim()
    if (!roomCodeVal) {
      if (onSuccess) onSuccess(new Error('Room code required'))
      return
    }

    pendingCallback = onSuccess || null
    const { connect } = useSocket()
    const socket = connect()
    setupSocketListeners(socket)
    socket.emit('joinRoom', { roomCode: roomCodeVal, nickname: nickname?.trim() || 'Anonymous' })
  }

  const leaveRoom = () => {
    const socket = useSocket().getSocket()
    if (socket && roomCode.value) {
      socket.emit('leaveRoom')
    }
    roomCode.value = ''
    currentUser.value = null
    users.value = []
    messages.value = []
    reactions.value = []
    isPlaying.value = false
    currentTime.value = 0
    videoId.value = null
  }

  const addMessage = (text) => {
    const socket = useSocket().getSocket()
    if (socket && text?.trim()) {
      socket.emit('sendMessage', { text: text.trim() })
    }
  }

  const addReaction = (emoji) => {
    const socket = useSocket().getSocket()
    if (socket && emoji) {
      socket.emit('sendReaction', { emoji })
    }
  }

  const promoteUser = (userId) => {
    const socket = useSocket().getSocket()
    if (socket && currentUser.value?.role === 'host') {
      socket.emit('assignController', { targetUserId: userId, makeController: true })
    }
  }

  const demoteUser = (userId) => {
    const socket = useSocket().getSocket()
    if (socket && currentUser.value?.role === 'host') {
      socket.emit('assignController', { targetUserId: userId, makeController: false })
    }
  }

  const togglePlay = () => {
    if (currentUser.value?.role !== 'host' && currentUser.value?.role !== 'controller') return

    const socket = useSocket().getSocket()
    if (socket) {
      const action = isPlaying.value ? 'pause' : 'play'
      socket.emit('playerState', {
        action,
        currentTime: currentTime.value,
      })
      isPlaying.value = !isPlaying.value
    }
  }

  const setPlayerState = (action, time, vidId) => {
    const socket = useSocket().getSocket()
    if (socket && (currentUser.value?.role === 'host' || currentUser.value?.role === 'controller')) {
      if (action === 'play') isPlaying.value = true
      if (action === 'pause') isPlaying.value = false
      if (typeof time === 'number') currentTime.value = time
      if (vidId) videoId.value = vidId
      socket.emit('playerState', {
        action,
        currentTime: time,
        videoId: vidId,
      })
    }
  }

  const setCurrentTime = (time) => {
    currentTime.value = time
    const socket = useSocket().getSocket()
    if (socket && (currentUser.value?.role === 'host' || currentUser.value?.role === 'controller')) {
      socket.emit('playerState', {
        action: 'seek',
        currentTime: time,
      })
    }
  }

  const setVideoId = (id) => {
    videoId.value = id
    const socket = useSocket().getSocket()
    if (socket && (currentUser.value?.role === 'host' || currentUser.value?.role === 'controller')) {
      socket.emit('playerState', {
        action: 'changeVideo',
        videoId: id,
      })
    }
  }

  const addVideoFromUrl = () => {
    videoAddError.value = ''
    const parsed = parseVideoUrl(videoUrlInput.value)
    if (parsed) {
      const serialized = serializeVideo(parsed.platform, parsed.id)
      setVideoId(serialized)
      videoUrlInput.value = ''
    } else {
      videoAddError.value = 'Unsupported URL. Supported: YouTube, Rutube, VK Video'
    }
  }

  return {
    roomCode,
    currentUser,
    users,
    messages,
    reactions,
    isPlaying,
    currentTime,
    videoId,
    addMessage,
    addReaction,
    promoteUser,
    demoteUser,
    togglePlay,
    setCurrentTime,
    setPlayerState,
    setVideoId,
    addVideoFromUrl,
    videoUrlInput,
    videoAddError,
    joinRoom,
    createRoom,
    leaveRoom,
  }
})
