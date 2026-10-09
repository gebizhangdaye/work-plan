// 无窗口探针，只验生产代码真正依赖的三件事，任何一步失败都不许把进程挂住。
// 注意：主进程 net.fetch 请求自己注册的 app:// 会 net::ERR_UNKNOWN_URL_SCHEME，
// 那不代表协议有问题——真实链路是 渲染进程请求 app:// → protocol.handle → net.fetch(file://)。
const { app, net } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const report = { steps: [] }
const done = (name, value) => report.steps.push({ [name]: value })

app.whenReady().then(async () => {
  done('name', app.getName())
  done('userData', app.getPath('userData'))
  done('sqlite', process.versions.sqlite)

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-probe-'))
  const png = path.resolve(__dirname, '../resources/tray.png')
  const copy = path.join(temp, 'tray.png')
  fs.copyFileSync(png, copy)

  try {
    const response = await net.fetch(pathToFileURL(copy).toString())
    const bytes = await response.arrayBuffer()
    done('fetchFileUrl', { status: response.status, ok: response.ok, bytes: bytes.byteLength })
  } catch (error) {
    done('fetchFileUrl', { error: String(error.message).slice(0, 80) })
  }

  try {
    const missing = await net.fetch(pathToFileURL(path.join(temp, 'nope.png')).toString())
    done('fetchMissing', { status: missing.status })
  } catch (error) {
    done('fetchMissing', { error: String(error.message).slice(0, 80) })
  }

  console.log('PROBE_JSON ' + JSON.stringify(report))
  fs.rmSync(temp, { recursive: true, force: true })
  app.quit()
})
