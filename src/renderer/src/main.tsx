import './assets/main.css'

import { StrictMode, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import RegionPicker from './region-picker'
import { MiniBar } from './coder/MiniBar'
import { useSettingsStore } from './lib/store/settings'
import { applyTheme } from './lib/theme'

// Paint before the first render: zustand rehydrates from localStorage
// synchronously, so the persisted theme is available here (no dark flash).
applyTheme(useSettingsStore.getState().theme)

// Open in the mode the app was left in. The main window loads without a hash;
// the toolbar and the region pickers load their own routes and are left alone
if (!window.location.hash || window.location.hash === '#/') {
  const { lastMode } = useSettingsStore.getState()
  if (lastMode === 'conversation') window.location.hash = '#/conversation'
}

// The capture-region picker (a throwaway window per screen) and the 极简悬浮条
// must not run App's settings sync or shortcut registration, so they skip App
const ROOTS: Record<string, ComponentType> = {
  '#/region-picker': RegionPicker,
  '#/mini-bar': MiniBar
}
const Root = ROOTS[window.location.hash] ?? App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
