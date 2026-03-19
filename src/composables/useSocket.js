import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

let socketInstance = null

export function useSocket() {
  const connect = () => {
    if (socketInstance?.connected) return socketInstance

    socketInstance = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    return socketInstance
  }

  const disconnect = () => {
    if (socketInstance) {
      socketInstance.disconnect()
      socketInstance = null
    }
  }

  const getSocket = () => socketInstance

  const isConnected = () => socketInstance?.connected ?? false

  return {
    connect,
    disconnect,
    getSocket,
    isConnected,
  }
}
