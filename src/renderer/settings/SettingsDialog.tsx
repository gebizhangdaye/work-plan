import { useEffect } from 'react'
import { X } from '@phosphor-icons/react'
import type { ExportFormat } from '@shared/workPlanApi'
import { AboutSection, DataSection, ExportSection } from './SettingsSections'

export type SettingsSection = 'export' | 'data' | 'about'

const SECTIONS: { key: SettingsSection; label: string }[] = [
  { key: 'export', label: '导出' },
  { key: 'data', label: '数据与运行' },
  { key: 'about', label: '关于' }
]

/**
 * 设置是一个居中模态弹窗，左侧菜单分区。当前分区由外面控制，
 * 这样标题栏「帮助 → 关于工作计划」能直接跳到关于，而不是再开第二套弹窗。
 * 导出完就关窗，让结果提示回到看板上。
 */
export function SettingsDialog({
  section,
  onSelectSection,
  onExport,
  onClose
}: {
  section: SettingsSection
  onSelectSection: (section: SettingsSection) => void
  onExport: (format: ExportFormat) => void
  onClose: () => void
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function pick(format: ExportFormat): void {
    onExport(format)
    onClose()
  }

  const active = SECTIONS.find((item) => item.key === section)

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal settings-modal" role="dialog" aria-modal="true" aria-label="设置">
        <nav className="settings-nav" aria-label="设置分区">
          <h2>设置</h2>
          {SECTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={item.key === section}
              onClick={() => onSelectSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section className="settings-body">
          <header className="settings-body-head">
            <h3>{active?.label}</h3>
            <button type="button" className="icon-btn" onClick={onClose} title="关闭设置" aria-label="关闭设置">
              <X size={15} weight="bold" />
            </button>
          </header>
          {section === 'export' ? <ExportSection onExport={pick} /> : null}
          {section === 'data' ? <DataSection /> : null}
          {section === 'about' ? <AboutSection /> : null}
        </section>
      </div>
    </div>
  )
}
