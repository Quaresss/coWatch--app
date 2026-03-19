<script setup>
import { computed } from 'vue'
import { useRoomStore } from '../stores/roomStore'
import { storeToRefs } from 'pinia'
import CrownIcon from './icons/CrownIcon.vue'
import GamepadIcon from './icons/GamepadIcon.vue'
import EyeIcon from './icons/EyeIcon.vue'
import PromoteIcon from './icons/PromoteIcon.vue'
import DemoteIcon from './icons/DemoteIcon.vue'

const roomStore = useRoomStore()
const { currentUser, users } = storeToRefs(roomStore)
const { promoteUser, demoteUser } = roomStore

const isHost = computed(() => currentUser.value?.role === 'host')

const getRoleIcon = (role) => {
  switch (role) {
    case 'host':
      return CrownIcon
    case 'controller':
      return GamepadIcon
    case 'viewer':
      return EyeIcon
    default:
      return EyeIcon
  }
}

const getRoleStyles = (role) => {
  switch (role) {
    case 'host':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'controller':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'viewer':
      return 'bg-gray-700/50 text-gray-400 border-gray-600/30'
    default:
      return ''
  }
}

const getRoleLabel = (role) => {
  switch (role) {
    case 'host':
      return 'Host'
    case 'controller':
      return 'Controller'
    case 'viewer':
      return 'Viewer'
    default:
      return ''
  }
}

const getAvatarColor = (avatar) => {
  const colors = [
    'bg-red-600',
    'bg-blue-600',
    'bg-green-600',
    'bg-purple-600',
    'bg-pink-600',
    'bg-indigo-600',
    'bg-yellow-600',
    'bg-teal-600',
  ]
  const charCode = avatar.charCodeAt(0)
  return colors[charCode % colors.length]
}

const handlePromote = (userId) => {
  promoteUser(userId)
}

const handleDemote = (userId) => {
  demoteUser(userId)
}

</script>

<template>
  <div class="flex flex-col h-full bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
    <div class="px-4 py-3 border-b border-gray-800">
      <h3 class="font-semibold text-white">Participants ({{ users.length }})</h3>
    </div>

    <div class="flex-1 overflow-y-auto p-3 space-y-2">
      <div
        v-for="user in users"
        :key="user.id"
        class="bg-gray-800/50 rounded-lg p-3 flex items-center gap-3 hover:bg-gray-800 transition-colors"
      >
        <!-- Avatar -->
        <div
          :class="['w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0', getAvatarColor(user.avatar)]"
        >
          {{ user.avatar }}
        </div>

        <!-- User Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-white font-medium text-sm truncate">
              {{ user.nickname }}
              <span v-if="user.id === currentUser?.id" class="text-gray-500 ml-1">(You)</span>
            </span>
          </div>
          <div
            :class="['inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border mt-1', getRoleStyles(user.role)]"
          >
            <component :is="getRoleIcon(user.role)" class="w-4 h-4" />
            <span>{{ getRoleLabel(user.role) }}</span>
          </div>
        </div>

        <!-- Host Actions: назначает роль управляющего или гостя, может забрать -->
        <div v-if="isHost && user.id !== currentUser?.id" class="flex gap-1">
          <button
            v-if="user.role === 'viewer'"
            type="button"
            class="p-1.5 hover:bg-blue-600/20 rounded text-blue-400 transition-colors"
            title="Promote to Controller"
            @click="handlePromote(user.id)"
          >
            <PromoteIcon class="w-4 h-4" />
          </button>
          <button
            v-if="user.role === 'controller'"
            type="button"
            class="p-1.5 hover:bg-gray-700 rounded text-gray-400 transition-colors"
            title="Demote to Viewer"
            @click="handleDemote(user.id)"
          >
            <DemoteIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
