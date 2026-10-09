/** 长边超过该值就缩放落盘（微信 4K 截图约 5MB/张）。 */
export const MAX_LONG_EDGE_PX = 2000

const REL_PATH_PATTERN = /^attachments\/\d{4}\/\d{2}\/[0-9a-f]{8,32}\.png$/

export interface AttachmentSlot {
  relPath: string
  fileName: string
}

/** 附件一律按 attachments/YYYY/MM/&lt;sha 前 8 位&gt;.png 落盘，库里只存相对路径。 */
export function buildRelPath(sha256: string, takenAt: Date): AttachmentSlot {
  const year = takenAt.getUTCFullYear()
  const month = String(takenAt.getUTCMonth() + 1).padStart(2, '0')
  const fileName = `${sha256.slice(0, 8).toLowerCase()}.png`
  const relPath = `attachments/${year}/${month}/${fileName}`
  return { relPath, fileName }
}

/** 协议层的第一道闸：只接受我们自己生成的相对路径，杜绝 ../ 穿越。 */
export function isSafeAttachmentRelPath(relPath: string): boolean {
  return REL_PATH_PATTERN.test(relPath)
}

export function assetUrlFor(relPath: string): string {
  if (!isSafeAttachmentRelPath(relPath)) throw new Error(`非法附件路径: ${relPath}`)
  return `app://assets/${relPath}`
}

export function shouldDownscale(width: number, height: number): boolean {
  return Math.max(width, height) > MAX_LONG_EDGE_PX
}

export function scaledDimensions(width: number, height: number): { width: number; height: number } {
  if (!shouldDownscale(width, height)) return { width, height }
  const ratio = MAX_LONG_EDGE_PX / Math.max(width, height)
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  }
}
