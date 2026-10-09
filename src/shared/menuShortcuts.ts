import type { MenuActionId } from './workPlanApi'

/**
 * 快捷键的唯一定义处：标题栏菜单条显示的标签、macOS 原生应用菜单的 accelerator、
 * Windows 上渲染层自己兜的那一份，三处都从这里出，不许各自漂移。
 *
 * 这个文件刻意不出现 KeyboardEvent 之类的 DOM 类型，也不 import 任何 electron 值：
 * 它同时被 tsconfig.web（渲染层）和 tsconfig.node（主进程相对导入）检查，
 * 且必须能在 vitest 的 node 环境里直接断言。按键归一化留在 src/renderer/titlebar/menus.ts。
 */
export interface ShortcutSpec {
  /** 渲染层 <kbd> 里 Windows 下的显示串，也是 docs/manual-acceptance.md 验收过的那一份 */
  readonly win: string
  /** 渲染层 <kbd> 里 macOS 下的显示串（⌘ 系列符号） */
  readonly mac: string
  /**
   * 交给 macOS 原生菜单的 accelerator（Electron 格式）。
   * macOS 下按键由原生菜单接，渲染层不再兜，所以这里不需要 Windows 格式的那一列。
   */
  readonly accelerator: string
}

export const MENU_SHORTCUTS: Record<MenuActionId, ShortcutSpec> = {
  minimize: { win: 'Ctrl+M', mac: '⌘M', accelerator: 'Cmd+M' },
  quit: { win: 'Ctrl+Q', mac: '⌘Q', accelerator: 'Cmd+Q' },
  undo: { win: 'Ctrl+Z', mac: '⌘Z', accelerator: 'Cmd+Z' },
  redo: { win: 'Ctrl+Y', mac: '⇧⌘Z', accelerator: 'Shift+Cmd+Z' },
  cut: { win: 'Ctrl+X', mac: '⌘X', accelerator: 'Cmd+X' },
  copy: { win: 'Ctrl+C', mac: '⌘C', accelerator: 'Cmd+C' },
  paste: { win: 'Ctrl+V', mac: '⌘V', accelerator: 'Cmd+V' },
  selectAll: { win: 'Ctrl+A', mac: '⌘A', accelerator: 'Cmd+A' },
  reload: { win: 'Ctrl+R', mac: '⌘R', accelerator: 'Cmd+R' },
  forceReload: { win: 'F5', mac: '⇧⌘R', accelerator: 'Shift+Cmd+R' },
  resetZoom: { win: 'Ctrl+0', mac: '⌘0', accelerator: 'Cmd+0' },
  zoomIn: { win: 'Ctrl+=', mac: '⌘+', accelerator: 'Cmd+Plus' },
  zoomOut: { win: 'Ctrl+-', mac: '⌘-', accelerator: 'Cmd+-' },
  toggleDevTools: { win: 'Ctrl+Shift+I', mac: '⌥⌘I', accelerator: 'Alt+Cmd+I' },
  toggleFullScreen: { win: 'F11', mac: '⌃⌘F', accelerator: 'Ctrl+Cmd+F' }
}

export function shortcutLabel(id: MenuActionId, isMac: boolean): string {
  const spec = MENU_SHORTCUTS[id]
  return isMac ? spec.mac : spec.win
}

/**
 * Windows 上由标题栏菜单自己兜的那一份（macOS 不用这张表，整条让给原生菜单，见 matchAppShortcut）。
 * Ctrl+C/V/X/Z/A 故意不在这里，那是输入框里 Blink 的本职，抢过来只会让选中和撤销的行为
 * 和浏览器不一致。f12 是开发者工具的别名键，界面上不显示，允许和标签不一致。
 */
export const WIN_APP_KEYS: Record<string, MenuActionId> = {
  'ctrl+m': 'minimize',
  'ctrl+q': 'quit',
  'ctrl+r': 'reload',
  f5: 'forceReload',
  'ctrl+0': 'resetZoom',
  'ctrl+=': 'zoomIn',
  'ctrl+-': 'zoomOut',
  'ctrl+shift+i': 'toggleDevTools',
  f12: 'toggleDevTools',
  f11: 'toggleFullScreen'
}

/** 归一化一次按键只要这四个字段；DOM 的 KeyboardEvent 结构上就满足，所以这里不引 DOM 类型。 */
export interface KeyState {
  readonly key: string
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly metaKey: boolean
}

/**
 * Windows 上由标题栏菜单自己兜应用级快捷键；macOS 整个让给原生应用菜单（那一份每项都带
 * accelerator），这里再响一次就是同一动作双触发。
 */
export function matchAppShortcut(event: KeyState, isMac: boolean): MenuActionId | null {
  if (isMac) return null
  const keys: string[] = []
  if (event.ctrlKey) keys.push('ctrl')
  if (event.shiftKey) keys.push('shift')
  keys.push(event.key.toLowerCase())
  return WIN_APP_KEYS[keys.join('+')] ?? null
}
