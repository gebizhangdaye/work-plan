export type Lane = 'urgent' | 'today' | 'later'

export type ItemStatus = 'open' | 'done'

export interface AttachmentRef {
  id: string
  relPath: string
  bytes: number
  width: number
  height: number
  croppedFrom: string | null
}

export interface TagRef {
  id: string
  name: string
  color: string
}

export interface WorkItem {
  id: string
  title: string
  noteMd: string
  lane: Lane
  plannedDate: string | null
  status: ItemStatus
  doneAt: string | null
  rank: number
  createdAt: string
  updatedAt: string
  attachments: AttachmentRef[]
  tags: TagRef[]
}

/** 新建/编辑时可由用户改动的字段集合。 */
export interface WorkItemDraft {
  title: string
  noteMd?: string
  lane?: Lane
  plannedDate?: string | null
}
