import type { WorkItemDraft } from './WorkItem'
import { isLane } from './priorityLanes'

export const TITLE_MAX_LENGTH = 200
export const NOTE_MAX_LENGTH = 20000

export type IssueField = 'title' | 'noteMd' | 'lane' | 'plannedDate'

export interface FieldIssue {
  field: IssueField
  message: string
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** 只保证输入格式有效与日期真实存在，不做任何业务准入判断。 */
export function validateDraft(draft: WorkItemDraft): FieldIssue[] {
  return [
    ...titleIssues(draft.title),
    ...laneIssue(draft.lane),
    ...plannedDateIssue(draft.plannedDate),
    ...noteIssue(draft.noteMd)
  ]
}

function titleIssues(title: string): FieldIssue[] {
  const trimmed = title.trim()
  if (trimmed.length === 0) return [{ field: 'title', message: '标题不能为空' }]
  if (trimmed.length > TITLE_MAX_LENGTH) return [{ field: 'title', message: `标题最多 ${TITLE_MAX_LENGTH} 字` }]
  return []
}

function laneIssue(lane: WorkItemDraft['lane']): FieldIssue[] {
  return lane !== undefined && !isLane(lane)
    ? [{ field: 'lane', message: '档位只能是加急/今天/以后' }]
    : []
}

function plannedDateIssue(plannedDate: string | null | undefined): FieldIssue[] {
  return plannedDate != null && !isPlausibleDate(plannedDate)
    ? [{ field: 'plannedDate', message: '计划日必须是真实的 YYYY-MM-DD' }]
    : []
}

function noteIssue(noteMd: string | undefined): FieldIssue[] {
  return (noteMd ?? '').length > NOTE_MAX_LENGTH
    ? [{ field: 'noteMd', message: `正文最多 ${NOTE_MAX_LENGTH} 字` }]
    : []
}

export function isPlausibleDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const stamp = Date.UTC(year, month - 1, day)
  const probe = new Date(stamp)
  return (
    probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day
  )
}
