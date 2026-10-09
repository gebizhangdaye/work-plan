import { describe, expect, it } from 'vitest'
import { LANES, LANE_LABELS, assertLane, isLane, nextLane } from '../workItem/priorityLanes'
import { rowToWorkItem, workItemToRow } from '../workItem/workItemCodec'
import { TITLE_MAX_LENGTH, isPlausibleDate, validateDraft } from '../workItem/workItemValidator'
import { makeItem } from './workItemFixtures'

describe('三档泳道语义', () => {
  it('只有加急/今天/以后三档', () => {
    expect(LANES).toEqual(['urgent', 'today', 'later'])
    expect(LANE_LABELS.urgent).toBe('加急')
    expect(LANE_LABELS.today).toBe('今天')
    expect(LANE_LABELS.later).toBe('以后')
  })

  it('isLane 拒绝非档位值', () => {
    expect(isLane('urgent')).toBe(true)
    expect(isLane('asap')).toBe(false)
    expect(isLane(undefined)).toBe(false)
    expect(() => assertLane('asap')).toThrow(/非法泳道值/)
  })

  it('nextLane 循环切换', () => {
    expect(nextLane('urgent')).toBe('today')
    expect(nextLane('today')).toBe('later')
    expect(nextLane('later')).toBe('urgent')
  })
})

describe('输入校验', () => {
  it('空或纯空白标题被拒', () => {
    expect(validateDraft({ title: '' })).toEqual([{ field: 'title', message: '标题不能为空' }])
    expect(validateDraft({ title: '   ' })).toEqual([{ field: 'title', message: '标题不能为空' }])
  })

  it('超长标题被拒', () => {
    expect(validateDraft({ title: 'x'.repeat(TITLE_MAX_LENGTH + 1) })[0].field).toBe('title')
  })

  it('非法档位与非法日期被拒', () => {
    const issues = validateDraft({ title: 'ok', lane: 'asap' as never, plannedDate: '2026-02-30' })
    expect(issues.map((issue) => issue.field).sort()).toEqual(['lane', 'plannedDate'])
  })

  it('合法草稿无问题', () => {
    expect(validateDraft({ title: '联调接口', lane: 'urgent', plannedDate: '2026-10-09' })).toEqual([])
  })

  it('isPlausibleDate 识别闰年与不存在的日子', () => {
    expect(isPlausibleDate('2028-02-29')).toBe(true)
    expect(isPlausibleDate('2026-02-29')).toBe(false)
    expect(isPlausibleDate('2026-13-01')).toBe(false)
    expect(isPlausibleDate('2026/10/08')).toBe(false)
  })
})

describe('行 ↔ 实体互转', () => {
  it('往返保持字段一致', () => {
    const item = makeItem({ title: '写周报', noteMd: '含数据', lane: 'later', plannedDate: '2026-10-20' })
    expect(rowToWorkItem(workItemToRow(item), [], [])).toEqual({ ...item, attachments: [], tags: [] })
  })

  it('正文 null 归一成空串', () => {
    const row = { ...workItemToRow(makeItem()), note_md: null }
    expect(rowToWorkItem(row, [], []).noteMd).toBe('')
  })
})
