import { app } from 'electron'
import type { BrowserWindow } from 'electron'
import type { MenuActionId } from '../../shared/workPlanApi'

type Command = (window: BrowserWindow) => void

/**
 * 菜单动作全部按「发起 IPC 的那个窗口」执行，主窗和小窗共用同一份菜单。
 * 用查表而不是 switch：项多且每条都很短，switch 会把复杂度顶到门禁线以上。
 */
const COMMANDS: Record<MenuActionId, Command> = {
  minimize: (window) => window.minimize(),
  quit: () => app.quit(),
  undo: (window) => window.webContents.undo(),
  redo: (window) => window.webContents.redo(),
  cut: (window) => window.webContents.cut(),
  copy: (window) => window.webContents.copy(),
  paste: (window) => window.webContents.paste(),
  selectAll: (window) => window.webContents.selectAll(),
  reload: (window) => window.webContents.reload(),
  forceReload: (window) => window.webContents.reloadIgnoringCache(),
  resetZoom: (window) => window.webContents.setZoomLevel(0),
  zoomIn: (window) => stepZoom(window, 0.5),
  zoomOut: (window) => stepZoom(window, -0.5),
  toggleDevTools: (window) => window.webContents.toggleDevTools(),
  toggleFullScreen: (window) => window.setFullScreen(!window.isFullScreen())
}

export function runMenuAction(window: BrowserWindow, id: MenuActionId): void {
  COMMANDS[id](window)
}

function stepZoom(window: BrowserWindow, step: number): void {
  window.webContents.setZoomLevel(Math.round((window.webContents.getZoomLevel() + step) * 100) / 100)
}
