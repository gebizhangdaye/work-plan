import { app } from 'electron'
import path from 'node:path'
import { createDataPaths, ensureDataDirs, type DataPaths } from '../../infrastructure/storage/appDataPaths'

/**
 * 数据根是 appData 下的 work-plan：Windows 是 %APPDATA%\work-plan，macOS 是
 * ~/Library/Application Support/work-plan（app.getPath('appData') 两边都给对的位置）。
 * 故意不用 app.getPath('userData')：它由应用名推导，而 app.getName() 在 name / productName /
 * 直接传脚本启动这几种场景下取值不同（实测会落到 %APPDATA%\Electron），数据目录不能压在这种语义上。
 */
const DATA_FOLDER = 'work-plan'

export function resolveDataPaths(): DataPaths {
  return ensureDataDirs(createDataPaths(path.join(app.getPath('appData'), DATA_FOLDER)))
}
