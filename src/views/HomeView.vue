<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useRoomStore } from '../stores/roomStore'

const router = useRouter()
const route = useRoute()
const roomStore = useRoomStore()
const { joinRoom, createRoom } = roomStore

const mode = ref(null)

onMounted(() => {
  const roomFromQuery = route.query.room
  if (roomFromQuery && typeof roomFromQuery === 'string') {
    router.replace(`/room/${roomFromQuery.toUpperCase()}`)
  }
})
const roomCode = ref('')
const nickname = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const handleJoinRoom = () => {
  if (roomCode.value.trim() && nickname.value.trim() && nickname.value.length >= 2 && nickname.value.length <= 20) {
    errorMessage.value = ''
    isLoading.value = true
    joinRoom(roomCode.value.toUpperCase(), nickname.value, (err) => {
      isLoading.value = false
      if (err) {
        errorMessage.value = err.message || 'Failed to join room'
      } else {
        router.push(`/room/${roomCode.value.toUpperCase()}`)
      }
    })
  }
}

const handleCreateRoom = () => {
  if (nickname.value.trim() && nickname.value.length >= 2 && nickname.value.length <= 20) {
    errorMessage.value = ''
    isLoading.value = true
    createRoom(nickname.value, (err) => {
      isLoading.value = false
      if (err) {
        errorMessage.value = err.message || 'Failed to create room'
      } else {
        router.push(`/room/${roomStore.roomCode}`)
      }
    })
  }
}

const handleKeyPress = (e) => {
  if (e.key === 'Enter') {
    if (mode.value === 'join') {
      handleJoinRoom()
    } else if (mode.value === 'create') {
      handleCreateRoom()
    }
  }
}

const resetForm = () => {
  mode.value = null
  roomCode.value = ''
  nickname.value = ''
}

const isJoinDisabled = () =>
  (mode.value === 'join' && (!roomCode.value.trim() || roomCode.value.length !== 6)) ||
  !nickname.value.trim() ||
  nickname.value.length < 2 ||
  nickname.value.length > 20
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1a2e] to-[#16213e] flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo/Header -->
      <div class="text-center mb-6 md:mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-3 md:mb-4 shadow-lg shadow-purple-600/50">
          <svg class="w-10 h-10 md:w-12 md:h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 9.333L15 12l-5 2.667V9.333z" />
            <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM1 12C1 5.925 5.925 1 12 1s11 4.925 11 11-4.925 11-11 11S1 18.075 1 12z" clip-rule="evenodd" />
          </svg>
        </div>
        <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">CoWatch</h1>
        <p class="text-gray-400 text-sm md:text-base">
          Watch YouTube, Rutube and VK Video in sync with friends
        </p>
      </div>

      <!-- Main Card -->
      <div class="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6 md:p-8 shadow-2xl">
        <div v-if="mode === null" class="space-y-4">
          <button
            type="button"
            class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            @click="mode = 'create'"
          >
            Create Room
          </button>
          <button
            type="button"
            class="w-full bg-gray-800 hover:bg-gray-700 text-white py-4 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            @click="mode = 'join'"
          >
            Join Room
          </button>
        </div>

        <div v-else class="space-y-4">
          <button
            type="button"
            class="text-gray-400 hover:text-white text-sm mb-2 flex items-center gap-1 transition-colors"
            @click="resetForm"
          >
            ← Back
          </button>

          <div>
            <h2 class="text-2xl font-bold text-white mb-4">
              {{ mode === 'create' ? 'Create a Room' : 'Join a Room' }}
            </h2>
          </div>

          <div v-if="mode === 'join'">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Room Code
            </label>
            <input
              :value="roomCode"
              type="text"
              placeholder="Enter 6-character code"
              class="w-full bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-purple-600 placeholder-gray-500 font-mono uppercase"
              maxlength="6"
              @input="roomCode = ($event.target.value || '').toUpperCase()"
              @keypress="handleKeyPress"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Your Nickname
            </label>
            <input
              v-model="nickname"
              type="text"
              placeholder="2-20 characters"
              class="w-full bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-purple-600 placeholder-gray-500"
              minlength="2"
              maxlength="20"
              @keypress="handleKeyPress"
            />
            <p class="text-xs text-gray-500 mt-1">
              {{ nickname.length }}/20 characters
            </p>
          </div>

          <p v-if="errorMessage" class="text-red-400 text-sm">
            {{ errorMessage }}
          </p>

          <button
            type="button"
            :disabled="isJoinDisabled() || isLoading"
            class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white py-4 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:cursor-not-allowed disabled:hover:scale-100"
            @click="mode === 'join' ? handleJoinRoom() : handleCreateRoom()"
          >
            {{ isLoading ? 'Connecting...' : (mode === 'create' ? 'Create Room' : 'Join Room') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
