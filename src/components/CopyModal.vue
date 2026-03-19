<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import CopyIcon from './icons/CopyIcon.vue'

const emit = defineEmits(['close'])

const props = defineProps({
  title: { type: String, default: 'Copy link' },
  text: { type: String, default: '' },
})

const copied = ref(false)

const onEscape = (e) => {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onEscape))
onUnmounted(() => window.removeEventListener('keydown', onEscape))

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Fallback for older browsers
    const input = document.createElement('input')
    input.value = props.text
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div class="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6 max-w-md w-full shadow-2xl">
        <h3 class="text-lg font-semibold text-white mb-4">{{ title }}</h3>
        <div class="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            :value="props.text"
            type="text"
            readonly
            class="flex-1 min-w-0 bg-gray-800 text-gray-300 px-4 py-2 rounded-lg text-sm font-mono truncate"
          />
          <button
            type="button"
            class="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0 transition-colors"
            @click="copyToClipboard"
          >
            <CopyIcon class="w-4 h-4" />
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
        <button
          type="button"
          class="w-full py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
          @click="emit('close')"
        >
          Close
        </button>
      </div>
    </div>
  </Teleport>
</template>
