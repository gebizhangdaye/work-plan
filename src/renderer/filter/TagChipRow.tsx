import { FunnelSimple, X } from '@phosphor-icons/react'
import type { TagOption } from '@shared/workPlanApi'

export function TagChipRow({
  tags,
  active,
  onChange
}: {
  tags: TagOption[]
  active: readonly string[]
  onChange: (tagIds: string[]) => void
}) {
  function toggle(tagId: string): void {
    onChange(active.includes(tagId) ? active.filter((id) => id !== tagId) : [...active, tagId])
  }

  return (
    <div className="chips">
      <FunnelSimple size={13} className="rail-icon" />
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          className={`chip${active.includes(tag.id) ? ' active' : ''}`}
          onClick={() => toggle(tag.id)}
        >
          <i className="dot" style={{ background: tag.color }} />
          {tag.name}
          <span className="count">{tag.usage}</span>
        </button>
      ))}
      {active.length > 0 ? (
        <button type="button" className="chip clear" onClick={() => onChange([])}>
          <X size={11} weight="bold" />
          清除筛选
        </button>
      ) : null}
    </div>
  )
}
