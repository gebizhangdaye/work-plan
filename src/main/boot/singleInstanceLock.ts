import { app } from 'electron'

/** 第二实例只做一件事：把已有窗口叫到前台，自己退出。 */
export function acquireSingleInstanceLock(onSecondInstance: () => void): boolean {
  const acquired = app.requestSingleInstanceLock()
  if (!acquired) {
    app.quit()
    return false
  }
  app.on('second-instance', onSecondInstance)
  return true
}
