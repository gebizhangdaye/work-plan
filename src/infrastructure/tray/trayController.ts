import { Menu, Tray, app, type NativeImage } from 'electron'
import { IS_MAC } from '../platform/osPlatform'

export interface TrayController {
  dispose(): void
}

/**
 * 关窗进托盘、托盘菜单恢复或退出。
 * 退出前必须置 isQuitting，否则 close 事件又会被拦回托盘。
 */
export function createTray(
  icon: NativeImage | null,
  state: { isQuitting: boolean },
  actions: { show: () => void; quit: () => void }
): TrayController | null {
  if (!icon) return null

  // macOS 上不能 resize：那会把刚挂好的 @2x representation 拍平成一张位图
  const tray = new Tray(IS_MAC ? icon : icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('工作计划')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `今天 ${new Date().toLocaleDateString('zh-CN')}`, click: actions.show },
      { type: 'separator' },
      { label: `版本 ${app.getVersion()}`, enabled: false },
      {
        label: '退出',
        click: () => {
          state.isQuitting = true
          actions.quit()
        }
      }
    ])
  )
  if (IS_MAC) tray.setIgnoreDoubleClickEvents(true)
  // macOS 上带 context menu 的 NSStatusItem 会吃掉 mouse-down，这一行可能根本不触发；
  // 唤回窗口不靠它兜底 —— 上面菜单第一行就是同一个 actions.show。
  tray.on('click', actions.show)

  return { dispose: () => tray.destroy() }
}
