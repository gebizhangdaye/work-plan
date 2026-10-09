import { randomUUID } from 'node:crypto'
import type { TagRef } from '../../domain/workItem/WorkItem'
import type { WorkPlanDatabase } from './DatabaseConnection'

/** 标签颜色按建表顺序循环取，避免用户为颜色做额外决策。 */
const PALETTE = [
  '#e5484d',
  '#f5a524',
  '#46a758',
  '#0091ff',
  '#8e4ec6',
  '#e93d82',
  '#3d9970',
  '#6b7280'
]

interface TagRecord extends TagRef {
  usage: number
}

export class TagSqlRepository {
  constructor(private readonly db: WorkPlanDatabase) {}

  listAll(): TagRecord[] {
    return this.db
      .prepare(
        `SELECT t.id, t.name, t.color, COUNT(m.item_id) AS usage
         FROM work_tag t LEFT JOIN work_item_tag m ON m.tag_id = t.id
         GROUP BY t.id ORDER BY t.name`
      )
      .all() as unknown as TagRecord[]
  }

  /** 同名标签只建一次；新标签颜色取当前数量对调色板取模。 */
  ensureTag(name: string): TagRecord {
    const trimmed = name.trim()
    if (trimmed.length === 0) throw new Error('标签名不能为空')

    const existing = this.findByName(trimmed)
    if (existing) return existing

    const count = this.db.prepare('SELECT COUNT(*) AS n FROM work_tag').get() as { n: number }
    this.db
      .prepare('INSERT INTO work_tag (id, name, color) VALUES (?, ?, ?)')
      .run(randomUUID(), trimmed, PALETTE[count.n % PALETTE.length])
    return this.findByName(trimmed) as TagRecord
  }

  attach(itemId: string, tagId: string): void {
    this.db
      .prepare('INSERT INTO work_item_tag (item_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING')
      .run(itemId, tagId)
  }

  detach(itemId: string, tagId: string): void {
    this.db.prepare('DELETE FROM work_item_tag WHERE item_id = ? AND tag_id = ?').run(itemId, tagId)
  }

  dropUnusedTag(tagId: string): void {
    this.db
      .prepare('DELETE FROM work_tag WHERE id = ? AND NOT EXISTS (SELECT 1 FROM work_item_tag WHERE tag_id = work_tag.id)')
      .run(tagId)
  }

  private findByName(name: string): TagRecord | undefined {
    return this.db
      .prepare(
        `SELECT t.id, t.name, t.color, COUNT(m.item_id) AS usage
         FROM work_tag t LEFT JOIN work_item_tag m ON m.tag_id = t.id
         WHERE t.name = ? GROUP BY t.id`
      )
      .get(name) as TagRecord | undefined
  }
}
