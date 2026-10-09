import type { AttachmentRef, TagRef, WorkItem } from './WorkItem'
import { assertLane } from './priorityLanes'

/** 与 work_item 表列名一一对应。 */
export interface WorkItemRow {
  id: string
  title: string
  note_md: string | null
  lane: string
  planned_date: string | null
  status: string
  done_at: string | null
  rank: number
  created_at: string
  updated_at: string
}

export interface AttachmentRow {
  id: string
  item_id: string
  rel_path: string
  bytes: number
  width: number
  height: number
  cropped_from: string | null
}

export interface TagRow {
  id: string
  name: string
  color: string
  item_id: string
}

export function rowToWorkItem(
  row: WorkItemRow,
  attachments: readonly AttachmentRow[],
  tags: readonly TagRow[]
): WorkItem {
  return {
    id: row.id,
    title: row.title,
    noteMd: row.note_md ?? '',
    lane: assertLane(row.lane),
    plannedDate: row.planned_date,
    status: row.status === 'done' ? 'done' : 'open',
    doneAt: row.done_at,
    rank: row.rank,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachments: attachments.filter((a) => a.item_id === row.id).map(toAttachment),
    tags: tags.filter((t) => t.item_id === row.id).map(toTag)
  }
}

export function workItemToRow(item: WorkItem): WorkItemRow {
  return {
    id: item.id,
    title: item.title,
    note_md: item.noteMd,
    lane: item.lane,
    planned_date: item.plannedDate,
    status: item.status,
    done_at: item.doneAt,
    rank: item.rank,
    created_at: item.createdAt,
    updated_at: item.updatedAt
  }
}

function toAttachment(row: AttachmentRow): AttachmentRef {
  return {
    id: row.id,
    relPath: row.rel_path,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    croppedFrom: row.cropped_from
  }
}

function toTag(row: TagRow): TagRef {
  return { id: row.id, name: row.name, color: row.color }
}
