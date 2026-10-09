import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS, buildBoard } from '../query/boardQuery'
import { flattenForMini, tallyByLane } from '../query/miniList'
import { TODAY, makeItem, makeTag } from './workItemFixtures'

const COLUMNS = buildBoard(
  [
    makeItem({ title: '以后-普通', lane: 'later', rank: 10 }),
    makeItem({ title: '加急-逾期', lane: 'urgent', plannedDate: '2026-10-01', rank: 20 }),
    makeItem({ title: '今天-普通', lane: 'today', rank: 30 }),
    makeItem({ title: '加急-完成', lane: 'urgent', status: 'done', doneAt: '2026-10-05T00:00:00Z', rank: 40 }),
    makeItem({ title: '加急-普通', lane: 'urgent', rank: 50 }),
    makeItem({ title: '今天-到期', lane: 'today', plannedDate: TODAY, rank: 60 })
  ],
  EMPTY_FILTERS,
  TODAY
)

describe('小窗合并列表', () => {
  it('档序是 加急→今天→以后，档内沿用看板顺序', () => {
    expect(flattenForMini(COLUMNS, TODAY).map((e) => e.item.title)).toEqual([
      '加急-逾期',
      '加急-普通',
      '加急-完成',
      '今天-到期',
      '今天-普通',
      '以后-普通'
    ])
  })

  it('每条带上自己的档位', () => {
    const lanes = flattenForMini(COLUMNS, TODAY).map((e) => e.lane)
    expect(lanes).toEqual(['urgent', 'urgent', 'urgent', 'today', 'today', 'later'])
  })

  it('overdue 标记只对未完成且计划日已过的条目为真', () => {
    const flagged = flattenForMini(COLUMNS, TODAY).filter((e) => e.overdue).map((e) => e.item.title)
    expect(flagged).toEqual(['加急-逾期'])
  })

  it('计数沿用列头口径（在办数含逾期数）', () => {
    expect(tallyByLane(COLUMNS)).toEqual([
      { lane: 'urgent', label: '加急', open: 2, overdue: 1 },
      { lane: 'today', label: '今天', open: 2, overdue: 0 },
      { lane: 'later', label: '以后', open: 1, overdue: 0 }
    ])
  })

  it('过滤后的看板合并出来只剩命中项', () => {
    const filtered = buildBoard(
      [
        makeItem({ title: '线上告警', lane: 'urgent', tags: [makeTag('值班', 'tv')] }),
        makeItem({ title: '线上演练', lane: 'today' })
      ],
      { search: '线上', tagIds: ['tv'] },
      TODAY
    )
    const entries = flattenForMini(filtered, TODAY)
    expect(entries.map((e) => [e.item.title, e.lane])).toEqual([['线上告警', 'urgent']])
  })

  it('空看板合并成空列表而不是报错', () => {
    expect(flattenForMini(buildBoard([], EMPTY_FILTERS, TODAY), TODAY)).toEqual([])
  })
})
