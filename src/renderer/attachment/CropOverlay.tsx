import { Check, X } from '@phosphor-icons/react'
import { useState } from 'react'
import Cropper from 'react-easy-crop'
import { cropToDataUrl, type CropPixels } from './cropPixels'

/** 选区叠层交给 react-easy-crop，不自己画矩形。 */
export function CropOverlay({
  image,
  onSave,
  onCancel
}: {
  image: string
  onSave: (dataUrl: string) => void
  onCancel: () => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<CropPixels | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(): Promise<void> {
    if (!area) return
    setBusy(true)
    try {
      onSave(await cropToDataUrl(image, area))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cropper" onClick={(event) => event.stopPropagation()}>
      <Cropper
        image={image}
        crop={crop}
        zoom={zoom}
        aspect={undefined}
        onCropChange={setCrop}
        onZoomChange={setZoom}
        onCropComplete={(_type, pixels) => setArea(pixels)}
      />
      <div className="crop-tools">
        <label className="zoom">
          放大
          <input
            type="range"
            min={1}
            max={4}
            step={0.1}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
        <button type="button" className="btn primary" disabled={busy || !area} onClick={() => void save()}>
          <Check size={13} weight="bold" />
          存为新截图
        </button>
        <button type="button" className="icon-btn" onClick={onCancel} title="取消">
          <X size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}
