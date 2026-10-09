import type { Lane, WorkItem } from '@domain/workItem/WorkItem'
import { LANE_LABELS, nextLane } from '@domain/workItem/priorityLanes'
import { ArrowRight } from '@phosphor-icons/react'

/** 卡片右上角一个小按钮循环切档（加急→今天→以后），跨列主要靠拖动，不另开模式。 */
export function PrioritySwitch({
  item,
  lane,
  onMove
}: {
  item: WorkItem
  lane: Lane
  onMove: (id: string, lane: Lane, beforeId: string | null) => void
}) {
  const target = nextLane(lane)

  return (
    <button
      type="button"
      className="lane-shift"
      title={`移到「${LANE_LABELS[target]}」`}
      onClick={(event) => {
        event.stopPropagation()
        onMove(item.id, target, null)
      }}
    >
      {LANE_LABELS[target]}
      <ArrowRight size={11} weight="bold" />
    </button>
  )
}
