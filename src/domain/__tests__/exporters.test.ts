import { describe, expect, it } from 'vitest'
import { toMarkdown } from '../export/markdownExporter'
import { toCsv } from '../export/csvExporter'
import { TODAY, makeAttachment, makeItem, makeTag } from './workItemFixtures'

const FIXTURES = [
  makeItem({
    title: '线上告警复盘',
    lane: 'urgent',
    plannedDate: '2026-10-07',
    noteMd: '先看网关日志\n再拉值班同学',
    tags: [makeTag('值班', 'tv')],
    attachments: [makeAttachment('attachments/2026/10/aaaa1111.png')]
  }),
  makeItem({ title: '周报', lane: 'urgent', status: 'done', doneAt: '2026-10-06T09:00:00.000Z' }),
  makeItem({ title: '重构', lane: 'later', plannedDate: '2026-11-01' }),
  makeItem({ title: '带,逗号和"引号"的任务', lane: 'today', noteMd: '正文里也有,逗号' })
]

describe('Markdown 导出', () => {
  it('三档顺序与看板一致，完成项打 [x]', () => {
    const md = toMarkdown(FIXTURES, TODAY)
    expect(md.indexOf('## 加急')).toBeLessThan(md.indexOf('## 今天'))
    expect(md.indexOf('## 今天')).toBeLessThan(md.indexOf('## 以后'))
    expect(md).toContain('- [ ] **线上告警复盘**')
    expect(md).toContain('- [x] **周报**')
    expect(md).toContain('逾期 2026-10-07')
    expect(md).toContain('计划 2026-11-01')
    expect(md).toContain('`#值班`')
  })

  it('正文与截图以相对路径引用', () => {
    const md = toMarkdown(FIXTURES, TODAY)
    expect(md).toContain('先看网关日志')
    expect(md).toContain('![](attachments/2026/10/aaaa1111.png)')
  })

  it('空档写占位而不是漏掉整节', () => {
    const md = toMarkdown([makeItem({ lane: 'urgent', title: '只有一条' })], TODAY)
    expect(md).toContain('_（空）_')
    expect(md).toContain('## 今天（在办 0 / 逾期 0）')
  })
})

describe('CSV 导出', () => {
  it('带 BOM、CRLF 换行、列数固定', () => {
    const csv = toCsv(FIXTURES, TODAY)
    expect(csv.startsWith('')).toBe(true)
    const lines = csv.slice(1).trimEnd().split('\r\n')
    expect(lines[0].split(',')).toHaveLength(8)
    for (const line of lines) {
      // 每行以引号开头结尾，内部逗号被引号包住，列数按记录解析而不是按逗号计数
      expect(line.startsWith('"') && line.endsWith('"')).toBe(true)
    }
    expect(lines.length).toBe(1 + FIXTURES.length)
  })

  it('字段内的引号按 RFC4180 双写', () => {
    const csv = toCsv([makeItem({ title: 'a"b', noteMd: 'x,y' })], TODAY)
    expect(csv).toContain('"a""b"')
    expect(csv).toContain('"x,y"')
  })

  it('多张截图用分号拼在一个单元格', () => {
    const item = makeItem({
      title: '两张图',
      attachments: [makeAttachment('attachments/2026/10/aaaa1111.png'), makeAttachment('attachments/2026/10/bbbb2222.png')]
    })
    expect(toCsv([item], TODAY)).toContain('attachments/2026/10/aaaa1111.png;attachments/2026/10/bbbb2222.png')
  })
})
