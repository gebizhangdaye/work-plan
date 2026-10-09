import { mkdtempSync, rmSync, existsSync, readdirSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDataPaths, ensureDataDirs, type DataPaths } from '../storage/appDataPaths'
import { openDatabase, type WorkPlanDatabase } from '../db/DatabaseConnection'
import { SCHEMA_VERSION, migrate, readSchemaVersion } from '../db/schemaMigration'
import { InvalidWorkItemDraft, WorkItemSqlRepository } from '../db/workItemSqlRepository'
import { TagSqlRepository } from '../db/tagRepository'
import { AttachmentFileStore } from '../storage/attachmentFileStore'
import { BACKUP_KEEP, backupOnStartup } from '../db/repositoryBackup'

let root: string
let paths: DataPaths
let db: WorkPlanDatabase
let items: WorkItemSqlRepository

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), 'work-plan-'))
  paths = ensureDataDirs(createDataPaths(root))
  db = openDatabase(paths.dbFile)
  migrate(db)
  items = new WorkItemSqlRepository(db)
})

afterEach(() => {
  db.close()
  rmSync(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 120 })
})

describe('迁移', () => {
  it('空库建齐 5 张表并写入版本号，重复执行不报错', () => {
    migrate(db)
    expect(readSchemaVersion(db)).toBe(SCHEMA_VERSION)
    const names = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
    expect(names.map((n) => n.name)).toEqual([
      'app_meta',
      'work_attachment',
      'work_item',
      'work_item_tag',
      'work_tag'
    ])
  })
})

describe('任务仓储', () => {
  it('增改勾删都能落库，重启后读回一致', () => {
    const created = items.create({ title: '联调支付回调', lane: 'urgent', noteMd: '对端周五给' })
    items.update(created.id, { title: '联调支付回调', noteMd: '对端已给，改我方', lane: 'urgent' })
    const toggled = items.toggleDone(created.id)
    expect(toggled.status).toBe('done')
    expect(toggled.doneAt).toMatch(/^20/)
    const id = created.id
    db.close()

    const reopenedDb = openDatabase(paths.dbFile)
    const [found] = new WorkItemSqlRepository(reopenedDb).listAll()
    expect(found.id).toBe(id)
    expect(found.noteMd).toBe('对端已给，改我方')
    expect(found.lane).toBe('urgent')
    reopenedDb.close()
    db = openDatabase(paths.dbFile)
  })

  it('空标题与非法日期被拒', () => {    expect(() => items.create({ title: '   ' })).toThrow(InvalidWorkItemDraft)
    expect(() => items.create({ title: 'ok', plannedDate: '昨天' })).toThrow(InvalidWorkItemDraft)
    expect(items.listAll().length).toBe(0)
  })

  it('取消完成回到在办，done_at 清空', () => {
    const created = items.create({ title: '写周报' })
    const done = items.toggleDone(created.id)
    expect(items.toggleDone(done.id).doneAt).toBeNull()
  })

  it('跨列拖动改 lane 并插到指定那条之前', () => {
    const keep1 = items.create({ title: 'a', lane: 'later' })
    const keep2 = items.create({ title: 'b', lane: 'later' })
    const moving = items.create({ title: 'c', lane: 'urgent' })

    items.moveTo(moving.id, 'later', keep2.id)
    const column = items
      .listAll()
      .filter((item) => item.lane === 'later')
      .sort((a, b) => a.rank - b.rank)

    expect(column.map((i) => i.title)).toEqual(['a', 'c', 'b'])

    // beforeId 为 null 是追加到末尾
    items.moveTo(moving.id, 'later', null)
    const appended = items
      .listAll()
      .filter((item) => item.lane === 'later')
      .sort((a, b) => a.rank - b.rank)
    expect(appended.map((i) => i.title)).toEqual(['a', 'b', 'c'])
    expect(keep1.id).not.toBe(keep2.id)
  })

  it('删除任务连带清掉附件行与标签关联', () => {
    const item = items.create({ title: '带图任务' })
    const tags = new TagSqlRepository(db)
    const tag = tags.ensureTag('值班')
    tags.attach(item.id, tag.id)
    const files = new AttachmentFileStore(paths, db)
    files.savePng(item.id, pngBytes('one'), { width: 4, height: 3 }, null)

    const orphaned = items.remove(item.id)
    expect(orphaned.length).toBe(1)
    expect(db.prepare('SELECT COUNT(*) AS n FROM work_attachment').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT COUNT(*) AS n FROM work_item_tag').get()).toEqual({ n: 0 })
    expect(files.releaseFiles(orphaned)).toBe(1)
    expect(existsSync(path.join(root, orphaned[0]))).toBe(false)
  })
})

describe('附件去重', () => {
  it('同任务重复粘同一张图只一条记录，不同任务共用同一个文件', () => {
    const store = new AttachmentFileStore(paths, db)
    const a = items.create({ title: 'A' })
    const b = items.create({ title: 'B' })
    const bytes = pngBytes('same')

    expect(store.savePng(a.id, bytes, { width: 2, height: 2 }, null)).not.toBeNull()
    expect(store.savePng(a.id, bytes, { width: 2, height: 2 }, null)).toBeNull()
    const shared = store.savePng(b.id, bytes, { width: 2, height: 2 }, null)
    expect(shared?.relPath).toBe(items.getById(a.id)?.attachments[0].relPath)
    expect(readdirSyncCount(paths.attachmentsDir)).toBe(1)

    // 删掉 A 之后 B 还指着同一个文件，不能误删
    const removedFromA = items.remove(a.id)
    expect(store.releaseFiles(removedFromA)).toBe(0)
    expect(existsSync(path.join(root, removedFromA[0]))).toBe(true)
    expect(store.releaseFiles(items.remove(b.id))).toBe(1)
  })
})

describe('标签与备份', () => {
  it('同名标签只建一次', () => {
    const tags = new TagSqlRepository(db)
    expect(tags.ensureTag('百补').id).toBe(tags.ensureTag('百补').id)
    expect(tags.listAll()[0].usage).toBe(0)
  })

  it('备份只保留最近若干份', () => {
    const item = items.create({ title: '占位' })
    expect(item.title).toBe('占位')
    for (let i = 0; i < BACKUP_KEEP + 3; i += 1) {
      writeFileSync(path.join(paths.backupDir, `workplan-2020-01-01T00-00-00-0${i}00Z.db`), 'x')
    }
    expect(backupOnStartup(paths, db)).toMatch(/workplan-.*\.db$/)
    const kept = readdirSync(paths.backupDir).filter((n) => n.endsWith('.db'))
    expect(kept.length).toBe(BACKUP_KEEP)
  })
})

function pngBytes(marker: string): Uint8Array {
  // 不是真 PNG，只当字节流用；sha 不同即视为不同图
  return new TextEncoder().encode(`PNG:${marker}`)
}

function readdirSyncCount(dir: string): number {
  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += entry.isDirectory() ? readdirSyncCount(path.join(dir, entry.name)) : 1
  }
  return total
}
