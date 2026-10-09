import type { AttachmentRef, TagRef, WorkItem } from '../workItem/WorkItem'

let sequence = 0

export const TODAY = '2026-10-08'

export function makeTag(name: string, id = `tag-${name}`): TagRef {
  return { id, name, color: '#6b7280' }
}

export function makeAttachment(relPath = 'attachments/2026/10/abcd1234.png'): AttachmentRef {
  return { id: `att-${relPath.slice(-12)}`, relPath, bytes: 20480, width: 800, height: 600, croppedFrom: null }
}

export function makeItem(overrides: Partial<WorkItem> = {}): WorkItem {
  sequence += 1
  return {
    id: `item-${sequence}`,
    title: `任务 ${sequence}`,
    noteMd: '',
    lane: 'today',
    plannedDate: null,
    status: 'open',
    doneAt: null,
    rank: sequence * 1000,
    createdAt: '2026-10-08T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    attachments: [],
    tags: [],
    ...overrides
  }
}

export function resetItemSequence(): void {
  sequence = 0
}
