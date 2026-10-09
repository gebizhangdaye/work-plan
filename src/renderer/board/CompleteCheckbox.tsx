export function CompleteCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <input
      className="check"
      type="checkbox"
      checked={checked}
      title={checked ? '标为未完成' : '标为已完成'}
      onClick={(event) => event.stopPropagation()}
      onChange={onToggle}
    />
  )
}
