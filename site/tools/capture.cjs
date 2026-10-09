// 产出 site/media/*.png：真实组件 + 真实 CSS + 演示数据，离屏截图。
// 不读也不写 %APPDATA%\work-plan；附件是页面里 canvas 现画的演示图，落在系统临时目录，跑完即删。
// 用法：npm run build 之后  node site/tools/capture.cjs
const { app, BrowserWindow, nativeTheme, net, protocol } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const ROOT = path.resolve(__dirname, '../..')
const MEDIA = path.resolve(__dirname, '../media')
const RENDERER = pathToFileURL(path.join(ROOT, 'out/renderer/index.html')).href
const PRELOAD = path.join(__dirname, 'capturePreload.cjs')
const SAFE = /^attachments\/\d{4}\/\d{2}\/[\w.-]+\.png$/
const ATTACHMENT = path.join('attachments', '2026', '10', 'a41f9c27.png')

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

const SHOTS = [
  { file: 'board.png', ready: '.lane-count' },
  { file: 'detail.png', ready: '.lane-count', steps: [`click('[data-card-id="i-3"]')`] },
  { file: 'lightbox.png', ready: '.lane-count', steps: [`click('[data-card-id="i-3"]')`, `click('.thumb')`] },
  {
    file: 'crop.png',
    ready: '.lane-count',
    steps: [`click('[data-card-id="i-3"]')`, `click('.thumb')`, `clickButton('裁剪')`]
  },
  { file: 'menu.png', ready: '.lane-count', steps: [`clickButton('视图')`] },
  { file: 'settings.png', ready: '.lane-count', steps: [`click('[aria-label="设置"]')`, `clickButton('数据与运行')`] },
  { file: 'mini.png', view: 'mini', width: 420, height: 560, zoom: 2, ready: '.mini-row', steps: [`openChrome()`] },
  { file: 'mini-rest.png', view: 'mini', width: 420, height: 560, zoom: 2, ready: '.mini-row' },
  { file: 'board-dark.png', theme: 'dark', ready: '.lane-count' },
  { file: 'detail-dark.png', theme: 'dark', ready: '.lane-count', steps: [`click('[data-card-id="i-1"]')`] },
  {
    file: 'mini-dark.png',
    theme: 'dark',
    view: 'mini',
    width: 420,
    height: 560,
    zoom: 2,
    ready: '.mini-row',
    steps: [`openChrome()`]
  }
]

// 一个进程里连开两个 offscreen 窗口会让第二个直接失败（实测 ERR_FAILED / 挂住），
// 所以全程只用一个窗口，靠重新导航把每张图拍在干净的初始状态上。
const HELPERS = `
window.__click = (selector) => { const el = document.querySelector(selector); if (el) el.click(); return Boolean(el) }
window.__clickButton = (text) => {
  const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || b.title || b.ariaLabel || '').includes(text))
  if (el) el.click()
  return Boolean(el)
}
window.__openChrome = () => {
  const style = document.createElement('style')
  style.textContent = '.mini.force .mini-chrome{grid-template-rows:1fr;opacity:1}'
  document.head.append(style)
  document.querySelector('.mini').classList.add('force')
  return true
}
window.__drawChat = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 420
  canvas.height = 264
  const g = canvas.getContext('2d')
  const font = '13px "Microsoft YaHei UI", "Segoe UI", sans-serif'
  const bubble = (x, right, lines, fill) => {
    const width = Math.max(...lines.map((line) => g.measureText(line).width)) + 22
    const height = lines.length * 20 + 16
    const y = g.__y
    g.fillStyle = fill
    g.beginPath()
    g.roundRect(right ? 420 - width - 12 : 12, y, width, height, 6)
    g.fill()
    g.fillStyle = '#1f1f1f'
    lines.forEach((line, index) => g.fillText(line, right ? 420 - width - 12 + 11 : 23, y + 22 + index * 20))
    g.__y = y + height + 6
  }
  g.fillStyle = '#f5f5f5'
  g.fillRect(0, 0, 420, 264)
  g.fillStyle = '#ededed'
  g.fillRect(0, 0, 420, 36)
  g.fillStyle = '#4a4a4a'
  g.font = '13px "Microsoft YaHei UI", sans-serif'
  g.fillText('张工 · 后端', 12, 24)
  g.font = font
  g.__y = 48
  bubble(12, false, ['导出那个 csv 到底几列？', '我按 PRD 写的 6 列'], '#ffffff')
  bubble(12, true, ['8 列，加了标签和截图数', '字段表我截图给你'], '#a8e390')
  g.fillStyle = '#a3a3a3'
  g.font = '11px "Microsoft YaHei UI", sans-serif'
  g.fillText('上午 9:24', 186, g.__y + 14)
  g.__y += 26
  g.font = font
  bubble(12, false, ['行，那今天下班前给'], '#ffffff')
  return canvas.toDataURL('image/png')
}
`

