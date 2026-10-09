import type { WorkItem } from '../workItem/WorkItem'

/** 多选标签用 AND：选中后只显示同时挂了所有这些标签的条目。 */
export function matchesTags(item: WorkItem, activeTagIds: readonly string[]): boolean {
  if (activeTagIds.length === 0) return true
  const owned = new Set(item.tags.map((tag) => tag.id))
  return activeTagIds.every((tagId) => owned.has(tagId))
}

export function collectTagCounts(items: readonly WorkItem[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag.id, (counts.get(tag.id) ?? 0) + 1)
    }
  }
  return counts
}
