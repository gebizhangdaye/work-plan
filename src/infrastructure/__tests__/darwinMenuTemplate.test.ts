import { describe, expect, it, vi } from 'vitest'
import type { MenuItemConstructorOptions } from 'electron'
import { MENU_SHORTCUTS } from '../../shared/menuShortcuts'
import { buildDarwinMenuTemplate } from '../menu/darwinMenuTemplate'

const APP_NAME = '工作计划'

function build() {
  const hideMainWindow = vi.fn()
  return { hideMainWindow, template: buildDarwinMenuTemplate({ appName: APP_NAME, hideMainWindow }) }
}

/** 只摊开一层：这份模板就是「子菜单 → 条目」两级。submenu 的类型还允许是 Menu 实例，这里只会是数组。 */
function leaves(template: MenuItemConstructorOptions[]): MenuItemConstructorOptions[] {
  return template.flatMap((top) => (Array.isArray(top.submenu) ? top.submenu : []))
}

function labelled(items: MenuItemConstructorOptions[]): MenuItemConstructorOptions[] {
  return items.filter((item) => item.type !== 'separator')
}

describe('macOS 原生应用菜单', () => {
  it('第一项是应用菜单，label 是应用名', () => {
    const { template } = build()
    expect(template[0]?.label).toBe(APP_NAME)
  })

  it('每个条目都自带中文 label，不留 role 的默认英文冒出来', () => {
    const { template } = build()
    for (const top of template) expect(top.label, '子菜单标题').toBeTruthy()
    for (const item of labelled(leaves(template))) {
      expect(item.label, JSON.stringify(item.role)).toBeTruthy()
      // 验收过的不变量：界面里不许出现 File / Edit / Undo / Toggle Developer Tools 这类英文项
      expect(item.label, `label=${item.label}`).not.toMatch(/[A-Za-z]/)
    }
  })

  it('同一份菜单里 accelerator 不重复，否则会互相遮蔽', () => {
    const keys = labelled(leaves(build().template))
      .map((item) => item.accelerator)
      .filter((value): value is string => Boolean(value))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('⌘Q 走原生 quit，标签是本应用名', () => {
    const quit = labelled(leaves(build().template)).find((item) => item.role === 'quit')
    expect(quit?.label).toBe(`退出${APP_NAME}`)
    expect(quit?.accelerator).toBe(MENU_SHORTCUTS.quit.accelerator)
  })

  it('对得上标题栏的动作，accelerator 与那张单一来源的表一致', () => {
    const { template } = build()
    const byLabel = new Map(labelled(leaves(template)).map((item) => [item.label, item.accelerator]))
    const pairs: [string, keyof typeof MENU_SHORTCUTS][] = [
      ['撤销', 'undo'],
      ['重做', 'redo'],
      ['剪切', 'cut'],
      ['复制', 'copy'],
      ['粘贴', 'paste'],
      ['全选', 'selectAll'],
      ['重新加载', 'reload'],
      ['强制重新加载', 'forceReload'],
      ['实际大小', 'resetZoom'],
      ['放大', 'zoomIn'],
      ['缩小', 'zoomOut'],
      ['开发者工具', 'toggleDevTools'],
      ['进入全屏', 'toggleFullScreen'],
      ['最小化', 'minimize']
    ]
    for (const [label, id] of pairs) {
      expect(byLabel.get(label), label).toBe(MENU_SHORTCUTS[id].accelerator)
    }
  })

  it('收进托盘那一项打到 hideMainWindow，不去抢 ⌘W 的语义', () => {
    const { template, hideMainWindow } = build()
    const tray = labelled(leaves(template)).find((item) => item.label === '收进托盘')
    expect(tray?.accelerator).toBe('Alt+Cmd+M')
    // 模板里这一项的 click 不读参数，三个占位只是为了过类型（前两个是类实例，只能 never 顶过去）
    tray?.click?.({} as never, {} as never, {})
    expect(hideMainWindow).toHaveBeenCalledTimes(1)
  })

  it('没有 ⌘W：红钮已经是关闭到托盘，⌘W 再挂一次只会让 Mac 用户困惑', () => {
    const { template } = build()
    expect(labelled(leaves(template)).some((item) => item.accelerator === 'Cmd+W')).toBe(false)
    expect(labelled(leaves(template)).some((item) => item.role === 'close')).toBe(false)
  })
})
