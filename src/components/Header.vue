<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRoomStore } from '../stores/roomStore'
import { storeToRefs } from 'pinia'
import CrownIcon from './icons/CrownIcon.vue'
import CopyIcon from './icons/CopyIcon.vue'
import LogoutIcon from './icons/LogoutIcon.vue'
import CopyModal from './CopyModal.vue'
import LeaveRoomModal from './LeaveRoomModal.vue'

const router = useRouter()
const roomStore = useRoomStore()
const { roomCode, currentUser, videoUrlInput, videoAddError } = storeToRefs(roomStore)
const { leaveRoom, addVideoFromUrl } = roomStore

const showCopyModal = ref(false)
const showLeaveModal = ref(false)

const canControl = computed(() =>
  currentUser.value?.role === 'host' || currentUser.value?.role === 'controller'
)
const hostUser = computed(() => currentUser.value?.role === 'host')

const roomLink = computed(() =>
  new URL(`room/${roomCode.value}`, window.location.origin + (import.meta.env.BASE_URL || '/')).href
)

const openCopyModal = () => {
  showCopyModal.value = true
}

const handleLeave = () => {
  leaveRoom()
  router.push('/')
}
</script>

<template>
  <header class="bg-[#1a1a1a] border-b border-gray-800 px-3 py-3 md:px-6 md:py-4">
    <!-- Mobile: row 1 — room code left, Copy+Leave right; row 2 — video input -->
    <!-- Desktop: room code, host, video input (left group) | Copy, Leave (right) -->
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
      <!-- Mobile row 1: room code | Copy + Leave (top-right) -->
      <!-- Desktop: left group — room code, host, video input -->
      <div class="flex items-center justify-between md:justify-start md:flex-1 md:min-w-0 md:gap-4">
        <div class="flex items-center gap-2 flex-shrink-0">
          <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-mono text-sm font-semibold tracking-wider">
            {{ roomCode }}
          </div>
          <div v-if="hostUser" class="hidden sm:flex items-center gap-2 bg-amber-500/20 text-amber-400 px-2 py-1 md:px-3 md:py-1.5 rounded-lg">
            <CrownIcon class="w-4 h-4" />
            <span class="text-sm font-medium">Host</span>
          </div>
        </div>

        <!-- Mobile only: Copy + Leave top-right -->
        <div class="flex md:hidden items-center gap-2 flex-shrink-0">
          <button
            type="button"
            @click="openCopyModal"
            class="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 px-2.5 py-1.5 rounded-lg transition-colors text-sm"
          >
            <CopyIcon class="w-4 h-4" />
            <span class="font-medium">Copy</span>
          </button>
          <button
            type="button"
            @click="showLeaveModal = true"
            class="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-2.5 py-1.5 rounded-lg transition-colors text-sm"
          >
            <LogoutIcon class="w-4 h-4" />
            <span class="font-medium">Leave</span>
          </button>
        </div>

        <!-- Desktop: video input in left group (next to room code, host) -->
        <div v-if="canControl" class="hidden md:flex relative items-center gap-2 min-w-0 flex-1 max-w-md">
          <input
            v-model="videoUrlInput"
            type="text"
            placeholder="YouTube, Rutube, VK Video..."
            class="flex-1 min-w-0 bg-gray-800 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-600 placeholder-gray-500 text-sm"
            @keypress.enter="addVideoFromUrl"
          />
          <button
            type="button"
            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0"
            @click="addVideoFromUrl"
          >
            Add
          </button>
          <span
            v-if="videoAddError"
            class="absolute left-full top-1/2 -translate-y-1/2 ml-2 text-red-400 text-xs whitespace-nowrap"
          >
            {{ videoAddError }}
          </span>
        </div>
      </div>

      <!-- Mobile row 2: video input -->
      <div v-if="canControl" class="relative flex md:hidden items-center gap-2 min-w-0 w-full">
        <input
          v-model="videoUrlInput"
          type="text"
          placeholder="YouTube, Rutube, VK Video..."
          class="flex-1 min-w-0 bg-gray-800 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-600 placeholder-gray-500 text-sm"
          @keypress.enter="addVideoFromUrl"
        />
        <button
          type="button"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0"
          @click="addVideoFromUrl"
        >
          Add
        </button>
        <span
          v-if="videoAddError"
          class="absolute left-0 top-full mt-1 text-red-400 text-xs whitespace-nowrap"
        >
          {{ videoAddError }}
        </span>
      </div>

      <!-- Desktop only: Copy + Leave -->
      <div class="hidden md:flex items-center gap-3 flex-shrink-0">
        <button
          type="button"
          @click="openCopyModal"
          class="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <CopyIcon class="w-4 h-4" />
          <span class="font-medium">Copy Link</span>
        </button>
        <button
          type="button"
          @click="showLeaveModal = true"
          class="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <LogoutIcon class="w-4 h-4" />
          <span class="font-medium">Leave</span>
        </button>
      </div>
    </div>

    <!-- Modals -->
    <CopyModal
      v-if="showCopyModal"
      title="Room link"
      :text="roomLink"
      @close="showCopyModal = false"
    />
    <LeaveRoomModal
      v-if="showLeaveModal"
      @confirm="showLeaveModal = false; handleLeave()"
      @cancel="showLeaveModal = false"
    />
  </header>
</template>
