import { useSyncExternalStore } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'
export type Theme = 'light' | 'dark'

// Keep in sync with the inline script in index.html (it runs before first paint).
const KEY = 'celest:theme'
const META_COLOR: Record<Theme, string> = { dark: '#060a16', light: '#f3eee3' }
const listeners = new Set<() => void>()
/** Fallback when localStorage is unavailable (private mode, blocked storage). */
let memoryPref: ThemePref | null = null

export function getThemePref(): ThemePref {
  if (memoryPref) return memoryPref
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function resolveTheme(pref: ThemePref = getThemePref()): Theme {
  return pref === 'system' ? systemTheme() : pref
}

export function applyTheme() {
  const theme = resolveTheme()
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme])
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, pref)
  } catch {
    // Unavailable storage: the choice still applies for this visit.
    memoryPref = pref
  }
  const root = document.documentElement
  root.classList.add('theme-transition')
  applyTheme()
  window.setTimeout(() => root.classList.remove('theme-transition'), 450)
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  const mql = window.matchMedia('(prefers-color-scheme: light)')
  // Follow the OS live while the preference is "system".
  const onSystem = () => {
    if (getThemePref() === 'system') applyTheme()
    cb()
  }
  mql.addEventListener('change', onSystem)
  return () => {
    listeners.delete(cb)
    mql.removeEventListener('change', onSystem)
  }
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, getThemePref, () => 'system')
}
