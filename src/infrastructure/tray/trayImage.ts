import { nativeImage, type NativeImage } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import { IS_MAC } from '../platform/osPlatform'

/**
 * Windows 用带色的 tray.png；macOS 用模板图（系统按菜单栏明暗自己上色，带色的那份在
 * 深色菜单栏上就是一块色斑），并把 @2x 那一档显式挂上去。
 *
 * @2x 走 addRepresentation 而不是赌 NSImage 靠 `name@2x.png` 文件名自动配对：
 * 配对行为在这套打包产物布局下没实测过，挂上去是文档里写明的能力。
 */
export function buildTrayImage(iconFile: string, templateFile: string): NativeImage | null {
  const file = IS_MAC ? templateFile : iconFile
  const image = fromPath(file)
  if (!image) return null
  if (!IS_MAC) return image

  addRetinaRepresentation(image, templateFile)
  image.setTemplateImage(true)
  return image
}

function fromPath(file: string): NativeImage | null {
  const image = nativeImage.createFromPath(file)
  if (!image.isEmpty()) return image
  console.warn('[tray] 图标加载失败:', file)
  return null
}

function addRetinaRepresentation(image: NativeImage, templateFile: string): void {
  const at2x = templateFile.replace(/\.png$/, '@2x.png')
  if (!existsSync(at2x)) return
  const hi = fromPath(at2x)
  if (!hi) return

  const base = image.getSize().width
  const { width } = hi.getSize()
  if (width <= base) return
  image.addRepresentation({ buffer: readFileSync(at2x), width, height: width, scaleFactor: width / base })
}
