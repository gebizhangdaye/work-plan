import { afterEach, describe, expect, it } from 'vitest'
import { formatDateStamp, formatDateTimeStamp } from '../workItem/timestampDisplay'

const ORIGINAL_TZ = process.env.TZ
const INSTANT = '2026-10-08T02:50:00.000Z'

function setTz(value: string): void {
  process.env.TZ = value
}

afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ
  else process.env.TZ = ORIGINAL_TZ
})

describe('时间戳本地化', () => {
  it('同一个 UTC 瞬间在两个时区下渲染出不同小时，证明确实走了本地时区', () => {
    setTz('UTC')
    const utcView = formatDateTimeStamp(INSTANT)

    setTz('Asia/Shanghai')
    const cnView = formatDateTimeStamp(INSTANT)

    expect(utcView).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2}$/)
    expect(utcView).not.toBe(cnView)
    expect(utcView.endsWith('02:50')).toBe(true)
    expect(cnView.endsWith('10:50')).toBe(true)
  })

  it('日期戳在跨日的时区差下也会跟着变', () => {
    setTz('UTC')
    expect(formatDateStamp(INSTANT)).toBe('10/08')

    setTz('America/New_York')
    expect(formatDateStamp(INSTANT)).toBe('10/07')
  })
})
