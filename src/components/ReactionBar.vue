<script setup>
import { useRoomStore } from '../stores/roomStore'

const roomStore = useRoomStore()
const { addReaction } = roomStore

const reactionEmojis = ['👍', '👎', '❤️', '😂', '😮', '🔥']
</script>

<template>
  <div class="bg-[#1a1a1a] rounded-lg p-3 md:p-4 border border-gray-800">
    <div class="flex items-center justify-center gap-1 md:gap-2 flex-wrap">
      <button
        v-for="emoji in reactionEmojis"
        :key="emoji"
        type="button"
        @click="addReaction(emoji)"
        class="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-xl md:text-2xl hover:bg-gray-800 rounded-lg transition-all hover:scale-110 active:scale-95 touch-manipulation"
      >
        {{ emoji }}
      </button>
    </div>
  </div>
</template>
