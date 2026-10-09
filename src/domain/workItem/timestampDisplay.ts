/** 展示用时间戳：一律按用户本地时区渲染。库里存 ISO(UTC)，直接 slice 字符串会把 UTC 当本地时间显示。 */
export function formatDateStamp(iso: string): string {
  const date = new Date(iso)
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
}

export function formatDateTimeStamp(iso: string): string {
  const date = new Date(iso)
  return `${formatDateStamp(iso)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
