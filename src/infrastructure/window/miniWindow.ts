import { BrowserWindow, nativeTheme, screen } from 'electron'
import path from 'node:path'

const MINI_WIDTH = 420
const MINI_HEIGHT = 560
// 下限来自离屏实测（scripts/probe-mini-resize.cjs + 真实渲染层复核）：
// 宽 260 时 .mini-head 那 48px 固定行高就开始竖向裁掉 3px，280 起才干净；
// 高 320 是 chrome 展开（最坏情况）后列表还剩 199px ≈ 4 行，再往下就看不到几条。
// 两个方向都各留了一档余量。
const MINI_MIN_WIDTH = 300
const MINI_MIN_HEIGHT = 320
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
    // 顶边那 12px 是 .mini-grab 的 drag 区，改不了尺寸；缩放从左/右/下三条边和下角抓。
    resizable: true,
    minWidth: MINI_MIN_WIDTH,
    minHeight: MINI_MIN_HEIGHT,
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
