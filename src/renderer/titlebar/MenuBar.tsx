import { useEffect, useRef, useState } from 'react'
import { matchAppShortcut } from '@shared/menuShortcuts'
import { menuGroups, type MenuBarAction } from './menus'

const IS_MAC = window.workPlan.isMac
const MENU_GROUPS = menuGroups(IS_MAC)

/**
 * 标题栏里的菜单条：点字打开，打开后横向移入别的项直接切换；Esc / 点外面 / 窗口失焦关闭。
 * 动作交给主进程按发起窗口执行，只有 about 留在渲染层（打开设置弹窗的关于分区）。
 */
export function MenuBar({ onAbout }: { onAbout: () => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const barRef = useRef<HTMLElement | null>(null)
  /** 移入切换过的那一项，紧跟着的 click 不能再当成「点同一个项 = 关闭」。 */
  const hoverSwitched = useRef<number | null>(null)

  function run(action: MenuBarAction): void {
    setOpenIndex(null)
    if (action === 'about') onAbout()
    else void window.workPlan.runMenuAction(action)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpenIndex(null)
        return
      }
      const action = matchAppShortcut(event, IS_MAC)
      if (!action) return
      event.preventDefault()
      void window.workPlan.runMenuAction(action)
    }
    function onPointerDown(event: MouseEvent): void {
      if (!barRef.current?.contains(event.target as Node)) setOpenIndex(null)
    }
    function close(): void {
      setOpenIndex(null)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('blur', close)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('blur', close)
    }
  }, [])

  return (
    <nav className="menu-bar" ref={barRef} aria-label="主菜单">
      {MENU_GROUPS.map((group, index) => (
        <div className="menu-slot" key={group.label}>
          <button
            type="button"
            className="menu-bar-item"
            aria-expanded={openIndex === index}
            onClick={() => {
              if (hoverSwitched.current === index) {
                hoverSwitched.current = null
                return
              }
              setOpenIndex(openIndex === index ? null : index)
            }}
            onMouseEnter={() => {
              if (openIndex === null || openIndex === index) return
              hoverSwitched.current = index
              setOpenIndex(index)
            }}
          >
            {group.label}
          </button>
          {openIndex === index ? (
            <div className="menu-pop" role="menu">
              {group.entries.map((entry, entryIndex) =>
                entry.kind === 'sep' ? (
                  <hr className="menu-sep" key={`sep-${entryIndex}`} />
                ) : (
                  <button
                    key={entry.label}
                    type="button"
                    role="menuitem"
                    className="menu-row"
                    onClick={() => run(entry.action)}
                  >
                    <span>{entry.label}</span>
                    {entry.shortcut ? <kbd>{entry.shortcut}</kbd> : null}
                  </button>
                )
              )}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  )
}
