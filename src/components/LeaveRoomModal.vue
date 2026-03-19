<script setup>
import { onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['confirm', 'cancel'])

const onEscape = (e) => {
  if (e.key === 'Escape') emit('cancel')
}

onMounted(() => window.addEventListener('keydown', onEscape))
onUnmounted(() => window.removeEventListener('keydown', onEscape))
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click.self="emit('cancel')"
    >
      <div class="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6 max-w-md w-full shadow-2xl">
        <h3 class="text-lg font-semibold text-white mb-2">Leave room?</h3>
        <p class="text-gray-400 text-sm mb-6">
          You will leave the room and can rejoin using the link.
        </p>
        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            @click="emit('confirm')"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
