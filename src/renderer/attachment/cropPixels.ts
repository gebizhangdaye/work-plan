export interface CropPixels {
  x: number
  y: number
  width: number
  height: number
}

/** 用原图像素坐标裁，避免 CSS 缩放后的尺寸失真；导出仍是 PNG。 */
export async function cropToDataUrl(src: string, area: CropPixels): Promise<string> {
  const image = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(area.width))
  canvas.height = Math.max(1, Math.round(area.height))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('画布不可用')

  context.drawImage(
    image,
    Math.round(area.x),
    Math.round(area.y),
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  )
  return canvas.toDataURL('image/png')
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`图片加载失败: ${src}`))
    image.src = src
  })
}
