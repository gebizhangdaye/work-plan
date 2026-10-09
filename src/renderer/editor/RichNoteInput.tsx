import { useState, type DragEvent } from 'react'
import type { WorkBoard } from '../state/useWorkBoard'
import { readDroppedFiles } from '../board/dragHelpers'

/**
 * 粘贴不拦 preventDefault：剪贴板是图时主进程落盘成附件，
 * 是文字时浏览器照常把文字插进 textarea，两种输入不用切换模式。
 */
export function RichNoteInput({
  itemId,
  value,
  onChange,
  board
}: {
  itemId: string
  value: string
  onChange: (value: string) => void
  board: WorkBoard
}) {
  const [dropping, setDropping] = useState(false)

  function onDrop(event: DragEvent<HTMLTextAreaElement>) {
    event.preventDefault()
    setDropping(false)
    const files = readDroppedFiles(event, (file) => window.workPlan.getPathForFile(file))
    if (files.length > 0) board.actions.importFiles(itemId, files)
  }

  return (
    <textarea
      className={`note-input${dropping ? ' dropping' : ''}`}
      rows={7}
      value={value}
      placeholder="写点上下文，或者贴截图进来"
      onChange={(event) => onChange(event.target.value)}
      onPaste={() => board.actions.paste(itemId)}      onDragOver={(event) => {
        if (Array.from(event.dataTransfer.types).includes('Files')) {
          event.preventDefault()
          setDropping(true)
        }
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    />
  )
}
