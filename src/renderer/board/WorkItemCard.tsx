import { CalendarBlank, ImageSquare, WarningCircle } from '@phosphor-icons/react'
import type { WorkItem } from '@domain/workItem/WorkItem'
import type { LaneColumn } from '@domain/query/boardQuery'
import { isOverdue } from '@domain/query/boardQuery'
import { assetUrlFor } from '@domain/workItem/attachmentNaming'
import type { WorkBoard } from '../state/useWorkBoard'
import { CompleteCheckbox } from './CompleteCheckbox'
import { PrioritySwitch } from './PrioritySwitch'
import { beginDrag } from './dragHelpers'

const THUMB_LIMIT = 4

export function WorkItemCard({
  item,
  board,
  lane
}: {
  item: WorkItem
  board: WorkBoard
  lane: LaneColumn['lane']
}) {
  return (
    <article
      className={cardClasses(item, board, lane)}
      data-card-id={item.id}
      draggable
      onDragStart={(event) => beginDrag(event, item.id)}
      onClick={() => board.select(item.id)}
    >
      <CompleteCheckbox checked={item.status === 'done'} onToggle={() => board.actions.toggle(item.id)} />

      <div className="body">
        <div className="title">{item.title}</div>
        {item.noteMd.trim().length > 0 ? <p className="note">{excerpt(item.noteMd)}</p> : null}
        <div className="meta">
          {isOverdue(item, board.today) ? (
            <span className="overdue-flag">
              <WarningCircle size={12} />
              逾期
            </span>
          ) : null}
          {item.plannedDate ? (
            <span className="date-flag">
              <CalendarBlank size={12} />
              {item.plannedDate.slice(5)}
            </span>
          ) : null}
          {item.tags.map((tag) => (
            <span className="tag" key={tag.id} style={{ color: tag.color }}>
              {tag.name}
            </span>
          ))}
        </div>
        {item.attachments.length > 0 ? (
          <div className="thumbs">
            {item.attachments.slice(0, THUMB_LIMIT).map((attachment) => (
              <img
                key={attachment.id}
                className="thumb"
                src={assetUrlFor(attachment.relPath)}
                alt={item.title}
                onClick={(event) => {
                  event.stopPropagation()
                  board.setLightboxId(attachment.id)
                }}
              />
            ))}
            {item.attachments.length > THUMB_LIMIT ? (
              <span className="thumb-more">
                <ImageSquare size={13} />+{item.attachments.length - THUMB_LIMIT}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <PrioritySwitch item={item} lane={lane} onMove={board.actions.move} />
    </article>
  )
}

function cardClasses(item: WorkItem, board: WorkBoard, lane: LaneColumn['lane']): string {
  const classes = ['card', `lane-${lane}`]
  if (item.status === 'done') classes.push('done')
  if (board.selected?.id === item.id) classes.push('selected')
  return classes.join(' ')
}

function excerpt(text: string, limit = 96): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > limit ? `${flat.slice(0, limit)}…` : flat
}
