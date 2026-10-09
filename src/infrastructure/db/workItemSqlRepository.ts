import { randomUUID } from 'node:crypto'
import type { FieldIssue } from '../../domain/workItem/workItemValidator'
import type { Lane, WorkItem, WorkItemDraft } from '../../domain/workItem/WorkItem'
import {
  rowToWorkItem,
  type AttachmentRow,
  type TagRow,
  type WorkItemRow
} from '../../domain/workItem/workItemCodec'
import { planRankAssignment, tailRank, type Ranked } from '../../domain/workItem/ordering'
import { validateDraft } from '../../domain/workItem/workItemValidator'
import { assertLane } from '../../domain/workItem/priorityLanes'
import { inTransaction, type WorkPlanDatabase } from './DatabaseConnection'

export class InvalidWorkItemDraft extends Error {
  issues: FieldIssue[]
  constructor(issues: FieldIssue[]) {
    super(issues.map((issue) => issue.message).join('；'))
    this.name = 'InvalidWorkItemDraft'
    this.issues = issues
  }
}

const ITEM_COLUMNS =
  'id, title, note_md, lane, planned_date, status, done_at, sort_rank AS rank, created_at, updated_at'

export class WorkItemSqlRepository {
  constructor(private readonly db: WorkPlanDatabase) {}

  listAll(): WorkItem[] {
    const rows = this.db.prepare(`SELECT ${ITEM_COLUMNS} FROM work_item`).all() as unknown as WorkItemRow[]
    const attachments = this.db
      .prepare('SELECT id, item_id, rel_path, bytes, width, height, cropped_from FROM work_attachment')
      .all() as unknown as AttachmentRow[]
    const tags = this.db
      .prepare(
        'SELECT t.id, t.name, t.color, m.item_id FROM work_tag t JOIN work_item_tag m ON m.tag_id = t.id'
      )
      .all() as unknown as TagRow[]

    const attByItem = groupBy(attachments, (row) => row.item_id)
    const tagByItem = groupBy(tags, (row) => row.item_id)
    return rows.map((row) =>
      rowToWorkItem(row, attByItem.get(row.id) ?? [], tagByItem.get(row.id) ?? [])
    )
  }

  getById(id: string): WorkItem | null {
    return this.listAll().find((item) => item.id === id) ?? null
  }

  create(draft: WorkItemDraft): WorkItem {
    const issues = validateDraft({ ...draft, title: draft.title.trim() })
    if (issues.length > 0) throw new InvalidWorkItemDraft(issues)

    const lane = draft.lane ?? 'today'
    assertLane(lane)
    const now = new Date().toISOString()
    const id = randomUUID()
    const row: WorkItemRow = {
      id,
      title: draft.title.trim(),
      note_md: draft.noteMd ?? '',
      lane,
      planned_date: draft.plannedDate ?? null,
      status: 'open',
      done_at: null,
      rank: tailRank(this.rankedInLane(lane)),
      created_at: now,
      updated_at: now
    }
    this.insert(row)
    return this.requireById(id)
  }

