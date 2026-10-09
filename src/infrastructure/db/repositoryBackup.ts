import { copyFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import type { DataPaths } from '../storage/appDataPaths'
import { checkIntegrity, type WorkPlanDatabase } from './DatabaseConnection'

export const BACKUP_KEEP = 5

/** 启动时先落一份带时间戳的库快照，再裁到最近 5 份；完整性不过就别备份坏数据。 */
export function backupOnStartup(paths: DataPaths, db: WorkPlanDatabase): string | null {
  if (!checkIntegrity(db)) return null
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);')

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const target = path.join(paths.backupDir, `workplan-${stamp}.db`)
  copyFileSync(paths.dbFile, target)
  pruneOldBackups(paths)
  return target
}

export function pruneOldBackups(paths: DataPaths): string[] {
  const files = readdirSync(paths.backupDir)
    .filter((name) => name.startsWith('workplan-') && name.endsWith('.db'))
    .map((name) => path.join(paths.backupDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)

  for (const stale of files.slice(BACKUP_KEEP)) rmSync(stale, { force: true })
  return files.slice(0, BACKUP_KEEP)
}

export function latestBackup(paths: DataPaths): string | null {
  const kept = pruneOldBackups(paths)
  return kept.length > 0 ? kept[0] : null
}
