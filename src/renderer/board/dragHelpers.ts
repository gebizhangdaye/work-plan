import type { DragEvent } from 'react'

export const DRAG_KIND = 'application/x-work-item'

export function beginDrag(event: DragEvent<HTMLElement>, id: string): void {
  event.dataTransfer.setData(DRAG_KIND, id)
  event.dataTransfer.effectAllowed = 'move'
}

export function readDraggedId(event: DragEvent<HTMLElement>): string {
  return event.dataTransfer.getData(DRAG_KIND)
}

export function isDragOfInterest(event: DragEvent<HTMLElement>): boolean {
  const types = Array.from(event.dataTransfer.types)
  return types.includes(DRAG_KIND) || types.includes('Files')
}

export function readDroppedFiles(
  event: DragEvent<HTMLElement>,
  getPathForFile: (file: File) => string
): string[] {
  if (event.dataTransfer.files.length === 0) return []
  return Array.from(event.dataTransfer.files)
    .map((file) => getPathForFile(file))
    .filter((filePath) => filePath.length > 0)
}

/**
 * 落点用"插在哪条之前"表达，而不是数字下标：
 * 过滤态下可见卡片数 ≠ 库内条数，用下标会放错位置。返回 null 表示追加到末尾。
 */
export function dropBeforeId(event: DragEvent<HTMLElement>, draggedId: string): string | null {
  const cards = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-card-id]')).filter(
    (node) => node.dataset.cardId !== draggedId
  )

  for (const node of cards) {
    const box = node.getBoundingClientRect()
    if (event.clientY < box.top + box.height / 2) return node.dataset.cardId ?? null
  }
  return null
}
