import type { WorkItem } from '../workItem/WorkItem'
import type { LaneColumn } from '../query/boardQuery'
import { EMPTY_FILTERS, buildBoard } from '../query/boardQuery'
import { formatDateStamp } from '../workItem/timestampDisplay'

/** 给上级看的纯文本版：三档顺序与看板一致，完成项打 [x]，截图以相对路径引用。 */
export function toMarkdown(items: readonly WorkItem[], today: string): string {
  const lines: string[] = [`# 工作计划 ${today}`, '']
  for (const column of buildBoard(items, EMPTY_FILTERS, today)) {
    lines.push(...renderColumn(column, today))
  }
  return `${lines.join('\n').trimEnd()}\n`
}

function renderColumn(column: LaneColumn, today: string): string[] {
  const lines = [
    `## ${column.label}（在办 ${column.openCount} / 逾期 ${column.overdueCount}）`,
    ''
  ]
  if (column.items.length === 0) return [...lines, '_（空）_', '']

  for (const item of column.items) lines.push(...renderItem(item, today))
  return lines
}

function renderItem(item: WorkItem, today: string): string[] {
  const box = item.status === 'done' ? '[x]' : '[ ]'
  const lines = [`- ${box} **${item.title}**${suffix(item, today)}`]

  const body = item.noteMd.trim()
  if (body.length > 0) lines.push(...body.split('\n').map((line) => `  ${line.trim()}`))
  for (const attachment of item.attachments) {
    lines.push(`  ![](${attachment.relPath})`)
  }
  return lines
}

function suffix(item: WorkItem, today: string): string {
  const parts: string[] = []
  if (item.plannedDate) parts.push(item.plannedDate < today && item.status === 'open' ? `逾期 ${item.plannedDate}` : `计划 ${item.plannedDate}`)
  if (item.tags.length > 0) parts.push(item.tags.map((tag) => `\`#${tag.name}\``).join(' '))
  if (item.status === 'done' && item.doneAt) parts.push(`完成于 ${formatDateStamp(item.doneAt)}`)
  return parts.length === 0 ? '' : ` — ${parts.join(' · ')}`
}
