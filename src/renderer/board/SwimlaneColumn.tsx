import { useState, type DragEvent } from 'react'
import { NotePencil } from '@phosphor-icons/react'
import type { LaneColumn } from '@domain/query/boardQuery'
import type { WorkBoard } from '../state/useWorkBoard'
import { WorkItemCard } from './WorkItemCard'
import { QuickAdd } from './QuickAdd'
import { dropBeforeId, isDragOfInterest, readDraggedId, readDroppedFiles } from './dragHelpers'

export function SwimlaneColumn({ column, board }: { column: LaneColumn; board: WorkBoard }) {
  const [over, setOver] = useState(false)

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setOver(false)
    const files = readDroppedFiles(event, (file) => window.workPlan.getPathForFile(file))
    if (files.length > 0) {
      const target = board.selected?.id
      if (target) board.actions.importFiles(target, files)
      return
    }
    const draggedId = readDraggedId(event)
    if (draggedId) board.actions.move(draggedId, column.lane, dropBeforeId(event, draggedId))
  }

  return (
    <section
      className={`column lane-${column.lane}${over ? ' drop-target' : ''}`}
      onDragOver={(event) => {
        if (isDragOfInterest(event)) {
          event.preventDefault()
          setOver(true)
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
      <header className="column-head">
        <i className="lane-mark" />
        <span>{column.label}</span>
        <span className="lane-count" title={`${column.openCount} 条在办`}>
          {column.openCount}
          {column.overdueCount > 0 ? <em className="overdue">{column.overdueCount} 逾期</em> : null}
        </span>
      </header>

      <div className="column-body">
        {column.items.length === 0 ? (
          <p className="empty">
            <NotePencil size={22} />
            这一档还没东西，下面直接记一条
          </p>
        ) : (
          column.items.map((item) => <WorkItemCard key={item.id} item={item} board={board} lane={column.lane} />)
        )}
      </div>

      <footer className="column-foot">
        <QuickAdd lane={column.lane} onCreate={board.actions.create} />
      </footer>
    </section>
  )
}
