import { join } from 'node:path'
import { BrowserWindow, ipcMain, screen } from 'electron'
import { is } from '@electron-toolkit/utils'

/** Mirrors `.overlay-toolbar` in main.css: `p-2` around `size-7` buttons with `gap-0.5` */
const BAR_PADDING = 8
const BUTTON_SIZE = 28
const BUTTON_GAP = 2
/** Each mode's own buttons and 收起 come first, so a narrowed toolbar always keeps them */
const MIN_TOOLBAR_BUTTONS = 5
const TOOLBAR_HEIGHT = 44
const TOOLBAR_INSET = 4
/** Mirrors the renderer's default opacity setting, until the renderer syncs the real one */
const DEFAULT_OPACITY = 0.8

let toolbarWindow: BrowserWindow | null = null
let ownerWindow: BrowserWindow | null = null
/** Whether the renderer wants the toolbar on screen (main page + enabled in settings) */
let isToolbarWanted = false
/** The 极简悬浮条 stands in for both windows; nothing may bring the toolbar back meanwhile */
let isToolbarSuppressed = false
let toolbarOpacity = DEFAULT_OPACITY
/** How many buttons the mode on screen has, reported by the toolbar's renderer */
let actionCount = 17
/**
 * How many buttons the user narrowed the toolbar to; null for all of them.
 * The width is derived from it, never read back off the window: Windows
 * encloses in both directions of the DIP <-> pixel conversion, so at fractional
 * scaling a getBounds() -> setBounds() round trip grows the window a pixel, and
 * syncToolbarBounds runs on every move event of a main window drag.
 */
let buttonCount: number | null = null

/** Exactly whole buttons: no sliver of one, and no empty strip after the last */
function toolbarWidth(): number {
  const count = Math.min(buttonCount ?? actionCount, actionCount)
  return BAR_PADDING * 2 + count * BUTTON_SIZE + (count - 1) * BUTTON_GAP
}

// The two modes have different buttons, so the width follows the page on screen
ipcMain.on('toolbar:action-count', (event, count: number) => {
  if (!toolbarWindow || event.sender !== toolbarWindow.webContents) return
  actionCount = count
  syncToolbarBounds()
})

/**
 * Click-through alternative to the global shortcuts: a small always-on-top
 * window of buttons, glued above the main window and hidden along with it.
 */
