import type { Lane, WorkItem } from '../workItem/WorkItem'
import { LANES, LANE_LABELS } from '../workItem/priorityLanes'
import { matchesQuery } from './textMatcher'
import { matchesTags } from './tagFilter'

export interface BoardFilters {
  search: string
  tagIds: readonly string[]
}

export interface LaneColumn {
  lane: Lane
  label: string
  items: WorkItem[]
  openCount: number
  overdueCount: number
}

export const EMPTY_FILTERS: BoardFilters = { search: '', tagIds: [] }

/** 导出等需要固定档序的地方用它，不依赖 UI。 */
export const LANE_ORDER: readonly Lane[] = LANES

export function itemsByLane(
  items: readonly WorkItem[],
  lane: Lane,
  today: string,
  filters: BoardFilters = EMPTY_FILTERS
): WorkItem[] {
  return toColumn(lane, items.filter(visible(filters)), today).items
}

function visible(filters: BoardFilters) {
  return (item: WorkItem) => matchesQuery(item, filters.search) && matchesTags(item, filters.tagIds)
}

/** 逾期 = 计划日已过且未完成。计划日只影响排序与徽标，绝不把条目藏起来。 */
export function isOverdue(item: WorkItem, today: string): boolean {
  return item.status === 'open' && item.plannedDate !== null && item.plannedDate < today
}

export function isDueOn(item: WorkItem, today: string): boolean {
  return item.status === 'open' && item.plannedDate === today
}

export function buildBoard(
  items: readonly WorkItem[],
  filters: BoardFilters,
  today: string
): LaneColumn[] {
  const visible = items.filter(
    (item) => matchesQuery(item, filters.search) && matchesTags(item, filters.tagIds)
  )
  return LANES.map((lane) => toColumn(lane, visible, today))
}

function toColumn(lane: Lane, items: readonly WorkItem[], today: string): LaneColumn {
  const inLane = items.filter((item) => item.lane === lane)
  const open = inLane.filter((item) => item.status === 'open')
  const done = inLane.filter((item) => item.status === 'done')

  return {
    lane,
    label: LANE_LABELS[lane],
    items: [...sortOpen(open, today), ...sortDone(done)],
    openCount: open.length,
    overdueCount: open.filter((item) => isOverdue(item, today)).length
  }
}

/** 0 逾期 → 1 今天到期 → 2 其他（未填日期或未来日期）。 */
function displayGroup(item: WorkItem, today: string): number {
  if (isOverdue(item, today)) return 0
  if (isDueOn(item, today)) return 1
  return 2
}

function sortOpen(items: WorkItem[], today: string): WorkItem[] {
  return [...items].sort(
    (a, b) => displayGroup(a, today) - displayGroup(b, today) || a.rank - b.rank
  )
}

/** 完成项沉底，按完成时间倒序（最近完成的排最上）。 */
function sortDone(items: WorkItem[]): WorkItem[] {
  return [...items].sort((a, b) => descText(a.doneAt, b.doneAt) || a.rank - b.rank)
}

function descText(a: string | null, b: string | null): number {
  const left = a ?? ''
  const right = b ?? ''
  return left < right ? 1 : left > right ? -1 : 0
}
