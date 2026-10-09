/** 同档内的顺序由 rank 决定；拖动只改写一个值，间隙耗尽才整列归一化。 */
export const RANK_STEP = 1000

/** 相邻 rank 差小于该值说明浮点快压不动了，需要归一化。 */
export const MIN_RANK_GAP = 1e-6

export interface Ranked {
  id: string
  rank: number
}

export interface RankAssignment {
  /** 需要落库的 id → rank；未触发归一化时只含被拖动的那一条。 */
  ranks: Record<string, number>
  normalized: boolean
}

export function tailRank(items: readonly Ranked[]): number {
  if (items.length === 0) return RANK_STEP
  return Math.max(...items.map((item) => item.rank)) + RANK_STEP
}

/** 取 before 与 after 的中点；缺边界时用步长外推。 */
export function rankBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return RANK_STEP
  if (before === undefined) return (after as number) - RANK_STEP
  if (after === undefined) return before + RANK_STEP
  return (before + after) / 2
}

export function sortByRank<T extends Ranked>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.rank - b.rank || compareId(a.id, b.id))
}

/** 把 movingId 移到 targetIndex（索引基于移除自身后的列表）。 */
export function orderAfterMove<T extends Ranked>(
  items: readonly T[],
  movingId: string,
  targetIndex: number
): T[] {
  const sorted = sortByRank(items)
  const moving = sorted.find((item) => item.id === movingId)
  if (!moving) return sorted

  const rest = sorted.filter((item) => item.id !== movingId)
  rest.splice(clamp(targetIndex, rest.length), 0, moving)
  return rest
}

/** 计算一次拖动需要写回的 rank：常规只写一条，压不动了整列重排。 */
export function planRankAssignment(
  items: readonly Ranked[],
  movingId: string,
  targetIndex: number
): RankAssignment {
  const ordered = orderAfterMove(items, movingId, targetIndex)
  const index = ordered.findIndex((item) => item.id === movingId)
  const before = ordered[index - 1]?.rank
  const after = ordered[index + 1]?.rank
  const moved = { id: movingId, rank: rankBetween(before, after) }
  const withMoved = ordered.map((item) => (item.id === movingId ? moved : item))

  // 整列检查：别处遗留的窄间隙也要在这次拖动里一并修掉
  if (needsNormalization(withMoved)) {
    return { ranks: normalizeRanks(withMoved), normalized: true }
  }
  return { ranks: { [movingId]: moved.rank }, normalized: false }
}

export function needsNormalization(items: readonly Ranked[]): boolean {
  const sorted = sortByRank(items)
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].rank - sorted[i - 1].rank < MIN_RANK_GAP) return true
  }
  return false
}

/** 重新按步长铺开，返回 id → 新 rank。 */
export function normalizeRanks(items: readonly Ranked[]): Record<string, number> {
  const result: Record<string, number> = {}
  sortByRank(items).forEach((item, index) => {
    result[item.id] = (index + 1) * RANK_STEP
  })
  return result
}

function clamp(index: number, length: number): number {
  return Math.max(0, Math.min(index, length))
}

function compareId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}
