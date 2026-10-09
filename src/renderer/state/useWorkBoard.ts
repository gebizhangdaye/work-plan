import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Lane, WorkItem, WorkItemDraft } from '@domain/workItem/WorkItem'
import type { BoardFilters } from '@domain/query/boardQuery'
import { EMPTY_FILTERS, buildBoard } from '@domain/query/boardQuery'
import type { ExportFormat, TagOption } from '@shared/workPlanApi'

const api = window.workPlan

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useWorkBoard() {
  const [items, setItems] = useState<WorkItem[]>([])
  const [tags, setTags] = useState<TagOption[]>([])
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lightboxId, setLightboxId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; kind: 'error' | 'info' } | null>(null)
  const [today, setToday] = useState(todayKey)

  const load = useCallback(async () => {
    const [nextItems, nextTags] = await Promise.all([api.listItems(), api.listTags()])
    setItems(nextItems)
    setTags(nextTags)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setToday(todayKey()), 60_000)
    api.onWindowRefresh(() => void load())
    void load()
    return () => clearInterval(timer)
  }, [load])

  const board = useMemo(() => buildBoard(items, filters, today), [items, filters, today])
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId])

  function setNoticeLater(text: string, kind: 'error' | 'info'): void {
    setNotice({ text, kind })
    setTimeout(() => setNotice(null), 6000)
  }

  /** UI 层动作一律派发即返回：失败已经被 catch 成通知，调用方不需要 await。 */
  function dispatch(action: () => Promise<void>): void {
    action().catch((error: Error) => setNoticeLater(error.message, 'error'))
  }

  const actions = {
    create: (lane: Lane, draft: WorkItemDraft) =>
      dispatch(async () => {
        await api.createItem({ ...draft, lane })
        await load()
      }),
    update: (id: string, draft: WorkItemDraft) =>
      dispatch(async () => {
        await api.updateItem(id, draft)
        await load()
      }),
    toggle: (id: string) =>
      dispatch(async () => {
        await api.toggleDone(id)
        await load()
      }),
    move: (id: string, lane: Lane, beforeId: string | null) =>
      dispatch(async () => setItems(await api.moveItem(id, lane, beforeId))),
    remove: (id: string) =>
      dispatch(async () => {
        await api.deleteItem(id)
        if (selectedId === id) setSelectedId(null)
        await load()
      }),
    paste: (id: string) =>
      dispatch(async () => {
        const outcome = await api.pasteAttachment(id)
        if (!outcome.attachment) setNoticeLater('剪贴板里没有图片，按文字粘贴处理', 'info')
        await load()
      }),
    importFiles: (id: string, files: string[]) =>
      dispatch(async () => {
        await api.importFiles(id, files)
        await load()
      }),
    addCropped: (id: string, dataUrl: string, sourceId: string) =>
      dispatch(async () => {
        const added = await api.addCroppedImage(id, dataUrl, sourceId)
        setLightboxId(added?.id ?? null)
        await load()
      }),
    addTagByName: (itemId: string, name: string) =>
      dispatch(async () => {
        const tag = await api.ensureTag(name.trim())
        await api.attachTag(itemId, tag.id)
        // 标签行的 chips 和计数读的是 tags 快照，只 setItems 的话新标签永远不出现
        await load()
      }),
    detachTag: (id: string, tagId: string) =>
      dispatch(async () => {
        await api.detachTag(id, tagId)
        await load()
      }),
    exportPlan: (format: ExportFormat) =>
      dispatch(async () => {
        const file = await api.exportPlan(format)
        if (file) setNoticeLater(`已导出 ${file}`, 'info')
      }),
    openInFolder: (relPath: string) => dispatch(() => api.openAttachmentInFolder(relPath))
  }

  return {
    board,
    tags,
    filters,
    setFilters,
    selected,
    select: setSelectedId,
    lightboxId,
    setLightboxId,
    notice,
    today,
    items,
    actions
  }
}

export type WorkBoard = ReturnType<typeof useWorkBoard>
