import type { WorkPlanDatabase } from './DatabaseConnection'

export const SCHEMA_VERSION = 1

/** rank 用 sort_rank 存：RANK 在 SQLite 里是窗口函数名，做列名容易踩坑。 */
const STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS work_item (
     id TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     note_md TEXT NOT NULL DEFAULT '',
     lane TEXT NOT NULL CHECK (lane IN ('urgent','today','later')),
     planned_date TEXT,
     status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
     done_at TEXT,
     sort_rank REAL NOT NULL,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  'CREATE INDEX IF NOT EXISTS idx_item_lane_order ON work_item (lane, status, sort_rank)',
  `CREATE TABLE IF NOT EXISTS work_attachment (
     id TEXT PRIMARY KEY,
     item_id TEXT NOT NULL REFERENCES work_item(id) ON DELETE CASCADE,
     sha256 TEXT NOT NULL,
     rel_path TEXT NOT NULL,
     bytes INTEGER NOT NULL,
     width INTEGER NOT NULL,
     height INTEGER NOT NULL,
     cropped_from TEXT,
     created_at TEXT NOT NULL,
     UNIQUE (item_id, sha256)
   )`,
  'CREATE INDEX IF NOT EXISTS idx_attachment_item ON work_attachment (item_id)',
  'CREATE INDEX IF NOT EXISTS idx_attachment_rel ON work_attachment (rel_path)',
  `CREATE TABLE IF NOT EXISTS work_tag (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL UNIQUE,
     color TEXT NOT NULL DEFAULT '#6b7280'
   )`,
  `CREATE TABLE IF NOT EXISTS work_item_tag (
     item_id TEXT NOT NULL REFERENCES work_item(id) ON DELETE CASCADE,
     tag_id TEXT NOT NULL REFERENCES work_tag(id) ON DELETE CASCADE,
     PRIMARY KEY (item_id, tag_id)
   )`,
  'CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)'
]

export function migrate(db: WorkPlanDatabase): void {
  for (const sql of STATEMENTS) db.exec(sql)
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING'
  ).run('schema_version', String(SCHEMA_VERSION))
}

export function readSchemaVersion(db: WorkPlanDatabase): number | null {
  const row = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get() as
    | { value: string }
    | undefined
  return row ? Number(row.value) : null
}
