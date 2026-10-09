import { useMemo } from 'react'
import { Kanban, ListBullets, MagnifyingGlass, PictureInPicture } from '@phosphor-icons/react'
import { flattenForMini, tallyByLane } from '@domain/query/miniList'
import logo from '../../../resources/icon.png'
import type { WorkBoard } from '../state/useWorkBoard'
import { MiniRow } from './MiniRow'

/**
 * 小窗默认只剩内容条；标题、档位计数、搜索和两个动作按钮收在一层 chrome 里，
 * 由纯 CSS :hover / :focus-within 展开（不走 React 状态，省掉每次悬停的重渲染）。
 */
export function MiniBoard({
  board,
  onExit,
  error
}: {
  board: WorkBoard
  onExit: () => void
  error: string | null
}) {
  const entries = useMemo(() => flattenForMini(board.board, board.today), [board.board, board.today])
  const tallies = useMemo(() => tallyByLane(board.board), [board.board])

  function openDetail(id: string): void {
    board.select(id)
    onExit()
  }

  return (
    <div className="mini">
      <div className="mini-grab" aria-hidden="true" />
      <div className="mini-chrome">
        <div className="mini-chrome-inner">
          <header className="mini-head">
            <img className="brand-mark" src={logo} alt="" width={16} height={16} />
            <strong>工作计划</strong>
            <time className="mini-date">{board.today.slice(5)}</time>
            <span className="spacer" />
            <div className="segmented" role="group" aria-label="视图模式">
              <button type="button" aria-pressed={false} onClick={onExit} title="回到三列看板">
                <Kanban size={13} />
                看板
              </button>
              <button type="button" aria-pressed title="已是贴顶小窗">
                <PictureInPicture size={13} />
                小窗
              </button>
            </div>
          </header>

          <div className="mini-tally">
            {tallies.map((tally) => (
              <span key={tally.lane} className={`tally-chip lane-${tally.lane}`}>
                <i className="lane-mark" />
                {tally.label} {tally.open}
                {tally.overdue > 0 ? <em className="overdue-tag">{tally.overdue} 逾期</em> : null}
              </span>
            ))}
          </div>

          <label className="search mini-search">
            <MagnifyingGlass size={13} weight="bold" />
            <input
              aria-label="搜索任务"
              placeholder="搜标题 / 正文 / 标签"
              value={board.filters.search}
              onChange={(event) => board.setFilters({ ...board.filters, search: event.target.value })}
            />
          </label>
        </div>
      </div>

      {board.notice ? <div className={`status ${board.notice.kind}`}>{board.notice.text}</div> : null}
      {error ? <div className="status">{error}</div> : null}

      <ul className="mini-list">
        {entries.length === 0 ? (
          <li className="mini-empty">
            <ListBullets size={20} />
            没有符合条件的条目
          </li>
        ) : (
          entries.map((entry) => (
            <MiniRow key={entry.item.id} entry={entry} onToggle={board.actions.toggle} onOpen={openDetail} />
          ))
        )}
      </ul>
    </div>
  )
}
