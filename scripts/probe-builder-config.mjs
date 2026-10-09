// 只校验配置本身，不尝试出 mac 包（那要 Mac 上的 hdiutil/codesign）：
// 1) electron-builder.yml 能解析、win/portable 段没被动过；
// 2) mac 段用到的每个键都在已装 electron-builder 的类型声明里真实存在 —— 拼错的键会被静默忽略，
//    所以这一步必须在有 .d.ts 的这个版本上核，而不是照着文档抄。
import { readFileSync } from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

const root = path.resolve(import.meta.dirname, '..')
const config = yaml.load(readFileSync(path.join(root, 'electron-builder.yml'), 'utf8'))

const SOURCES = [
  'app-builder-lib/out/options/macOptions.d.ts',
  'app-builder-lib/out/options/PlatformSpecificBuildOptions.d.ts',
  'app-builder-lib/out/configuration.d.ts'
]
const texts = SOURCES.map((rel) => ({ rel, text: readFileSync(path.join(root, 'node_modules', rel), 'utf8') }))

/** 某个字段名是否在任一声明文件里作为成员出现过。 */
function declaredIn(field) {
  const pattern = new RegExp(`^\\s{2,4}(?:readonly\\s+)?${field}\\??:\\s`, 'm')
  return texts.filter((entry) => pattern.test(entry.text)).map((entry) => entry.rel.split('/').pop())
}

console.log('parsed top-level keys:', Object.keys(config).join(', '))
console.log('win.target:', JSON.stringify(config.win?.target), '| win.icon:', config.win?.icon)
console.log('portable:', JSON.stringify(config.portable))
console.log('extraResources:', (config.extraResources ?? []).map((e) => `${e.from} → ${e.to}`).join(' | '))
console.log('mac:', JSON.stringify(config.mac))

let bad = 0
for (const key of Object.keys(config.mac ?? {})) {
  const where = declaredIn(key)
  if (where.length === 0) bad += 1
  console.log(`  mac.${key} → ${where.length ? where.join(', ') : 'NOT DECLARED ✗'}`)
}

// 每个 extraResources 的 from 都得真在磁盘上，否则打包时直接报错
for (const entry of config.extraResources ?? []) {
  const file = path.join(root, entry.from)
  const exists = (() => {
    try {
      readFileSync(file)
      return true
    } catch {
      return false
    }
  })()
  if (!exists) bad += 1
  console.log(`  extraResources ${entry.from} 存在: ${exists ? '✓' : '✗'}`)
}

// mac.icon 指向的文件必须存在且已是 .icns（iconConverter 对已是目标扩展名的文件原样返回、不校验 512 尺寸）
const icon = config.mac?.icon
if (typeof icon === 'string') {
  const suffix = /\.icns$/.test(icon) ? '（已是 icns，走原样返回分支）' : '（不是 icns，会触发转换 → 需要 ≥512 与 toolset）'
  let bytes = 0
  try {
    bytes = readFileSync(path.join(root, icon)).length
  } catch {
    bad += 1
  }
  console.log(`  mac.icon ${icon} ${bytes}B ${suffix}`)
}

console.log(bad === 0 ? 'OK：配置里的键与资源文件都对得上' : `有 ${bad} 项对不上`)
process.exitCode = bad === 0 ? 0 : 1
