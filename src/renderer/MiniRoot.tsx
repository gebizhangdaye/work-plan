import { useState } from 'react'
import { MiniBoard } from './mini/MiniBoard'
import { useWorkBoard } from './state/useWorkBoard'

const api = window.workPlan

/** 小窗是独立窗口，所以有自己的一份看板状态；退出就是让主进程关掉自己、唤回主窗。 */
export function MiniRoot() {
  const board = useWorkBoard()
  const [error, setError] = useState<string | null>(null)

  function exit(): void {
    api.setMiniWindow(false).catch((cause: Error) => setError(`回看板失败：${cause.message}`))
  }

  return <MiniBoard board={board} onExit={exit} error={error} />
}
