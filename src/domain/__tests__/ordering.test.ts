import { describe, expect, it } from 'vitest'
import {
  MIN_RANK_GAP,
  RANK_STEP,
  needsNormalization,
  normalizeRanks,
  orderAfterMove,
  planRankAssignment,
  rankBetween,
  sortByRank,
  tailRank
} from '../workItem/ordering'

describe('同档内排序权重', () => {
  it('空列首个 rank 是步长，尾部追加取最大值加步长', () => {
    expect(rankBetween(undefined, undefined)).toBe(RANK_STEP)
    expect(tailRank([])).toBe(RANK_STEP)
    expect(tailRank([{ id: 'a', rank: 3000 }, { id: 'b', rank: 1000 }])).toBe(4000)
  })

  it('间隙法取中点，插到最前允许出现 0 或负值', () => {
    expect(rankBetween(1000, 2000)).toBe(1500)
    expect(rankBetween(undefined, 1000)).toBe(0)
    expect(rankBetween(1000, undefined)).toBe(2000)
  })

  it('反复往同一缝隙插：rank 持续唯一递减，够窄时归一化判据翻真', () => {
    const items: { id: string; rank: number }[] = [
      { id: 'head', rank: 1000 },
      { id: 'tail', rank: 2000 }
    ]
    let low = 1000
    let flippedAt = -1

    for (let i = 0; i < 100 && flippedAt < 0; i += 1) {
      const high = 2000
      const rank = rankBetween(low, high)
      items.push({ id: `x${i}`, rank })
      low = rank
      if (needsNormalization(items)) flippedAt = i + 1
    }

    const sorted = sortByRank(items)
    expect(new Set(sorted.map((i) => i.rank)).size).toBe(sorted.length)
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].rank).toBeGreaterThan(sorted[i - 1].rank)
    }
    expect(sorted[0].id).toBe('head')
    expect(sorted.at(-1)?.id).toBe('tail')
    // 每插一次间隙减半，约 30 次内就该触发归一化判据
    expect(flippedAt).toBeGreaterThanOrEqual(25)
    expect(flippedAt).toBeLessThanOrEqual(40)

    const normalized = normalizeRanks(items)
    expect(needsNormalization(sortByRank(items.map((i) => ({ ...i, rank: normalized[i.id] })))))
      .toBe(false)
  })

  it('间隙小于阈值时判定需要归一化，归一化后顺序不变、回到步长', () => {
    const tight = [
      { id: 'a', rank: 1 },
      { id: 'b', rank: 1 + MIN_RANK_GAP / 2 },
      { id: 'c', rank: 9 }
    ]
    expect(needsNormalization(tight)).toBe(true)

    const normalized = normalizeRanks(tight)
    expect(normalized).toEqual({ a: 1000, b: 2000, c: 3000 })
    expect(needsNormalization(sortByRank(tight.map((i) => ({ ...i, rank: normalized[i.id] })))))
      .toBe(false)
  })

  it('planRankAssignment 常规只写一条，压不动时整列重写', () => {
    const items = [{ id: 'a', rank: 1000 }, { id: 'b', rank: 2000 }, { id: 'c', rank: 3000 }]
    const toFront = planRankAssignment(items, 'c', 0)
    expect(toFront.normalized).toBe(false)
    // 移到最前 = 比当前头部再低一个步长，允许 0 与负值
    expect(toFront.ranks).toEqual({ c: 0 })

    const between = planRankAssignment(items, 'c', 1)
    expect(between.ranks).toEqual({ c: 1500 })

    const crowded = [
      { id: 'a', rank: 1000 },
      { id: 'b', rank: 1000 + MIN_RANK_GAP / 3 },
      { id: 'c', rank: 3000 }
    ]
    // 把 c 插进 a/b 之间那条已经压不动的缝隙，必须触发整列重写
    const forced = planRankAssignment(crowded, 'c', 1)
    expect(forced.normalized).toBe(true)
    expect(forced.ranks).toEqual({ a: 1000, c: 2000, b: 3000 })
  })

  it('orderAfterMove 越界索引夹到两端，未知 id 原样返回', () => {
    const items = sortByRank([
      { id: 'a', rank: 30 },
      { id: 'b', rank: 10 },
      { id: 'c', rank: 20 }
    ])
    expect(orderAfterMove(items, 'a', 99).map((i) => i.id)).toEqual(['b', 'c', 'a'])
    expect(orderAfterMove(items, 'a', -5).map((i) => i.id)).toEqual(['a', 'b', 'c'])
    expect(orderAfterMove(items, 'zz', 1).map((i) => i.id)).toEqual(['b', 'c', 'a'])
  })
})
