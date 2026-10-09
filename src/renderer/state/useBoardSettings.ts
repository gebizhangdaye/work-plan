import { useCallback, useEffect, useState } from 'react'
import type { AppSettings } from '@shared/workPlanApi'

const api = window.workPlan

export function useBoardSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  const refresh = useCallback(async () => setSettings(await api.getSettings()), [])

  useEffect(() => {
    refresh().catch(() => setSettings(null))
  }, [refresh])

  async function toggleAutoStart(enabled: boolean): Promise<void> {
    setSettings(await api.setAutoStart(enabled))
  }

  return { settings, refresh, toggleAutoStart }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
