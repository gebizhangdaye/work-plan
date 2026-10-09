import { useState } from 'react'
import { X } from '@phosphor-icons/react'
import type { WorkItem } from '@domain/workItem/WorkItem'
import type { WorkBoard } from '../state/useWorkBoard'

export function TagPicker({ item, board }: { item: WorkItem; board: WorkBoard }) {
  const [name, setName] = useState('')

  function add() {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    board.actions.addTagByName(item.id, trimmed)
    setName('')
  }

  return (
    <div className="section">
      <span className="section-title">标签</span>
      <div className="tag-row">
        {item.tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className="chip active"
            title="移除这个标签"
            onClick={() => board.actions.detachTag(item.id, tag.id)}
          >
            <i className="dot" style={{ background: tag.color }} />
            {tag.name}
            <X size={10} weight="bold" />
          </button>
        ))}
        <input
          className="tag-input"
          placeholder="新标签，回车加"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') add()
          }}
        />
      </div>
    </div>
  )
}
