import { FileText, Table } from '@phosphor-icons/react'
import type { ExportFormat } from '@shared/workPlanApi'
import logo from '../../../resources/icon.png'
import { formatBytes, useBoardSettings } from '../state/useBoardSettings'

export function ExportSection({ onExport }: { onExport: (format: ExportFormat) => void }) {
  return (
    <>
      <p className="settings-lead">导出的是当前过滤条件下看得到的条目；csv 带 BOM，Excel 直接打开不乱码。</p>
      <button type="button" className="action-row" onClick={() => onExport('md')}>
        <FileText size={17} className="action-icon" />
        <span>
          <strong>导出为 Markdown 文档</strong>
          <em>三档分节，完成项打勾，截图按 attachments 相对路径引用</em>
        </span>
      </button>
      <button type="button" className="action-row" onClick={() => onExport('csv')}>
        <Table size={17} className="action-icon" />
        <span>
          <strong>导出为 CSV 表格</strong>
          <em>8 列，正文里的逗号、换行、引号都已转义</em>
        </span>
      </button>
    </>
  )
}

export function DataSection() {
  const { settings, toggleAutoStart } = useBoardSettings()

  if (!settings) return <p className="settings-lead">读取中…</p>

  const mac = window.workPlan.isMac

  return (
    <>
      <dl className="meta-list">
        <dt>数据目录</dt>
        <dd className="path">{settings.dataRoot}</dd>
        <dt>任务</dt>
        <dd>{settings.itemCount} 条</dd>
        <dt>截图</dt>
        <dd>
          {settings.attachmentCount} 张 · {formatBytes(settings.attachmentBytes)}
        </dd>
        <dt>数据库</dt>
        <dd>
          {formatBytes(settings.dbBytes)}，每次启动留一份备份，最多 5 份
        </dd>
      </dl>

      <label className="switch">
        <input
          type="checkbox"
          checked={settings.openAtLogin}
          onChange={(event) => void toggleAutoStart(event.target.checked)}
        />
        开机自启
      </label>
      <p className="hint">
        {mac ? '自启挂在当前这个 .app 上，挪动或改名后重新勾一次。' : '免安装版换存放位置后自启会失效，重新勾一次即可。'}
      </p>
    </>
  )
}

export function AboutSection() {
  const { settings } = useBoardSettings()

  return (
    <>
      <div className="about-head">
        <img className="brand-mark" src={logo} alt="" width={40} height={40} />
        <div>
          <strong>工作计划</strong>
          <em>版本 {settings ? settings.version : '—'} · 纯本地离线，无账号无联网</em>
        </div>
      </div>
      <p className="settings-lead">
        数据全部放在本地数据目录里（路径见「数据与运行」）：一个 SQLite 库加 attachments 目录，拷走即迁移，删掉即清空。
      </p>
      <button type="button" className="btn" onClick={() => void window.workPlan.quit()}>
        退出工作计划
      </button>
    </>
  )
}