  update(id: string, draft: WorkItemDraft): WorkItem {
    const issues = validateDraft({ ...draft, title: draft.title.trim() })
    if (issues.length > 0) throw new InvalidWorkItemDraft(issues)

    const current = this.fetchRow(id)
    const lane: Lane = draft.lane === undefined ? assertLane(current.lane) : assertLane(draft.lane)
    const changedLane = lane !== current.lane
    const now = new Date().toISOString()

    this.db
      .prepare(
        `UPDATE work_item
         SET title = ?, note_md = ?, lane = ?, planned_date = ?, sort_rank = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        draft.title.trim(),
        draft.noteMd ?? current.note_md ?? '',
        lane,
        draft.plannedDate === undefined ? current.planned_date : draft.plannedDate,
        changedLane ? tailRank(this.rankedInLane(lane)) : current.rank,
        now,
        id
      )
    return this.requireById(id)
  }

  toggleDone(id: string): WorkItem {
    const current = this.fetchRow(id)
    const nextStatus = current.status === 'done' ? 'open' : 'done'
    this.db
      .prepare('UPDATE work_item SET status = ?, done_at = ?, updated_at = ? WHERE id = ?')
      .run(nextStatus, nextStatus === 'done' ? new Date().toISOString() : null, new Date().toISOString(), id)
    return this.requireById(id)
  }

  /** 删除返回被解引用的附件相对路径，交给文件层做孤儿清理；行由 CASCADE 清。 */
  remove(id: string): string[] {
    const orphaned = this.db
      .prepare('SELECT rel_path FROM work_attachment WHERE item_id = ?')
      .all(id) as unknown as { rel_path: string }[]
    this.db.prepare('DELETE FROM work_item WHERE id = ?').run(id)
    return orphaned.map((row) => row.rel_path)
  }

  /**
   * 拖动落库。落点用 beforeId 表达而不是数字下标：
   * 渲染层看到的是过滤后的列，下标和库内顺序对不上，只有"插在某条之前"不会错位。
   */
  moveTo(id: string, lane: Lane, beforeId: string | null): void {
    assertLane(lane)
    const current = this.fetchRow(id)
    const column = this.rankedInLane(lane).filter((item) => item.id !== id)
    const targetIndex = beforeId === null ? column.length : indexOfOrEnd(column, beforeId)
    const sentinel = [...column, { id, rank: Number.NEGATIVE_INFINITY }]
    const plan = planRankAssignment(sentinel, id, targetIndex)

    inTransaction(this.db, () => {
      if (current.lane !== lane) {
        this.db
          .prepare('UPDATE work_item SET lane = ?, updated_at = ? WHERE id = ?')
          .run(lane, new Date().toISOString(), id)
      }
      this.applyRanks(plan.ranks)
    })
  }

  applyRanks(ranks: Record<string, number>): void {
    const ids = Object.keys(ranks)
    if (ids.length === 0) return

    const cases = ids.map(() => 'WHEN ? THEN ?').join(' ')
    const placeholders = ids.map(() => '?').join(',')
    const params: (string | number)[] = ids.flatMap((id) => [id, ranks[id]])
    this.db
      .prepare(
        `UPDATE work_item SET sort_rank = CASE id ${cases} END, updated_at = ? WHERE id IN (${placeholders})`
      )
      .run(...params, new Date().toISOString(), ...ids)
  }

  rankedInLane(lane: Lane): Ranked[] {
    return this.db
      .prepare('SELECT id, sort_rank AS rank FROM work_item WHERE lane = ?')
      .all(lane) as unknown as Ranked[]
  }

  private insert(row: WorkItemRow): void {
    this.db
      .prepare(
        `INSERT INTO work_item (id, title, note_md, lane, planned_date, status, done_at, sort_rank, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        row.id,
        row.title,
        row.note_md,
        row.lane,
        row.planned_date,
        row.status,
        row.done_at,
        row.rank,
        row.created_at,
        row.updated_at
      )
  }

  private fetchRow(id: string): WorkItemRow {
    const row = this.db.prepare(`SELECT ${ITEM_COLUMNS} FROM work_item WHERE id = ?`).get(id) as
      | WorkItemRow
      | undefined
    if (!row) throw new Error(`任务不存在: ${id}`)
    return row
  }

  private requireById(id: string): WorkItem {
    const found = this.getById(id)
    if (!found) throw new Error(`任务不存在: ${id}`)
    return found
  }
}

function indexOfOrEnd(list: readonly Ranked[], id: string): number {
  const index = list.findIndex((item) => item.id === id)
  return index < 0 ? list.length : index
}

function groupBy<T extends { item_id: string }>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const group = map.get(key(row))
    if (group) group.push(row)
    else map.set(key(row), [row])
  }
  return map
}
