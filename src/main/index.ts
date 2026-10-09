import { app, nativeTheme } from 'electron'
import path from 'node:path'
import { acquireSingleInstanceLock } from './boot/singleInstanceLock'
import { resolveDataPaths } from './boot/appDataResolver'
import { setupNativeMenu } from './boot/nativeMenu'
import { openDatabase } from '../infrastructure/db/DatabaseConnection'
import { migrate, readSchemaVersion } from '../infrastructure/db/schemaMigration'
import { backupOnStartup } from '../infrastructure/db/repositoryBackup'
import { WorkItemSqlRepository } from '../infrastructure/db/workItemSqlRepository'
import { TagSqlRepository } from '../infrastructure/db/tagRepository'
import { AttachmentFileStore } from '../infrastructure/storage/attachmentFileStore'
import { attachAssetHandler, registerAssetSchemePrivileged } from '../infrastructure/media/localAssetProtocol'
import { registerWorkPlanIpc } from '../infrastructure/ipc/ipcRegistrar'
import { createMainWindow, focusExisting, type WindowHandles } from '../infrastructure/window/mainWindow'
import { closeMiniWindow, openMiniWindow, type MiniWindowHandles } from '../infrastructure/window/miniWindow'
import { createTray, type TrayController } from '../infrastructure/tray/trayController'
import { buildTrayImage } from '../infrastructure/tray/trayImage'
import { IS_MAC } from '../infrastructure/platform/osPlatform'
import { IpcChannel } from '../shared/ipcChannels'

registerAssetSchemePrivileged()

/**
 * 钉死中文，不跟系统语言飘。Electron 44 的 App 上没有 setLocale（只有 getLocale / getSystemLocale），
 * 唯一杠杆是 Chromium 的 --lang 开关，它决定原生日历、表单校验气泡等控件文案；
 * JS 侧日期一律显式传 'zh-CN' 或直接展示 ISO 字符串，不依赖运行时 locale。
 */
app.commandLine.appendSwitch('lang', 'zh-CN')

/**
 * 仅开发态：WP_THEME=dark|light 强制主题，用来把明暗两套都真机看一遍（打包版不生效）。
 * 生产走 prefers-color-scheme 自动跟随，界面里没有主题开关。
 */
if (!app.isPackaged && (process.env.WP_THEME === 'dark' || process.env.WP_THEME === 'light')) {
  nativeTheme.themeSource = process.env.WP_THEME
}

const handles: WindowHandles = { current: null }
const miniHandles: MiniWindowHandles = { current: null }
const lifecycle = { isQuitting: false }
let tray: TrayController | null = null

if (acquireSingleInstanceLock(() => showMainWindow())) {
  void app.whenReady().then(boot)
  app.on('before-quit', () => {
    lifecycle.isQuitting = true
    closeMiniWindow(miniHandles)
    tray?.dispose()
  })
  // 红钮（以及设置弹窗里的退出到托盘）走的都是 window.hide()，Mac 上唯一的唤回入口就是 Dock 图标。
  // activate 在每次应用被激活时都发（含 ⌘Tab 回前台），所以只在确实需要唤回时动手，
  // 否则会把正在用小窗的人踢回看板。
  if (IS_MAC) {
    app.on('activate', () => {
      if (miniHandles.current) return
      const window = handles.current
      if (window && window.isVisible() && !window.isMinimized()) return
      showMainWindow()
    })
  }
}

/** 回看板：关掉小窗、把主窗叫回前台，并让渲染层重拉一次数据。 */
function showMainWindow(): void {
  closeMiniWindow(miniHandles)
  focusExisting(handles)
  handles.current?.webContents.send(IpcChannel.WindowRefresh)
}

function toggleMini(enabled: boolean): void {
  if (enabled) {
    handles.current?.hide()
    openMiniWindow(miniHandles, {
      preloadFile: preloadFile(),
      devUrl: process.env.ELECTRON_RENDERER_URL
    })
    return
  }
  showMainWindow()
}

function boot(): void {
  const paths = resolveDataPaths()
  const db = openDatabase(paths.dbFile)
  migrate(db)
  console.log(`[boot] schema v${readSchemaVersion(db)} 数据目录 ${paths.root}`)

  const backupFile = backupOnStartup(paths, db)
  if (backupFile) console.log(`[boot] 已备份 ${path.basename(backupFile)}`)

  const services = {
    paths,
    db,
    items: new WorkItemSqlRepository(db),
    tags: new TagSqlRepository(db),
    files: new AttachmentFileStore(paths, db),
    hideMainWindow: () => {
      closeMiniWindow(miniHandles)
      handles.current?.hide()
    },
    mainWindow: () => handles.current,
    setMini: toggleMini,
    quitApp: () => {
      lifecycle.isQuitting = true
      app.quit()
    }
  }
  registerWorkPlanIpc(services)
  attachAssetHandler(paths)
  // 建菜单要在 services 之后：macOS 那份菜单栏的「收进托盘」直接复用 services.hideMainWindow
  setupNativeMenu({ appName: app.name, hideMainWindow: services.hideMainWindow })

  const window = createMainWindow(handles, preloadFile())
  window.on('close', (event) => {
    if (lifecycle.isQuitting) return
    event.preventDefault()
    window.hide()
  })

  tray = createTray(buildTrayImage(iconFile('tray.png'), iconFile('trayTemplate.png')), lifecycle, {
    show: showMainWindow,
    quit: () => services.quitApp()
  })
}

function preloadFile(): string {
  return path.join(__dirname, '../preload/index.js')
}

/** 打包后 resources 目录由 extraResources 拷进去，开发态直接读仓库里的 resources。 */
function iconFile(name: string): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, name)
    : path.join(__dirname, '../../resources', name)
}