export function createToolbarWindow(parent: BrowserWindow): void {
  toolbarWindow = new BrowserWindow({
    width: toolbarWidth(),
    height: TOOLBAR_HEIGHT,
    frame: false,
    transparent: true,
    hasShadow: false,
    // Native resize toggling breaks transparency on Windows; renderer handles own resizing.
    resizable: false,
    // Clicking a button must never pull focus away from what the user is doing
    focusable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    // Over other apps' fullscreen Spaces, like the main window (see main-window.ts)
    ...(process.platform === 'darwin' && { type: 'panel' }),
    show: false,
    parent,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // Hover dwell runs on setTimeout in this renderer; it must not be
      // throttled while the window is hidden/occluded (see main-window.ts).
      backgroundThrottling: false
    }
  })
  ownerWindow = parent

  toolbarWindow.setMenuBarVisibility(false)
  toolbarWindow.setOpacity(toolbarOpacity)
  toolbarWindow.setAlwaysOnTop(true, 'screen-saver', 2)
  toolbarWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: true
  })
  toolbarWindow.setContentProtection(true)

  parent.on('move', syncToolbarBounds)
  parent.on('resize', syncToolbarBounds)
  parent.on('show', showToolbar)
  parent.on('hide', hideToolbar)
  parent.on('closed', () => {
    if (toolbarWindow && !toolbarWindow.isDestroyed()) toolbarWindow.close()
    toolbarWindow = null
    ownerWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    toolbarWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/toolbar`)
  } else {
    toolbarWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/toolbar' })
  }
}

/** Park the toolbar right above the main window, kept inside the current display */
function syncToolbarBounds(): void {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) return
  if (!ownerWindow || ownerWindow.isDestroyed()) return

  const mainBounds = ownerWindow.getBounds()
  const workArea = screen.getDisplayMatching(mainBounds).workArea
  const width = Math.min(toolbarWidth(), workArea.width)
  const height = Math.min(TOOLBAR_HEIGHT, workArea.height)
  toolbarWindow.setBounds({
    x: Math.min(Math.max(mainBounds.x, workArea.x), workArea.x + workArea.width - width),
    y: Math.max(workArea.y, mainBounds.y - height - TOOLBAR_INSET),
    width,
    height
  })
}

/** Show the toolbar only if the renderer asked for it and the main window is on screen */
export function showToolbar(): void {
  if (!isToolbarWanted || isToolbarSuppressed) return
  if (!toolbarWindow || toolbarWindow.isDestroyed()) return
  if (!ownerWindow || ownerWindow.isDestroyed() || !ownerWindow.isVisible()) return

  syncToolbarBounds()
  toolbarWindow.showInactive()
}

export function hideToolbar(): void {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) return
  toolbarWindow.hide()
}

/**
 * A drag of the toolbar's right edge to `width`: the toolbar keeps the nearest
 * whole number of buttons, between its first few and all of them, and stays
 * glued to the main window's left edge. False for any other window.
 */
export function resizeToolbar(window: BrowserWindow, width: number): boolean {
  if (window !== toolbarWindow) return false
  const fits = Math.round((width - BAR_PADDING * 2 + BUTTON_GAP) / (BUTTON_SIZE + BUTTON_GAP))
  const count = Math.min(actionCount, Math.max(MIN_TOOLBAR_BUTTONS, fits))
  // All of them: a mode with more buttons shows all of its own too
  buttonCount = count === actionCount ? null : count
  syncToolbarBounds()
  return true
}

/**
 * The renderer owns whether the toolbar belongs on screen (main page + the
 * `showOverlayToolbar` setting); main only decides when it can actually show.
 */
export function setToolbarWanted(wanted: boolean): void {
  isToolbarWanted = wanted
  if (wanted) {
    showToolbar()
  } else {
    hideToolbar()
  }
}

/**
 * Keep the toolbar off screen while the 极简悬浮条 is up. On Windows the main
 * window is only soft-hidden then, which still counts as visible, so the
 * visibility of the main window alone cannot keep it away.
 */
export function setToolbarSuppressed(suppressed: boolean): void {
  isToolbarSuppressed = suppressed
  if (suppressed) {
    hideToolbar()
  } else {
    showToolbar()
  }
}

/**
 * Send a message to the toolbar's own renderer. Its store is a separate copy
 * of the main window's, so anything it displays has to be pushed explicitly.
 */
export function sendToToolbar(channel: string, payload: unknown): void {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) return
  toolbarWindow.webContents.send(channel, payload)
}

/**
 * Keep the toolbar as translucent as the main window. The main window applies
 * opacity to its body via CSS; the toolbar is nothing but that bar, so the same
 * value is applied to the whole window.
 */
export function setToolbarOpacity(opacity: number): void {
  toolbarOpacity = opacity
  if (!toolbarWindow || toolbarWindow.isDestroyed()) return
  toolbarWindow.setOpacity(opacity)
}

/**
 * The toolbar lives in its own renderer, so it never sees the settings store
 * updates made in the main window; push the ones it needs over IPC instead.
 */
export function syncToolbarSettings(payload: {
  hoverDelay: number
  theme: 'dark' | 'light'
}): void {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) return
  toolbarWindow.webContents.send('sync-toolbar-settings', payload)
}

/** Reclaim the top spot alongside the main window, without ever revealing a hidden toolbar */
export function reassertToolbarTopMost(level: number, aggressive: boolean): void {
  if (!toolbarWindow || toolbarWindow.isDestroyed() || !toolbarWindow.isVisible()) return
  toolbarWindow.setAlwaysOnTop(true, 'screen-saver', level)
  if (aggressive) toolbarWindow.moveTop()
}
