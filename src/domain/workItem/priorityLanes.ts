import type { Lane } from './WorkItem'

export const LANES: readonly Lane[] = ['urgent', 'today', 'later']

export const LANE_LABELS: Record<Lane, string> = {
  urgent: '加急',
  today: '今天',
  later: '以后'
}

export function isLane(value: unknown): value is Lane {
  return typeof value === 'string' && (LANES as readonly string[]).includes(value)
}

export function assertLane(value: unknown): Lane {
  if (!isLane(value)) throw new Error(`非法泳道值: ${String(value)}`)
  return value
}

/** 键盘循环切换档位用：加急 → 今天 → 以后 → 加急。 */
export function nextLane(lane: Lane): Lane {
  const index = LANES.indexOf(lane)
  return LANES[(index + 1) % LANES.length]
}

export function laneLabel(lane: Lane): string {
  return LANE_LABELS[lane]
}
