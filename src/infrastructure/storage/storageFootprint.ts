import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import type { AppSettings } from '../../shared/workPlanApi'
import type { WorkPlanDatabase } from '../db/DatabaseConnection'
import type { DataPaths } from './appDataPaths'

export function collectSettings(
  paths: DataPaths,
  db: WorkPlanDatabase,
  openAtLogin: boolean,
  version: string
): AppSettings {
  const counts = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM work_item) AS items,
              (SELECT COUNT(*) FROM work_attachment) AS attachments,
              (SELECT COALESCE(SUM(bytes), 0) FROM work_attachment) AS attachmentBytes`
    )
    .get() as { items: number; attachments: number; attachmentBytes: number }

  return {
    openAtLogin,
    version,
    dataRoot: paths.root,
    dbBytes: statSync(paths.dbFile).size,
    attachmentBytes: Number(counts.attachmentBytes),
    attachmentCount: counts.attachments,
    itemCount: counts.items
  }
}

/** 目录实际占用（含没被引用的残留 png），设置页用它兜底核对。 */
export function measureDirBytes(dir: string): number {
  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name)
    total += entry.isDirectory() ? measureDirBytes(absolute) : statSync(absolute).size
  }
  return total
}
