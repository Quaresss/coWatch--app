<script setup>
import { ref, watch, nextTick } from 'vue'
import { useRoomStore } from '../stores/roomStore'
import { storeToRefs } from 'pinia'
import SendIcon from './icons/SendIcon.vue'

const roomStore = useRoomStore()
const { messages } = storeToRefs(roomStore)
const { addMessage } = roomStore

const messageText = ref('')
const messagesEndRef = ref(null)

const scrollToBottom = () => {
  nextTick(() => {
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
  })
}

watch(messages, scrollToBottom, { deep: true })

const getRoleBadgeStyles = (role) => {
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

const handleSend = () => {
  if (messageText.value.trim()) {
    addMessage(messageText.value)
    messageText.value = ''
  }
}

const handleKeyPress = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
</script>

<template>
  <div class="flex flex-col h-full bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
    <div class="px-4 py-3 border-b border-gray-800">
      <h3 class="font-semibold text-white">Chat</h3>
    </div>

    <!-- Messages List -->
    <div class="flex-1 overflow-y-auto p-4 space-y-3">
      <div
        v-for="message in messages"
        :key="message.id"
        class="group"
      >
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-medium text-white text-sm">
                {{ message.nickname }}
              </span>
              <span
                :class="['text-[10px] px-2 py-0.5 rounded border', getRoleBadgeStyles(message.role)]"
              >
                {{ getRoleLabel(message.role) }}
              </span>
              <span class="text-xs text-gray-500">
                {{ formatTime(message.timestamp) }}
              </span>
            </div>
            <p class="text-gray-300 text-sm break-words">
              {{ message.text }}
            </p>
          </div>
        </div>
      </div>
      <div ref="messagesEndRef" />
    </div>

    <!-- Message Input -->
    <div class="p-4 border-t border-gray-800">
      <div class="flex gap-2">
        <input
          v-model="messageText"
          type="text"
          placeholder="Type a message..."
          class="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-600 placeholder-gray-500"
          maxlength="500"
          @keypress="handleKeyPress"
        />
        <button
          type="button"
          :disabled="!messageText.trim()"
          class="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
          @click="handleSend"
        >
          <SendIcon class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>
