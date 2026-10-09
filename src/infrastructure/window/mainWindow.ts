import { BrowserWindow, app, nativeTheme, shell } from 'electron'
import path from 'node:path'
import { IpcChannel } from '../../shared/ipcChannels'
import { IS_MAC } from '../platform/osPlatform'

const MIN_WIDTH = 980
const MIN_HEIGHT = 620

/**
 * 红绿灯嵌进那条 40px 自绘标题栏：垂直居中取 y = (40 − 14) / 2 = 13，
 * x 对齐现有的 12px 左内边距，别让三颗灯粘在屏幕角上。渲染层的 .titlebar-mac 左内边距是它的配套值。
 */
const MAC_TRAFFIC_LIGHT = { x: 12, y: 13 }

export interface WindowHandles {
  current: BrowserWindow | null
}

/**
 * 自定义高标题栏（logo + 应用名 + 窗口按钮）取代系统标题栏，和现在主流桌面程序一致。
 * 无边框后 Windows 只剩看不见的调边，原生菜单栏不再显示，所以标题栏里的 drag 区必须几何恒定。
 * macOS 仍走 frameless，但叠一个 hiddenInset 把系统红绿灯放回来（trafficLightPosition 的文档口径
 * 就是「frameless windows」），窗口按钮那一组由渲染层整个不渲染。
 */
export function createMainWindow(handles: WindowHandles, preloadFile: string): BrowserWindow {
  const window = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    frame: false,
    ...(IS_MAC ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: MAC_TRAFFIC_LIGHT } : {}),
    title: '工作计划',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1b1b1b' : '#f3f3f3',
    webPreferences: {
      preload: preloadFile,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // 中文正文被英文拼写检查划红波浪线没有意义
      spellcheck: false
    }
  })

  handles.current = window
  window.once('ready-to-show', () => window.show())
  window.on('closed', () => {
    handles.current = null
  })
  // 没有原生标题栏可看状态，最大化/还原的图标只能由主进程推给渲染层
  window.on('maximize', () => window.webContents.send(IpcChannel.WindowMaximizeChanged, true))
  window.on('unmaximize', () => window.webContents.send(IpcChannel.WindowMaximizeChanged, false))
  if (IS_MAC) {
    // 绿钮进全屏不走 maximize/unmaximize，补发一次真实读数而不是猜语义，
    // 这样 WindowMaximizeChanged 的契约（一个布尔 = 是否最大化）不用改。
    window.on('enter-full-screen', () =>
      window.webContents.send(IpcChannel.WindowMaximizeChanged, window.isMaximized())
    )
    window.on('leave-full-screen', () =>
      window.webContents.send(IpcChannel.WindowMaximizeChanged, window.isMaximized())
    )
  }

  // 正文里可能出现外部链接，交给系统浏览器而不是开新窗口
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  const devServer = process.env.ELECTRON_RENDERER_URL
  if (devServer) void window.loadURL(devServer)
  else void window.loadFile(path.join(__dirname, '../renderer/index.html'))

  return window
}

export function focusExisting(handles: WindowHandles): void {
  const window = handles.current
  if (!window) return
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
  // macOS 从 Dock 唤回时只 focus 窗口可能仍压在 Finder 后面，得把整个应用提到前台
  if (IS_MAC) app.focus({ steal: true })
}
