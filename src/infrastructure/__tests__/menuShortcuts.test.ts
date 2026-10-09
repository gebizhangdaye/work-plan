import { describe, expect, it } from 'vitest'
import type { MenuActionId } from '../../shared/workPlanApi'
import { MENU_SHORTCUTS, WIN_APP_KEYS, matchAppShortcut, shortcutLabel, type KeyState } from '../../shared/menuShortcuts'

const ALL_ACTIONS = Object.keys(MENU_SHORTCUTS) as MenuActionId[]

/** 把 'ctrl+shift+i' 这种表里的串还原成一次按键。 */
function press(token: string, over: Partial<KeyState> = {}): KeyState {
  return {
    key: token.split('+').pop() ?? token,
    ctrlKey: token.includes('ctrl'),
    shiftKey: token.includes('shift'),
    metaKey: false,
    ...over
  }
}

describe('快捷键表', () => {
  it('每个动作两边都有标签：Windows 只出 Ctrl/F 键，macOS 只出 ⌘ 系列', () => {
    for (const id of ALL_ACTIONS) {
      expect(shortcutLabel(id, false), id).toMatch(/^(Ctrl\+|F\d)/)
      expect(shortcutLabel(id, false), id).not.toContain('⌘')
      expect(shortcutLabel(id, true), id).toContain('⌘')
      expect(shortcutLabel(id, true), id).not.toMatch(/Ctrl|F\d/)
    }
  })

  it('macOS 的修饰键符号都是能渲染的字形，且 ⌘ ⌥ ⌃ ⇧ 全都用上了', () => {
    // ⌘ U+2318 / ⌥ U+2325 / ⌃ U+2303 / ⇧ U+21E7 —— Cascadia Mono 里查不到这几个，
    // 所以 .menu-row kbd 的字族必须把 ui-monospace / SF Mono 排在前面（app.css 里那条注释）
    const symbols = ['⌘', '⌥', '⌃', '⇧']
    const used = new Set(ALL_ACTIONS.flatMap((id) => [...MENU_SHORTCUTS[id].mac]).filter((c) => symbols.includes(c)))
    expect([...used].sort()).toEqual(symbols.sort())
  })

  it('凡是声明成应用级的动作，菜单条上显示的那一串在 Windows 上确实能按响', () => {
    // 反向不成立也无所谓：表里允许有界面上不显示的别名键（f12 也是开发者工具）
    for (const id of new Set(Object.values(WIN_APP_KEYS))) {
      const token = shortcutLabel(id, false).toLowerCase()
      expect(WIN_APP_KEYS[token], `${id} 显示的是 ${token}`).toBe(id)
    }
  })
})

describe('Windows 兜的那一份应用级快捷键', () => {
  it('表里每一串都能按响，并且落到对的动作', () => {
    for (const [token, id] of Object.entries(WIN_APP_KEYS)) {
      expect(matchAppShortcut(press(token), false), token).toBe(id)
    }
  })

  it('剪贴板那几个键不抢，交回输入框里的 Blink', () => {
    for (const key of ['c', 'v', 'x', 'z', 'a']) {
      expect(matchAppShortcut(press('ctrl', { key }), false), key).toBeNull()
    }
  })

  it('macOS 上整个不接：原生菜单每一项都带 accelerator，这里再响一次就是双触发', () => {
    for (const token of Object.keys(WIN_APP_KEYS)) {
      expect(matchAppShortcut(press(token, { metaKey: true }), true), token).toBeNull()
    }
  })

  it('Windows 上不再把 ⌘ 当成 Ctrl（改之前两个键被压成同一个 token）', () => {
    expect(matchAppShortcut({ key: 'q', ctrlKey: false, shiftKey: false, metaKey: true }, false)).toBeNull()
  })
})
