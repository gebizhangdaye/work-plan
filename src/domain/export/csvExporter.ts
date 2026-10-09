import type { WorkItem } from '../workItem/WorkItem'
import { EMPTY_FILTERS, LANE_ORDER, itemsByLane } from '../query/boardQuery'
import { LANE_LABELS } from '../workItem/priorityLanes'

const HEADER = ['档位', '标题', '状态', '计划日', '完成时间', '标签', '正文', '附件']

/** BOM + CRLF + 全量加引号，保证中文在 Excel 里不乱码、正文换行不撑破列。 */
export function toCsv(items: readonly WorkItem[], today: string): string {
  const rows = [HEADER, ...rowsOf(items, today)]
  return `\uFEFF${rows.map((row) => row.map(quote).join(',')).join('\r\n')}\r\n`
}

function rowsOf(items: readonly WorkItem[], today: string) {
  const rows = []
  for (const lane of LANE_ORDER) {
    for (const item of itemsByLane(items, lane, today, EMPTY_FILTERS)) {
      rows.push([
        LANE_LABELS[lane],
        item.title,
        item.status === 'done' ? '已完成' : '在办',
        item.plannedDate ?? '',
        item.doneAt ?? '',
        item.tags.map((tag) => tag.name).join(';'),
        item.noteMd,
        item.attachments.map((attachment) => attachment.relPath).join(';')
      ])
    }
  }
  return rows
}

function quote(field: string): string {
  return `"${field.replace(/"/g, '""')}"`
}
