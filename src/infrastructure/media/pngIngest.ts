import { nativeImage, type NativeImage } from 'electron'
import { scaledDimensions, shouldDownscale } from '../../domain/workItem/attachmentNaming'
import type { AttachmentRef } from '../../domain/workItem/WorkItem'
import type { AttachmentFileStore, SavedAttachment } from '../storage/attachmentFileStore'

/** 统一入口：任何来源的图都走 nativeImage 解码 → 必要时缩长边 → PNG 落盘。 */
export function persistNativeImage(
  store: AttachmentFileStore,
  itemId: string,
  image: NativeImage,
  croppedFrom: string | null
): AttachmentRef | null {
  if (image.isEmpty()) return null
  const size = image.getSize()
  const prepared = shouldDownscale(size.width, size.height)
    ? image.resize(scaledDimensions(size.width, size.height))
    : image

  const saved = store.savePng(itemId, prepared.toPNG(), prepared.getSize(), croppedFrom)
  return saved ? toAttachmentRef(saved) : null
}

export function persistPngBuffer(
  store: AttachmentFileStore,
  itemId: string,
  png: Uint8Array,
  croppedFrom: string | null
): AttachmentRef | null {
  return persistNativeImage(store, itemId, nativeImage.createFromBuffer(Buffer.from(png)), croppedFrom)
}

export function imageFromFile(file: string): NativeImage | null {
  const image = nativeImage.createFromPath(file)
  return image.isEmpty() ? null : image
}

export function toAttachmentRef(saved: SavedAttachment): AttachmentRef {
  return {
    id: saved.id,
    relPath: saved.relPath,
    bytes: saved.bytes,
    width: saved.width,
    height: saved.height,
    croppedFrom: saved.croppedFrom
  }
}
