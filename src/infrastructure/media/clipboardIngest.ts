import { clipboard, nativeImage } from 'electron'
import type { AttachmentRef } from '../../domain/workItem/WorkItem'
import type { AttachmentFileStore } from '../storage/attachmentFileStore'
import { persistNativeImage } from './pngIngest'

/**
 * Electron 44 起 clipboard 换成异步 ClipboardItem 模型（readImage 这类同步 API 已移除），
 * 所以取图必须是 read() → 找 image/png → getType() → Blob → buffer。
 */
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/bmp', 'image/tiff']

export async function ingestClipboardImage(
  store: AttachmentFileStore,
  itemId: string
): Promise<AttachmentRef | null> {
  const entries = await clipboard.read()

  for (const entry of entries) {
    const mime = IMAGE_TYPES.find((candidate) => entry.types.includes(candidate))
    if (!mime) continue

    const blob = await entry.getType(mime)
    // getType 的返回类型含 bookmark 分支，图片一定走 Blob
    if (!('arrayBuffer' in blob)) continue
    const image = nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()))
    const saved = persistNativeImage(store, itemId, image, null)
    if (saved) return saved
  }
  return null
}
