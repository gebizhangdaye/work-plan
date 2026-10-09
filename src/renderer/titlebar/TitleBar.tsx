import { useEffect, useState } from 'react'
import { Copy, Minus, Square, X } from '@phosphor-icons/react'
import logo from '../../../resources/icon.png'
import type { SettingsSection } from '../settings/SettingsDialog'
import { MenuBar } from './MenuBar'

/**
 * 自定义高标题栏：logo + 应用名 + 今天 + 菜单条，右侧是最小化 / 最大化还原 / 关闭到托盘。
 * 整条是 drag 区且几何恒定（小窗抖动的教训就是 drag 区跟着布局变），菜单与按钮各自 no-drag。
 * macOS 上红绿灯嵌在同一条的左上角，三个自绘按钮整个不渲染（缩放到全屏/还原由绿钮承担），
 * 只把左内边距让给灯组；Windows 侧维持无边框 + 自绘按钮。
 * 无边框后没有原生标题栏可读状态，最大化按钮的图标只能靠主进程推 maximizeChanged。
 */
export function TitleBar({
  today,
  onOpenSettings
}: {
  today: string
  onOpenSettings: (section: SettingsSection) => void
}) {
  const [maximized, setMaximized] = useState(false)
  const isMac = window.workPlan.isMac

  useEffect(() => {
    void window.workPlan.isMaximized().then(setMaximized)
    window.workPlan.onWindowMaximizeChanged(setMaximized)
  }, [])

  return (
    <header className={isMac ? 'titlebar titlebar-mac' : 'titlebar'}>
      <img className="brand-mark" src={logo} alt="" width={18} height={18} />
      <span className="titlebar-name">工作计划</span>
      <time className="titlebar-date">{today}</time>
      <MenuBar onAbout={() => onOpenSettings('about')} />
      <span className="titlebar-spacer" />
      {isMac ? null : (
        <div className="caption">
          <button
            type="button"
            className="caption-btn"
            onClick={() => void window.workPlan.minimizeWindow()}
            title="最小化"
            aria-label="最小化"
          >
            <Minus size={14} weight="bold" />
          </button>
          <button
            type="button"
            className="caption-btn"
            onClick={() => void window.workPlan.toggleMaximize()}
            title={maximized ? '向下还原' : '最大化'}
            aria-label={maximized ? '向下还原' : '最大化'}
          >
            {maximized ? <Copy size={13} weight="bold" /> : <Square size={12} weight="bold" />}
          </button>
          <button
            type="button"
            className="caption-btn caption-close"
            onClick={() => void window.workPlan.hideToTray()}
            title="关闭到托盘"
            aria-label="关闭到托盘"
          >
            <X size={15} weight="bold" />
          </button>
        </div>
      )}
    </header>
  )
}
