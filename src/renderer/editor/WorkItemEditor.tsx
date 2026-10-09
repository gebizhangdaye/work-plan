import { useState } from 'react'
import { Check, Clock, Trash, X } from '@phosphor-icons/react'
import { LANES, LANE_LABELS } from '@domain/workItem/priorityLanes'
import { formatDateTimeStamp } from '@domain/workItem/timestampDisplay'
import type { WorkBoard } from '../state/useWorkBoard'
import type { Lane, WorkItem } from '@domain/workItem/WorkItem'
import { RichNoteInput } from './RichNoteInput'
import { TagPicker } from './TagPicker'
import { AttachmentGallery } from '../attachment/AttachmentGallery'

interface Draft {
  title: string
  noteMd: string
  plannedDate: string
}

function draftFrom(item: WorkItem): Draft {
  return { title: item.title, noteMd: item.noteMd, plannedDate: item.plannedDate ?? '' }
}

export function WorkItemEditor({ item, board }: { item: WorkItem; board: WorkBoard }) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(item))

  function save(): void {
    board.actions.update(item.id, {
      title: draft.title,
      noteMd: draft.noteMd,
      plannedDate: draft.plannedDate.length > 0 ? draft.plannedDate : null
    })
  }

  function shiftTo(lane: Lane): void {
    if (lane !== item.lane) board.actions.move(item.id, lane, null)
  }

  return (
    <aside className="drawer">
      <header>
        <strong>卡片详情</strong>
        <button type="button" className="icon-btn" onClick={() => board.select(null)} title="关闭" aria-label="关闭详情">
          <X size={14} weight="bold" />
        </button>
      </header>

      <div className="section">
        <span className="section-title">标题</span>
        <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
      </div>

      <div className="section">
        <span className="section-title">元信息</span>
        <div className="meta-grid">
          <label className="field">
            计划日
            <input
              type="date"
              value={draft.plannedDate}
              onChange={(event) => setDraft({ ...draft, plannedDate: event.target.value })}
            />
          </label>
          <div className="field">
            档位
            <div className="lane-picker" role="group" aria-label="档位">
              {LANES.map((lane) => (
                <button
                  key={lane}
                  type="button"
                  className={`lane-${lane}`}
                  aria-pressed={item.lane === lane}
                  onClick={() => shiftTo(lane)}
                >
                  <i />
                  {LANE_LABELS[lane]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <span className="section-title">记录（Ctrl+V 贴聊天截图，也能拖图片进来）</span>
        <RichNoteInput
          itemId={item.id}
          value={draft.noteMd}
          onChange={(noteMd) => setDraft({ ...draft, noteMd })}
          board={board}
        />
      </div>

      <TagPicker item={item} board={board} />
      <div className="section">
        <AttachmentGallery item={item} board={board} />
      </div>

      <footer>
        <button type="button" className="btn primary" onClick={save}>
          <Check size={13} weight="bold" />
          保存
        </button>
        <button type="button" className="btn danger" onClick={() => board.actions.remove(item.id)}>
          <Trash size={13} />
          删除
        </button>
        <span className="updated">
          <Clock size={11} />
          {formatDateTimeStamp(item.updatedAt)}
        </span>
      </footer>
    </aside>
  )
}
