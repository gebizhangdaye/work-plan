import type { AttachmentRef } from '../../domain/workItem/WorkItem'
import type { AttachmentFileStore } from '../storage/attachmentFileStore'
import { persistPngBuffer } from './pngIngest'

const PNG_DATA_URL = /^data:image\/png;base64,/
const PNG_DATA_URL_PREFIX = 'data:image/png;base64,'
const MAX_DATA_URL_CHARS = 16_000_000

/** 渲染层 canvas 裁完交回的 data URL；来源附件 id 记在 cropped_from 上。 */
export function addCroppedImage(
  store: AttachmentFileStore,
  itemId: string,
  dataUrl: string,
  sourceAttachmentId: string
): AttachmentRef | null {
  if (dataUrl.length > MAX_DATA_URL_CHARS || !PNG_DATA_URL.test(dataUrl)) return null

  const png = Buffer.from(dataUrl.slice(PNG_DATA_URL_PREFIX.length), 'base64')
  return persistPngBuffer(store, itemId, png, sourceAttachmentId)
}
