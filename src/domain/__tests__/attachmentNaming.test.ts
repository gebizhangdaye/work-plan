import { describe, expect, it } from 'vitest'
import {
  MAX_LONG_EDGE_PX,
  assetUrlFor,
  buildRelPath,
  isSafeAttachmentRelPath,
  scaledDimensions,
  shouldDownscale
} from '../workItem/attachmentNaming'

const SHA = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

describe('附件命名与路径安全', () => {
  it('按 attachments/YYYY/MM/<sha8>.png 生成', () => {
    const slot = buildRelPath(SHA, new Date(Date.UTC(2026, 9, 8)))
    expect(slot.relPath).toBe('attachments/2026/10/e3b0c442.png')
    expect(slot.fileName).toBe('e3b0c442.png')
  })

  it('月份补零', () => {
    expect(buildRelPath(SHA, new Date(Date.UTC(2026, 0, 5))).relPath).toContain('/2026/01/')
  })

  it('只接受自产相对路径，拒绝穿越与外链', () => {
    expect(isSafeAttachmentRelPath('attachments/2026/10/e3b0c442.png')).toBe(true)
    expect(isSafeAttachmentRelPath('../../Windows/system.ini')).toBe(false)
    expect(isSafeAttachmentRelPath('attachments/2026/10/../../secret.png')).toBe(false)
    expect(isSafeAttachmentRelPath('attachments/2026/10/E3B0C442.PNG')).toBe(false)
    expect(isSafeAttachmentRelPath('http://x/a.png')).toBe(false)
  })

  it('非法路径直接抛，不给渲染层拼出危险 URL 的机会', () => {
    expect(assetUrlFor('attachments/2026/10/e3b0c442.png')).toBe(
      'app://assets/attachments/2026/10/e3b0c442.png'
    )
    expect(() => assetUrlFor('../x.png')).toThrow(/非法附件路径/)
  })

  it('超过长边才缩放，且保持比例', () => {
    expect(shouldDownscale(1440, 900)).toBe(false)
    expect(shouldDownscale(3840, 2160)).toBe(true)
    expect(scaledDimensions(3840, 2160)).toEqual({ width: MAX_LONG_EDGE_PX, height: 1125 })
    expect(scaledDimensions(900, 4000)).toEqual({ width: 450, height: MAX_LONG_EDGE_PX })
  })
})
