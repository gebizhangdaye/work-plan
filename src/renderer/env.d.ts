import type { WorkPlanApi } from '../shared/workPlanApi'

declare global {
  interface Window {
    workPlan: WorkPlanApi
  }
}

export {}
