<script setup>
import { useRoomStore } from '../stores/roomStore'
import { storeToRefs } from 'pinia'

const roomStore = useRoomStore()
const { reactions } = storeToRefs(roomStore)
</script>

<template>
  <div class="absolute inset-0 pointer-events-none overflow-hidden">
    <TransitionGroup name="reaction">
      <div
        v-for="reaction in reactions"
        :key="reaction.id"
        class="reaction-item absolute flex flex-col items-center gap-1"
        :style="{
          top: `${reaction.y}%`,
          left: `${reaction.x}%`,
        }"
      >
        <span class="text-4xl">{{ reaction.emoji }}</span>
        <span class="text-xs text-white bg-black/50 px-2 py-0.5 rounded-full whitespace-nowrap">
          {{ reaction.nickname }}
        </span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.reaction-item {
  animation: floatUp 3s ease-out forwards;
}

@keyframes floatUp {
  0% {
    opacity: 1;
    transform: translateY(0) scale(0.5);
  }
  100% {
    opacity: 0;
    transform: translateY(-200px) scale(1.2);
  }
}

.reaction-enter-active,
.reaction-leave-active {
  transition: opacity 0.3s;
}
.reaction-enter-from,
.reaction-leave-to {
  opacity: 0;
}
</style>
