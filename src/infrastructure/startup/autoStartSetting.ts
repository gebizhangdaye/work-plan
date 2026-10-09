import { app } from 'electron'
import { IS_MAC } from '../platform/osPlatform'

/**
 * Windows：开机自启写 HKCU 的 Run 键，不需要管理员。portable 版 process.execPath 指向临时
 * 解包目录，必须用 electron-builder 注入的 PORTABLE_EXECUTABLE_FILE 才是真实 exe 路径。
 */
function executablePath(): string {
  return process.env.PORTABLE_EXECUTABLE_FILE ?? process.execPath
}

export function readAutoStart(): boolean {
  return app.getLoginItemSettings().openAtLogin
}

export function applyAutoStart(enabled: boolean): boolean {
  // macOS 只认 openAtLogin，path / args / name 传了也被忽略，挂的就是当前这个 .app
  if (IS_MAC) app.setLoginItemSettings({ openAtLogin: enabled })
  else app.setLoginItemSettings({ openAtLogin: enabled, path: executablePath(), args: [], name: '工作计划' })
  return readAutoStart()
}

export function autoStartTarget(): string {
  return executablePath()
}
