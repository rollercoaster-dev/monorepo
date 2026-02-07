import { ref, readonly, onMounted } from 'vue'

export interface ThemeOption {
  value: string
  label: string
  moodName: string
  className: string
}

const STORAGE_KEY = 'ob-theme'

const themes: readonly ThemeOption[] = [
  {
    value: 'default',
    label: 'The Full Ride',
    moodName: 'the-full-ride',
    className: '',
  },
  {
    value: 'dark',
    label: 'Night Ride',
    moodName: 'night-ride',
    className: 'ob-dark-theme',
  },
  {
    value: 'high-contrast',
    label: 'Bold Ink',
    moodName: 'bold-ink',
    className: 'ob-high-contrast-theme',
  },
  {
    value: 'large-text',
    label: 'Same Ride, Bigger Seat',
    moodName: 'same-ride-bigger-seat',
    className: 'ob-large-text-theme',
  },
  {
    value: 'dyslexia-friendly',
    label: 'Warm Studio',
    moodName: 'warm-studio',
    className: 'ob-dyslexia-friendly-theme',
  },
  {
    value: 'low-vision',
    label: 'Loud & Clear',
    moodName: 'loud-and-clear',
    className: 'ob-low-vision-theme',
  },
  {
    value: 'low-info',
    label: 'Clean Signal',
    moodName: 'clean-signal',
    className: 'ob-low-info-theme',
  },
  {
    value: 'autism-friendly',
    label: 'Still Water',
    moodName: 'still-water',
    className: 'ob-autism-friendly-theme',
  },
] as const

const currentTheme = ref('default')

function applyThemeClass(themeName: string) {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  themes.forEach(t => {
    if (t.className) el.classList.remove(t.className)
  })
  const theme = themes.find(t => t.value === themeName)
  if (theme?.className) {
    el.classList.add(theme.className)
  }
}

function setTheme(themeName: string) {
  const theme = themes.find(t => t.value === themeName)
  if (!theme) {
    console.warn(
      `[useTheme] Unknown theme "${themeName}". Available: ${themes.map(t => t.value).join(', ')}`
    )
    return
  }
  applyThemeClass(themeName)
  currentTheme.value = themeName
  try {
    localStorage.setItem(STORAGE_KEY, themeName)
  } catch {
    // Theme is applied for this session but won't persist (quota, security, etc.)
  }
}

export function useTheme() {
  onMounted(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        if (themes.some(t => t.value === saved)) {
          setTheme(saved)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {
      // localStorage unavailable — use default theme
    }
  })

  return {
    currentTheme: readonly(currentTheme),
    themes,
    setTheme,
  }
}
