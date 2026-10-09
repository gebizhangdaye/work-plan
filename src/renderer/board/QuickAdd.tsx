import { useState, type KeyboardEvent } from 'react'
import { Plus } from '@phosphor-icons/react'
import type { Lane, WorkItemDraft } from '@domain/workItem/WorkItem'

export function QuickAdd({
  lane,
  onCreate
}: {
  lane: Lane
  onCreate: (lane: Lane, draft: WorkItemDraft) => void
}) {
  const [title, setTitle] = useState('')

  function submit(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    const trimmed = title.trim()
    if (trimmed.length === 0) return
    onCreate(lane, { title: trimmed })
    setTitle('')
  }

  return (
    <label className="quick-add">
      <Plus size={14} weight="bold" />
      <input
        aria-label={`在「${lane}」档新建任务`}
        placeholder="记一条，回车入库"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={submit}
      />
    </label>
  )
}
