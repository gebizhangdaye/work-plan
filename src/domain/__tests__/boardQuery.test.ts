import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS, buildBoard, isDueOn, isOverdue } from '../query/boardQuery'
import { collectTagCounts, matchesTags } from '../query/tagFilter'
import { matchesQuery } from '../query/textMatcher'
import { TODAY, makeItem, makeTag } from './workItemFixtures'

describe('逾期与列归属', () => {
  it('逾期只针对未完成且计划日已过', () => {
    expect(isOverdue(makeItem({ plannedDate: '2026-10-07' }), TODAY)).toBe(true)
    expect(isOverdue(makeItem({ plannedDate: TODAY }), TODAY)).toBe(false)
    expect(isOverdue(makeItem({ plannedDate: '2026-10-07', status: 'done' }), TODAY)).toBe(false)
    expect(isOverdue(makeItem({ plannedDate: null }), TODAY)).toBe(false)
    expect(isDueOn(makeItem({ plannedDate: TODAY }), TODAY)).toBe(true)
  })

  it('逾期排最前，今天到期其次，未填日期与未来日期不隐藏', () => {
    const column = buildBoard(
      [
        makeItem({ title: '未来', lane: 'today', plannedDate: '2026-11-01', rank: 100 }),
        makeItem({ title: '逾期', lane: 'today', plannedDate: '2026-10-01', rank: 200 }),
        makeItem({ title: '无日期', lane: 'today', plannedDate: null, rank: 300 }),
        makeItem({ title: '今天', lane: 'today', plannedDate: TODAY, rank: 400 })
      ],
      EMPTY_FILTERS,
      TODAY
    )[1]

    expect(column.items.map((i) => i.title)).toEqual(['逾期', '今天', '未来', '无日期'])
    expect(column.openCount).toBe(4)
    expect(column.overdueCount).toBe(1)
  })

  it('完成项一律沉底并按完成时间倒序', () => {
    const column = buildBoard(
      [
        makeItem({ title: '在办', lane: 'urgent', rank: 1 }),
        makeItem({ title: '早完成', lane: 'urgent', status: 'done', doneAt: '2026-10-01T00:00:00Z', rank: 2 }),
        makeItem({ title: '刚完成', lane: 'urgent', status: 'done', doneAt: '2026-10-07T00:00:00Z', rank: 3 })
      ],
      EMPTY_FILTERS,
      TODAY
    )[0]

    expect(column.items.map((i) => i.title)).toEqual(['在办', '刚完成', '早完成'])
  })

  it('三列按档位分派且列头带中文标签', () => {
    const board = buildBoard(
      [makeItem({ lane: 'urgent' }), makeItem({ lane: 'later' })],
      EMPTY_FILTERS,
      TODAY
    )
    expect(board.map((c) => [c.label, c.items.length])).toEqual([
      ['加急', 1],
      ['今天', 0],
      ['以后', 1]
    ])
  })
})

describe('搜索', () => {
  it('标题/正文/标签名三路都能命中', () => {
    const byTitle = makeItem({ title: '联调支付回调' })
    const byNote = makeItem({ noteMd: '对方要求本周五给' })
    const byTag = makeItem({ tags: [makeTag('百补')] })

    expect(matchesQuery(byTitle, '支付回调')).toBe(true)
    expect(matchesQuery(byNote, '周五')).toBe(true)
    expect(matchesQuery(byTag, '百补')).toBe(true)
    expect(matchesQuery(byTitle, '不存在')).toBe(false)
  })

  it('多词是 AND，空查询不过滤', () => {
    const item = makeItem({ title: '导出报表', noteMd: 'csv' })
    expect(matchesQuery(item, '导出 csv')).toBe(true)
    expect(matchesQuery(item, '导出 不存在')).toBe(false)
    expect(matchesQuery(item, '   ')).toBe(true)
  })
})

describe('标签过滤', () => {
  it('多选标签走 AND', () => {
    const item = makeItem({ tags: [makeTag('a', 'ta'), makeTag('b', 'tb')] })
    expect(matchesTags(item, ['ta', 'tb'])).toBe(true)
    expect(matchesTags(item, ['ta', 'tc'])).toBe(false)
    expect(matchesTags(item, [])).toBe(true)
  })

  it('计数与组合过滤（搜索 + 标签同时生效）', () => {
    const tagged = makeItem({ title: '线上告警', tags: [makeTag('值班', 'tv')] })
    const board = buildBoard([tagged, makeItem({ title: '线上演练' })], { search: '线上', tagIds: ['tv'] }, TODAY)
    expect(board[0].items.length).toBe(0)
    expect(board[1].items.length).toBe(1)
    expect(collectTagCounts([tagged]).get('tv')).toBe(1)
  })
})
