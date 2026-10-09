import { ImageSquare } from '@phosphor-icons/react'
import type { WorkItem } from '@domain/workItem/WorkItem'
import { assetUrlFor } from '@domain/workItem/attachmentNaming'
import type { WorkBoard } from '../state/useWorkBoard'

export function AttachmentGallery({ item, board }: { item: WorkItem; board: WorkBoard }) {
  if (item.attachments.length === 0) {
    return (
      <p className="empty inline">
        <ImageSquare size={20} />
        还没有截图，在上面的记录框里 Ctrl+V 就能贴进来
      </p>
    )
  }

  return (
    <div className="field">
      截图 {item.attachments.length} 张
      <div className="gallery">
        {item.attachments.map((attachment) => (
          <button
            key={attachment.id}
            type="button"
            className="tile"
            title={attachment.croppedFrom ? '裁剪出来的图' : '点开看大图'}
            onClick={() => board.setLightboxId(attachment.id)}
          >
            <img src={assetUrlFor(attachment.relPath)} alt={item.title} />
          </button>
        ))}
      </div>
    </div>
  )
}
