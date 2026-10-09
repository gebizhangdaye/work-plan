import { useEffect, useState } from 'react'
import { Crop, FolderOpen, X } from '@phosphor-icons/react'
import { assetUrlFor } from '@domain/workItem/attachmentNaming'
import type { AttachmentRef, WorkItem } from '@domain/workItem/WorkItem'
import type { WorkBoard } from '../state/useWorkBoard'
import { CropOverlay } from './CropOverlay'

interface Located {
  item: WorkItem
  attachment: AttachmentRef
}

export function LightboxViewer({ board }: { board: WorkBoard }) {
  const [cropping, setCropping] = useState(false)
  const found = locate(board.items, board.lightboxId)

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!found) return null

  function close(): void {
    setCropping(false)
    board.setLightboxId(null)
  }

  const url = assetUrlFor(found.attachment.relPath)

  return (
    <div className="lightbox" onClick={close}>
      {cropping ? (
        <CropOverlay
          image={url}
          onCancel={() => setCropping(false)}
          onSave={(dataUrl) => {
            board.actions.addCropped(found.item.id, dataUrl, found.attachment.id)
          }}
        />
      ) : (
        <img
          className="lightbox-image"
          src={url}
          alt={found.item.title}
          onClick={(event) => event.stopPropagation()}
        />
      )}

      <div className="lightbox-bar" onClick={(event) => event.stopPropagation()}>
        <span className="caption">
          {found.item.title} · {found.attachment.width}×{found.attachment.height}
        </span>
        {cropping ? null : (
          <button type="button" className="btn" onClick={() => setCropping(true)}>
            <Crop size={13} />
            裁剪这一块
          </button>
        )}
        <button
          type="button"
          className="btn"
          onClick={() => board.actions.openInFolder(found.attachment.relPath)}
        >
          <FolderOpen size={13} />
          所在文件夹
        </button>
        <button type="button" className="icon-btn" onClick={close} title="关闭">
          <X size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}

function locate(items: readonly WorkItem[], attachmentId: string | null): Located | null {
  if (!attachmentId) return null
  for (const item of items) {
    const attachment = item.attachments.find((candidate) => candidate.id === attachmentId)
    if (attachment) return { item, attachment }
  }
  return null
}
