import { CalendarBlank, ImageSquare, WarningCircle } from '@phosphor-icons/react'
import type { MiniEntry } from '@domain/query/miniList'
import { LANE_LABELS } from '@domain/workItem/priorityLanes'

export function MiniRow({
  entry,
  onToggle,
  onOpen
}: {
  entry: MiniEntry
  onToggle: (id: string) => void
  onOpen: (id: string) => void
}) {
  const done = entry.item.status === 'done'
  const classes = ['mini-row', `lane-${entry.lane}`]
  if (done) classes.push('done')

  return (
    <li className={classes.join(' ')}>
      <input
        className="check"
        type="checkbox"
        checked={done}
        onChange={() => onToggle(entry.item.id)}
        title={done ? '标为未完成' : '标为已完成'}
      />
      <i className="lane-block" title={LANE_LABELS[entry.lane]} />
      <button type="button" className="mini-main" onClick={() => onOpen(entry.item.id)}>
        <span className="mini-title">{entry.item.title}</span>
        <span className="mini-meta">
          {entry.overdue ? (
            <span className="overdue-flag">
              <WarningCircle size={11} />
              逾期
            </span>
          ) : null}
          {entry.item.plannedDate ? (
            <span className="date-flag">
              <CalendarBlank size={11} />
              {entry.item.plannedDate.slice(5)}
            </span>
          ) : null}
          {entry.item.tags.map((tag) => (
            <span className="tag" key={tag.id} style={{ color: tag.color }}>
              {tag.name}
            </span>
          ))}
          {entry.item.attachments.length > 0 ? (
            <span className="date-flag">
              <ImageSquare size={11} />
              {entry.item.attachments.length}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  )
}
