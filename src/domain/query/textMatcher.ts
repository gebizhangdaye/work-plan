import type { WorkItem } from '../workItem/WorkItem'

/** 搜索按空白分词，每个词都要在标题/正文/标签名里命中（AND 语义）。 */
export function matchesQuery(item: WorkItem, query: string): boolean {
  const tokens = tokenize(query)
  if (tokens.length === 0) return true

  const haystack = [item.title, item.noteMd, ...item.tags.map((tag) => tag.name)]
    .join('\n')
    .toLowerCase()

  return tokens.every((token) => haystack.includes(token))
}

function tokenize(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0)
}
