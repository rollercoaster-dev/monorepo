import { ref, readonly, onMounted } from 'vue'

export interface ThemeOption {
  value: string
  label: string
  moodName: string
  className: string
}

const STORAGE_KEY = 'ob-theme'

const themes: ThemeOption[] = [
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
    moodName: 'loud-clear',
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
]

const currentTheme = ref('default')

function applyThemeClass(themeName: string) {
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
  if (!theme) return
  applyThemeClass(themeName)
  currentTheme.value = themeName
  localStorage.setItem(STORAGE_KEY, themeName)
}

export function useTheme() {
  onMounted(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && themes.some(t => t.value === saved)) {
      setTheme(saved)
    }
  })

  return {
    currentTheme: readonly(currentTheme),
    themes,
    setTheme,
  }
}
