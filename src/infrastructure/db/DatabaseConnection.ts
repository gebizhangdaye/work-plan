import { DatabaseSync } from 'node:sqlite'

/** Electron 44 内置 Node 24 只提供 DatabaseSync（探测脚本已实测），没有 Database 别名。 */
export type WorkPlanDatabase = DatabaseSync

export function openDatabase(dbFile: string): WorkPlanDatabase {
  const db = new DatabaseSync(dbFile)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec('PRAGMA busy_timeout = 2000;')
  return db
}

export function inTransaction(db: WorkPlanDatabase, work: () => void): void {
  db.exec('BEGIN')
  try {
    work()
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function checkIntegrity(db: WorkPlanDatabase): boolean {
  const row = db.prepare('PRAGMA integrity_check;').get() as Record<string, string> | undefined
  return row?.integrity_check === 'ok'
}
