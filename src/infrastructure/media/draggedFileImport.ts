import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { AttachmentRef } from '../../domain/workItem/WorkItem'
import type { AttachmentFileStore } from '../storage/attachmentFileStore'
import type { WorkPlanDatabase } from '../db/DatabaseConnection'
import { inTransaction } from '../db/DatabaseConnection'
import { imageFromFile, persistNativeImage } from './pngIngest'

const IMAGE_EXTENSION = /\.(png|jpe?g|bmp|gif|webp)$/i

/**
 * 拖进来的图一律复制进附件目录（原文件保持原位、不动不改名）。
 * 整个导入包在一个事务里，避免逐张图来回打库。
 */
export function importDroppedFiles(
  db: WorkPlanDatabase,
  store: AttachmentFileStore,
  itemId: string,
  files: readonly string[]
): AttachmentRef[] {
  const workspace = mkdtempSync(path.join(tmpdir(), 'wp-drop-'))
  const refs: AttachmentRef[] = []

  try {
    const staged = stageImages(files, workspace)
    inTransaction(db, () => {
      for (const image of staged) {
        const saved = persistNativeImage(store, itemId, image, null)
        if (saved) refs.push(saved)
      }
    })
  } finally {
    rmSync(workspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
  return refs
}

function stageImages(files: readonly string[], workspace: string) {
  const staged = []
  for (const file of files) {
    if (!IMAGE_EXTENSION.test(file) || !existsSync(file)) continue
    const copy = path.join(workspace, path.basename(file))
    copyFileSync(file, copy)
    const image = imageFromFile(copy)
    if (image) staged.push(image)
  }
  return staged
}
