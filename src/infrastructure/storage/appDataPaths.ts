import { mkdirSync } from 'node:fs'
import path from 'node:path'

export interface DataPaths {
  root: string
  dbFile: string
  attachmentsDir: string
  backupDir: string
}

/** 纯函数式构造，测试可用 tmpdir 注入；生产走 resolveFromEnv。 */
export function createDataPaths(root: string): DataPaths {
  return {
    root,
    dbFile: path.join(root, 'workplan.db'),
    attachmentsDir: path.join(root, 'attachments'),
    backupDir: path.join(root, 'backups')
  }
}

export function ensureDataDirs(paths: DataPaths): DataPaths {
  mkdirSync(paths.attachmentsDir, { recursive: true })
  mkdirSync(paths.backupDir, { recursive: true })
  return paths
}

/** relPath 始终以 attachments/ 开头，这里换成绝对路径并守住根目录边界。 */
export function resolveAttachmentFile(paths: DataPaths, relPath: string): string | null {
  if (!relPath.startsWith('attachments/')) return null
  const absolute = path.resolve(paths.root, relPath)
  const rootPrefix = paths.attachmentsDir.split(path.sep).join(path.sep)
  if (!absolute.startsWith(rootPrefix + path.sep)) return null
  return absolute
}
