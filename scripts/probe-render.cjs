// 离屏探针（不显示窗口）：验证 app:// 自定义协议能否让 <img> 真出图，以及 --lang 是否落到渲染进程。
// BARE=1 用裸 scheme 'app' 注册 protocol.handle，否则用 'app://' —— 用来做对照实验。
// 页面用 file:// 加载，和生产态（loadFile）一致，避免 data: URL 的 origin 规则干扰结论。
const { app, BrowserWindow, net, protocol } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const SAFE = /^attachments\/\d{4}\/\d{2}\/[0-9a-f]{8,32}\.png$/
const REL = 'attachments/2026/10/e3b0c442.png'
const EVIL = 'attachments/2026/10/%2e%2e%2f%2e%2e%2fsecret.png'

app.commandLine.appendSwitch('lang', 'zh-CN')
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

app.whenReady().then(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-probe-'))
  fs.mkdirSync(path.dirname(path.join(root, REL)), { recursive: true })
  fs.copyFileSync(path.resolve(__dirname, '../resources/tray.png'), path.join(root, REL))
  fs.writeFileSync(
    path.join(root, 'page.html'),
    `<body><img id="ok" src="app://assets/${REL}"><img id="bad" src="app://assets/${EVIL}"></body>`
  )

  const pattern = process.env.BARE ? 'app' : 'app://'
  protocol.handle(pattern, async (request) => {
    const decoded = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '')
    if (!SAFE.test(decoded)) return new Response('blocked', { status: 404 })
    try {
      return await net.fetch(pathToFileURL(path.join(root, decoded)).toString())
    } catch {
      return new Response('gone', { status: 404 })
    }
  })

  const logs = []
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  win.webContents.on('console-message', (_e, _level, text) => logs.push(text.slice(0, 120)))
  win.webContents.on('did-fail-load', (_e, code, desc, url) => logs.push(`fail ${code} ${desc} ${url}`.slice(0, 160)))

  await win.loadURL(pathToFileURL(path.join(root, 'page.html')).toString())

  const result = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const ok = document.getElementById('ok'), bad = document.getElementById('bad')
      const settle = () => resolve({
        bare: ${Boolean(process.env.BARE)},
        navigatorLanguage: navigator.language,
        zhDate: new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date('2026-10-08')),
        goodLoaded: ok.complete && ok.naturalWidth > 0,
        goodSize: ok.naturalWidth + 'x' + ok.naturalHeight,
        badBlocked: !(bad.complete && bad.naturalWidth > 0)
      })
      if (ok.complete && bad.complete) settle()
      else { ok.onload = ok.onerror = settle; bad.onload = bad.onerror = settle }
      setTimeout(settle, 4000)
    })
  `)

  console.log('PROBE2 ' + JSON.stringify({ appLocale: app.getLocale(), ...result, logs }))
  win.destroy()
  fs.rmSync(root, { recursive: true, force: true })
  app.quit()
})
