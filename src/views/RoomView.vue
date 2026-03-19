<script setup>
import Header from '../components/Header.vue'
import VideoPlayer from '../components/VideoPlayer.vue'
import ReactionBar from '../components/ReactionBar.vue'
import ChatPanel from '../components/ChatPanel.vue'
import UserList from '../components/UserList.vue'
import { ref, onMounted, watch } from 'vue'

const mobileTab = ref('chat')
import { useRouter, useRoute } from 'vue-router'
import { useRoomStore } from '../stores/roomStore'

const router = useRouter()
const route = useRoute()
const roomStore = useRoomStore()

const roomCodeFromUrl = ref(route.params.roomCode || '')
const showRejoinForm = ref(false)
const rejoinNickname = ref('')
const rejoinError = ref('')
const rejoinLoading = ref(false)

const tryRejoin = () => {
  const nickname = localStorage.getItem('watch-together-nickname') || rejoinNickname.value.trim()
  if (!nickname || nickname.length < 2) {
    showRejoinForm.value = true
    return
  }

  rejoinLoading.value = true
  rejoinError.value = ''
  roomStore.joinRoom(roomCodeFromUrl.value, nickname, (err) => {
    rejoinLoading.value = false
    if (err) {
      rejoinError.value = err.message || 'Failed to rejoin'
      showRejoinForm.value = true
    }
  })
}

const handleRejoinSubmit = () => {
  const nickname = rejoinNickname.value.trim()
  if (nickname.length < 2 || nickname.length > 20) {
    rejoinError.value = 'Nickname must be 2-20 characters'
    return
  }

  rejoinLoading.value = true
  rejoinError.value = ''
  roomStore.joinRoom(roomCodeFromUrl.value, nickname, (err) => {
    rejoinLoading.value = false
    if (err) {
      rejoinError.value = err.message || 'Failed to rejoin'
    } else {
      showRejoinForm.value = false
    }
  })
}

onMounted(() => {
  roomCodeFromUrl.value = (route.params.roomCode || '').toUpperCase()

  if (roomStore.currentUser) {
    return
  }

  if (!roomCodeFromUrl.value) {
    router.replace('/')
    return
  }

  // Всегда показываем форму ввода никнейма при переходе по ссылке
  const savedNickname = localStorage.getItem('watch-together-nickname')
  rejoinNickname.value = savedNickname && savedNickname.length >= 2 ? savedNickname : ''
  showRejoinForm.value = true
})

watch(() => route.params.roomCode, (newCode) => {
  roomCodeFromUrl.value = (newCode || '').toUpperCase()
})
</script>

<template>
  <!-- Rejoin form (after reload, no currentUser) -->
  <div
    v-if="showRejoinForm && !roomStore.currentUser"
    class="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4"
  >
    <div class="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6 md:p-8 max-w-md w-full">
      <h2 class="text-2xl font-bold text-white mb-2">Rejoin room</h2>
      <p class="text-gray-400 mb-4">
        Room {{ roomCodeFromUrl }} — enter your nickname to continue
      </p>
      <input
        v-model="rejoinNickname"
        type="text"
        placeholder="Your nickname"
        class="w-full bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-purple-600 placeholder-gray-500 mb-4"
        maxlength="20"
        @keypress.enter="handleRejoinSubmit"
      />
      <p v-if="rejoinError" class="text-red-400 text-sm mb-4">{{ rejoinError }}</p>
      <div class="flex gap-3">
        <button
          type="button"
          :disabled="rejoinLoading"
          class="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold"
          @click="handleRejoinSubmit"
        >
          {{ rejoinLoading ? 'Joining...' : 'Rejoin' }}
        </button>
        <button
          type="button"
          class="px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800"
          @click="router.push('/')"
        >
          Home
        </button>
      </div>
    </div>
  </div>

  <!-- Room (when we have currentUser) -->
  <div v-else-if="roomStore.currentUser" class="h-screen bg-[#0f0f0f] flex flex-col overflow-hidden">
    <Header />

    <main class="flex-1 overflow-hidden min-h-0">
      <div class="h-full flex flex-col md:flex-row gap-3 md:gap-4 p-3 md:p-4">
        <div class="flex-1 flex flex-col gap-3 md:gap-4 min-w-0 min-h-0">
          <VideoPlayer />
          <ReactionBar />
        </div>

        <!-- Desktop: sidebar -->
        <div class="hidden md:flex w-96 flex-col gap-4 flex-shrink-0 min-h-0">
          <div class="flex-[2] min-h-0">
            <ChatPanel />
          </div>
          <div class="flex-1 min-h-0">
            <UserList />
          </div>
        </div>

        <!-- Mobile: tabbed Chat / Participants -->
        <div class="md:hidden flex flex-col flex-shrink-0 min-h-0 w-full" style="max-height: 40vh">
          <div class="flex border-b border-gray-800 mb-2">
            <button
              type="button"
              :class="['flex-1 py-2 text-sm font-medium transition-colors', mobileTab === 'chat' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white']"
              @click="mobileTab = 'chat'"
            >
              Chat
            </button>
            <button
              type="button"
              :class="['flex-1 py-2 text-sm font-medium transition-colors', mobileTab === 'participants' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white']"
              @click="mobileTab = 'participants'"
            >
              Participants
            </button>
          </div>
          <div class="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div v-show="mobileTab === 'chat'" class="flex-1 min-h-0 overflow-hidden">
              <ChatPanel class="h-full" />
            </div>
            <div v-show="mobileTab === 'participants'" class="flex-1 min-h-0 overflow-hidden">
              <UserList class="h-full" />
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
