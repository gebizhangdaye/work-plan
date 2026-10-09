import type { Lane, WorkItem } from '../workItem/WorkItem'
import type { LaneColumn } from './boardQuery'
import { isOverdue } from './boardQuery'

export interface MiniEntry {
  item: WorkItem
  lane: Lane
  overdue: boolean
}

/**
 * 三档合并成一条列表：档序固定 加急→今天→以后，
 * 档内直接沿用看板已经排好的顺序（逾期在前、完成沉底），不在这里另写一套排序。
 * 传入的 columns 应来自 buildBoard，这样搜索与标签过滤在小窗里同样生效。
 */
export function flattenForMini(columns: readonly LaneColumn[], today: string): MiniEntry[] {
  const entries: MiniEntry[] = []
  for (const column of columns) {
    for (const item of column.items) {
      entries.push({ item, lane: column.lane, overdue: isOverdue(item, today) })
    }
  }
  return entries
}

export interface MiniTally {
  lane: Lane
  label: string
  open: number
  overdue: number
}

export function tallyByLane(columns: readonly LaneColumn[]): MiniTally[] {
  return columns.map((column) => ({
    lane: column.lane,
    label: column.label,
    open: column.openCount,
    overdue: column.overdueCount
  }))
}
