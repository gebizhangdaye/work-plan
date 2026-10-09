import type { WorkBoard } from '../state/useWorkBoard'
import { SwimlaneColumn } from './SwimlaneColumn'
import type { LaneColumn } from '@domain/query/boardQuery'

export function BoardColumns({ board }: { board: WorkBoard }) {
  return (
    <>
      {board.board.map((column: LaneColumn) => (
        <SwimlaneColumn key={column.lane} column={column} board={board} />
      ))}
    </>
  )
}