const CALL_ALIASES = { click: '__click', clickButton: '__clickButton', openChrome: '__openChrome' }

// executeJavaScript 会把完成值结构化克隆回来，函数不可克隆，所以补一个 true 收尾。
const HELPERS_SCRIPT = HELPERS + '\ntrue'

/** 步骤写成 click('.thumb') 这种短形式，展开成页面里真正的辅助函数调用。 */
function expand(code) {
  return code.replace(/^(\w+)\(/, (match, name) => {
    const target = CALL_ALIASES[name]
    if (!target) throw new Error('unknown capture step: ' + name)
    return `window.${target}(`
  })
}

async function waitFor(web, selector) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await web.executeJavaScript(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('selector never appeared: ' + selector)
}

/**
 * 离屏窗口不能靠 capturePage（拍回来是同一张空白帧），只能吃 paint 事件：
 * 需要新帧时 invalidate() 逼它重绘一次。
 */
function grabFrame(win) {
  return new Promise((resolve, reject) => {
    const web = win.webContents
    const onPaint = (_event, _dirty, image) => {
      web.removeListener('paint', onPaint)
      resolve(image)
    }
    web.on('paint', onPaint)
    web.invalidate()
    setTimeout(() => {
      web.removeListener('paint', onPaint)
      reject(new Error('no paint frame within 5s'))
    }, 5000)
  })
}

app.whenReady().then(async () => {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-site-'))
  fs.mkdirSync(MEDIA, { recursive: true })
  fs.mkdirSync(path.join(dataRoot, path.dirname(ATTACHMENT)), { recursive: true })

  protocol.handle('app', async (request) => {
    const rel = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '').replace(/^assets\//, '')
    if (!SAFE.test(rel)) return new Response('blocked', { status: 404 })
    try {
      return await net.fetch(pathToFileURL(path.join(dataRoot, rel)).toString())
    } catch {
      return new Response('gone', { status: 404 })
    }
  })

  const win = new BrowserWindow({
    show: false,
    frame: false,
    useContentSize: true,
    width: 1320,
    height: 860,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      offscreen: true,
      backgroundThrottling: false,
      spellcheck: false
    }
  })

  // 先在页面里把演示截图画出来落盘，后面每次导航都能取到
  const web = win.webContents
  web.on('did-fail-load', (_e, code, desc, url, isMain) => console.log(`  load-fail ${code} ${desc} main=${isMain}`))
  web.on('render-process-gone', (_e, details) => console.log('  renderer-gone ' + JSON.stringify(details)))
  web.on('console-message', (_e, level, text) => {
    if (Number(level) >= 3) console.log('  page-error ' + String(text).slice(0, 150))
  })

  await web.loadURL(RENDERER)
  await web.executeJavaScript(HELPERS_SCRIPT)
  const dataUrl = await web.executeJavaScript('window.__drawChat()')
  fs.writeFileSync(path.join(dataRoot, ATTACHMENT), Buffer.from(dataUrl.split(',')[1], 'base64'))

  for (const shot of SHOTS) {
    try {
      nativeTheme.themeSource = shot.theme === 'dark' ? 'dark' : 'light'
      const zoom = shot.zoom ?? 1
      win.setContentSize((shot.width ?? 1320) * zoom, (shot.height ?? 860) * zoom)
      await web.loadURL(shot.view === 'mini' ? `${RENDERER}?view=mini` : RENDERER)
      // 小窗按 2x 拍，网页上放大才不会糊
      web.setZoomFactor(zoom)
      await web.executeJavaScript(HELPERS_SCRIPT)
      await waitFor(web, shot.ready)
      for (const step of shot.steps ?? []) {
        await web.executeJavaScript(expand(step))
      }
      await new Promise((resolve) => setTimeout(resolve, 400))
      const png = (await grabFrame(win)).toPNG()
      fs.writeFileSync(path.join(MEDIA, shot.file), png)
      console.log(`${shot.file.padEnd(16)} ${png.length} bytes`)
    } catch (error) {
      console.log(`${shot.file.padEnd(16)} FAILED ${String(error).slice(0, 120)}`)
    }
  }

  win.destroy()
  fs.rmSync(dataRoot, { recursive: true, force: true })
  app.quit()
})
