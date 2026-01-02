<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  provider: string
  isLoading?: boolean
}

interface Emits {
  (e: 'click', provider: string): void
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
})

const emit = defineEmits<Emits>()

// GitHub SVG Icon component
const GitHubIcon = {
  template: `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  `,
}

const providerConfigs = {
  github: {
    text: 'Continue with GitHub',
    icon: GitHubIcon,
    class: 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50',
  },
}

const providerConfig = computed(() => {
  return (
    providerConfigs[props.provider as keyof typeof providerConfigs] || {
      text: `Continue with ${props.provider}`,
      icon: 'div',
      class: 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50',
    }
  )
})

const handleClick = () => {
  if (!props.isLoading) {
    emit('click', props.provider)
  }
}
</script>

<template>
  <button
    :disabled="isLoading"
    :class="[
      'w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium transition-colors',
      isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50',
      providerConfig.class,
    ]"
    @click="handleClick"
  >
    <span v-if="isLoading" class="flex items-center">
      <svg
        class="animate-spin -ml-1 mr-2 h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      Connecting...
    </span>
    <span v-else class="flex items-center">
      <component :is="providerConfig.icon" class="w-5 h-5 mr-2" />
      {{ providerConfig.text }}
    </span>
  </button>
</template>
