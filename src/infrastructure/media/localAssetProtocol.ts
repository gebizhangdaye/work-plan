import { net, protocol } from 'electron'
import { pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { isSafeAttachmentRelPath } from '../../domain/workItem/attachmentNaming'
import type { DataPaths } from '../storage/appDataPaths'

const SCHEME = 'app'

/** 必须在 app.ready 之前调用，否则自定义 scheme 拿不到标准权限。 */
export function registerAssetSchemePrivileged(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

export function attachAssetHandler(paths: DataPaths): void {
  // 必须是裸 scheme：protocol.handle('app://', …) 不会命中，<img> 直接 0x0（离屏探针 A/B 实测）
  protocol.handle(SCHEME, async (request) => {
    const relPath = relPathFrom(request.url)
    const absolute = relPath ? path.join(paths.root, relPath) : null

    if (!absolute || !existsSync(absolute)) return notFound()
    try {
      return await net.fetch(pathToFileURL(absolute).toString())
    } catch {
      return notFound()
    }
  })
}

/** app://assets/attachments/2026/10/x.png → attachments/2026/10/x.png */
function relPathFrom(url: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '')
  } catch {
    return null
  }
  return isSafeAttachmentRelPath(decoded) ? decoded : null
}

function notFound(): Response {
  return new Response('not found', { status: 404 })
}
