// electron 的二进制由它自己的 postinstall 下载，但 npm 的 allow-scripts 会拦掉依赖脚本；
// 这里用项目自身的 postinstall 兜住：缺二进制就带国内镜像补一次，已存在就什么都不做。
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const electronDir = path.resolve(import.meta.dirname, '../node_modules/electron')
const exe = path.join(electronDir, process.platform === 'win32' ? 'dist/electron.exe' : 'dist/electron')

if (existsSync(exe)) {
  console.log('[electron] 二进制已就位:', path.relative(process.cwd(), exe))
} else {
  console.log('[electron] 缺二进制，从 npmmirror 拉取…')
  const result = spawnSync(process.execPath, ['install.js'], {
    cwd: electronDir,
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_MIRROR: 'https://npmmirror.com/mirrors/electron/' }
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
