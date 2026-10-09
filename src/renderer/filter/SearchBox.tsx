import { MagnifyingGlass, X } from '@phosphor-icons/react'

export function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="search">
      <MagnifyingGlass size={14} weight="bold" />
      <input
        aria-label="搜索任务"
        placeholder="搜标题 / 正文 / 标签，空格分词"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onChange('')
        }}
      />
      {value.length > 0 ? (
        <button type="button" className="icon-btn clear" title="清空" onClick={() => onChange('')}>
          <X size={12} weight="bold" />
        </button>
      ) : null}
    </label>
  )
}
