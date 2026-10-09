import { useState } from 'react'
import { Gear, Kanban, PictureInPicture } from '@phosphor-icons/react'
import { BoardColumns } from './board/BoardColumns'
import { SearchBox } from './filter/SearchBox'
import { TagChipRow } from './filter/TagChipRow'
import { SettingsDialog, type SettingsSection } from './settings/SettingsDialog'
import { TitleBar } from './titlebar/TitleBar'
import { WorkItemEditor } from './editor/WorkItemEditor'
import { LightboxViewer } from './attachment/LightboxViewer'
import { useWorkBoard } from './state/useWorkBoard'
import './styles/panel.css'
import './styles/mini.css'

export function AppShell() {
  const board = useWorkBoard()
  const [miniError, setMiniError] = useState<string | null>(null)
  const [settingsSection, setSettingsSection] = useState<SettingsSection | null>(null)
  const { notice, filters, setFilters, today, tags } = board

  function openMini(): void {
    window.workPlan.setMiniWindow(true).catch((cause: Error) => setMiniError(`小窗打开失败：${cause.message}`))
  }

  return (
    <div className="app">
      <TitleBar today={today} onOpenSettings={setSettingsSection} />

      <div className="toolbar">
        <SearchBox value={filters.search} onChange={(search) => setFilters({ ...filters, search })} />
        <div className="segmented" role="group" aria-label="视图模式">
          <button type="button" aria-pressed title="三列泳道看板">
            <Kanban size={13} />
            看板
          </button>
          <button type="button" aria-pressed={false} onClick={openMini} title="收成贴顶小窗">
            <PictureInPicture size={13} />
            小窗
          </button>
        </div>
        <span className="toolbar-spacer" />
        <button
          type="button"
          className="icon-btn"
          onClick={() => setSettingsSection('export')}
          aria-haspopup="dialog"
          title="设置"
          aria-label="设置"
        >
          <Gear size={16} />
        </button>
      </div>

      {tags.length > 0 ? (
        <TagChipRow
          tags={tags}
          active={filters.tagIds}
          onChange={(tagIds) => setFilters({ ...filters, tagIds })}
        />
      ) : null}

      {notice ? <div className={`status ${notice.kind}`}>{notice.text}</div> : null}
      {miniError ? <div className="status">{miniError}</div> : null}

      <main className="board">
        <BoardColumns board={board} />
      </main>

      {/* key 用 id：只有换卡片才重挂载，列表整体刷新不能冲掉未保存的草稿 */}
      {board.selected ? <WorkItemEditor key={board.selected.id} item={board.selected} board={board} /> : null}
      <LightboxViewer board={board} />
      {settingsSection ? (
        <SettingsDialog
          section={settingsSection}
          onSelectSection={setSettingsSection}
          onExport={board.actions.exportPlan}
          onClose={() => setSettingsSection(null)}
        />
      ) : null}
    </div>
  )
}
