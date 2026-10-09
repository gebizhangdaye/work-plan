import type { MenuActionId } from '@shared/workPlanApi'
import { shortcutLabel } from '@shared/menuShortcuts'

/** about 只在渲染层生效（打开设置弹窗的「关于」分区），不下发给主进程。 */
export type MenuBarAction = MenuActionId | 'about'

export interface MenuRow {
  kind?: 'row'
  label: string
  shortcut?: string
  action: MenuBarAction
}

export interface MenuSeparator {
  kind: 'sep'
}

export type MenuEntry = MenuRow | MenuSeparator

export interface MenuGroup {
  label: string
  entries: MenuEntry[]
}

/**
 * 菜单条的内容按平台出一份：动作集合两边完全一致，只有快捷键标签的写法不同
 * （Ctrl+… / ⌘…），标签取自 src/shared/menuShortcuts 那一处定义，不与原生菜单各写一份。
 */
export function menuGroups(isMac: boolean): MenuGroup[] {
  const key = (id: MenuActionId): string => shortcutLabel(id, isMac)
  return [
    {
      label: '文件',
      entries: [
        // macOS 上 ⌘M 是最小化到 Dock（红钮才是收进托盘），标签别再写「到托盘」
        { label: isMac ? '最小化' : '最小化到托盘', shortcut: key('minimize'), action: 'minimize' },
        { kind: 'sep' },
        { label: '退出工作计划', shortcut: key('quit'), action: 'quit' }
      ]
    },
    {
      label: '编辑',
      entries: [
        { label: '撤销', shortcut: key('undo'), action: 'undo' },
        { label: '重做', shortcut: key('redo'), action: 'redo' },
        { kind: 'sep' },
        { label: '剪切', shortcut: key('cut'), action: 'cut' },
        { label: '复制', shortcut: key('copy'), action: 'copy' },
        { label: '粘贴', shortcut: key('paste'), action: 'paste' },
        { label: '全选', shortcut: key('selectAll'), action: 'selectAll' }
      ]
    },
    {
      label: '视图',
      entries: [
        { label: '重新加载', shortcut: key('reload'), action: 'reload' },
        { label: '强制重新加载', shortcut: key('forceReload'), action: 'forceReload' },
        { kind: 'sep' },
        { label: '实际大小', shortcut: key('resetZoom'), action: 'resetZoom' },
        { label: '放大', shortcut: key('zoomIn'), action: 'zoomIn' },
        { label: '缩小', shortcut: key('zoomOut'), action: 'zoomOut' },
        { kind: 'sep' },
        { label: '开发者工具', shortcut: key('toggleDevTools'), action: 'toggleDevTools' },
        { label: '全屏', shortcut: key('toggleFullScreen'), action: 'toggleFullScreen' }
      ]
    },
    {
      label: '帮助',
      entries: [{ label: '关于工作计划', action: 'about' }]
    }
  ]
}
