import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildRelPath } from '../../domain/workItem/attachmentNaming'
import type { DataPaths } from './appDataPaths'
import type { WorkPlanDatabase } from '../db/DatabaseConnection'

export interface SavedAttachment {
  id: string
  itemId: string
  relPath: string
  bytes: number
  width: number
  height: number
  croppedFrom: string | null
}

export interface ImageSize {
  width: number
  height: number
}

/**
 * PNG 只落盘一次：sha256 决定文件名。同一条任务粘同一张图只保一条记录（返回 null），
 * 不同任务可共用同一个文件，引用计数归零才真删。
 */
export class AttachmentFileStore {
  constructor(
    private readonly paths: DataPaths,
    private readonly db: WorkPlanDatabase
  ) {}

  savePng(
    itemId: string,
    png: Uint8Array,
    size: ImageSize,
    croppedFrom: string | null
  ): SavedAttachment | null {
    const sha256 = createHash('sha256').update(png).digest('hex')
    const duplicate = this.db
      .prepare('SELECT 1 AS hit FROM work_attachment WHERE item_id = ? AND sha256 = ?')
      .get(itemId, sha256)
    if (duplicate) return null

    const slot = buildRelPath(sha256, new Date())
    const absolute = path.join(this.paths.root, slot.relPath)
    if (!existsSync(absolute)) {
      mkdirSync(path.dirname(absolute), { recursive: true })
      writeFileSync(absolute, png)
    }

    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO work_attachment
         (id, item_id, sha256, rel_path, bytes, width, height, cropped_from, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        itemId,
        sha256,
        slot.relPath,
        png.byteLength,
        size.width,
        size.height,
        croppedFrom,
        new Date().toISOString()
      )
    return {
      id,
      itemId,
      relPath: slot.relPath,
      bytes: png.byteLength,
      width: size.width,
      height: size.height,
      croppedFrom
    }
  }

  /** 一条 GROUP BY 拿引用计数，不在循环里打库。 */
  releaseFiles(relPaths: readonly string[]): number {
    if (relPaths.length === 0) return 0

    const placeholders = relPaths.map(() => '?').join(',')
    const rows = this.db
      .prepare(
        `SELECT rel_path, COUNT(*) AS n FROM work_attachment WHERE rel_path IN (${placeholders}) GROUP BY rel_path`
      )
      .all(...relPaths) as { rel_path: string; n: number }[]
    const referenced = new Set(rows.filter((row) => row.n > 0).map((row) => row.rel_path))

    let removed = 0
    for (const relPath of new Set(relPaths)) {
      if (referenced.has(relPath)) continue
      const absolute = path.join(this.paths.root, relPath)
      if (existsSync(absolute)) {
        unlinkSync(absolute)
        removed += 1
      }
    }
    return removed
  }
}
