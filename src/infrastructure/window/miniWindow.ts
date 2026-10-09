import { BrowserWindow, nativeTheme, screen } from 'electron'
import path from 'node:path'

const MINI_WIDTH = 420
const MINI_HEIGHT = 560
const MARGIN = 24

export interface MiniWindowHandles {
  current: BrowserWindow | null
}

export interface MiniWindowOptions {
  preloadFile: string
  devUrl?: string
}

/**
 * 小窗必须是独立的无边框窗口：Electron 的 frame 只能在创建时决定，
 * 想靠"缩小主窗口"去做小窗就永远甩不掉系统标题栏。
 * 打开小窗时主窗隐藏，两者不同时存活，省掉跨窗口数据同步。
 */
export function openMiniWindow(handles: MiniWindowHandles, options: MiniWindowOptions): BrowserWindow {
  if (handles.current && !handles.current.isDestroyed()) return handles.current

  const window = new BrowserWindow({
    ...restingPosition(),
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    show: false,
    frame: false,
    roundedCorners: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    title: '工作计划',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1b1b1b' : '#f3f3f3',
    webPreferences: {
      preload: options.preloadFile,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  })

  handles.current = window
  window.once('ready-to-show', () => {
    window.setAlwaysOnTop(true, 'floating')
    window.show()
  })
  window.on('closed', () => {
    handles.current = null
  })

  if (options.devUrl) void window.loadURL(`${options.devUrl}?view=mini`)
  else void window.loadFile(path.join(__dirname, '../renderer/index.html'), { query: { view: 'mini' } })

  return window
}

export function closeMiniWindow(handles: MiniWindowHandles): void {
  const window = handles.current
  if (window && !window.isDestroyed()) window.destroy()
  handles.current = null
}

function restingPosition(): { x: number; y: number } {
  const area = screen.getPrimaryDisplay().workArea
  return {
    x: area.x + area.width - MINI_WIDTH - MARGIN,
    y: area.y + MARGIN
  }
}
