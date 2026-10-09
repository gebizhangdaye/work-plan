// 产出 site/media/hero.png —— README 顶部头图。
// 素材全是真的：resources/icon.png 是应用图标，board.png 是真实离屏渲染的看板界面，
// 配色取 src/renderer/styles/app.css 的 Fluent token，不在这里另发明一套色值。
// 用法：node site/tools/captureHero.cjs   （不依赖 npm run build，不读写 %APPDATA%\work-plan）
const { app, BrowserWindow, nativeTheme } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const TOOLS = __dirname
const OUT = path.resolve(TOOLS, '../media/hero.png')
// 别把宽度顶到显示器工作区：离屏窗口的 paint 缓冲会被夹到 ~1440，
// 按 1600 排版就会静默裁掉右边一条。1280 在 125% 缩放的笔记本上也留得下。
const WIDTH = 1280
const HEIGHT = 560

// 临时 HTML 放在 site/tools 下，file:// 才能用相对路径吃到 ../media 与 ../../resources
const HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  :root {
    --bg: #f3f3f3; --surface: #ffffff; --ink: #242424; --ink-2: #5d5d5d; --ink-3: #6f6f6f;
    --stroke: #e1e1e1; --urgent: #c50f1f; --today: #0b5cab; --later: #6f6f6f;
    --shadow-16: 0 8px 16px rgba(0, 0, 0, 0.16), 0 0 1px rgba(0, 0, 0, 0.1);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1b1b1b; --surface: #272727; --ink: #f5f5f5; --ink-2: #c7c7c7; --ink-3: #a3a3a3;
      --stroke: #383838; --urgent: #e0706e; --today: #4da3e8; --later: #a3a3a3;
    }
  }
  * { margin: 0; box-sizing: border-box; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
  body {
    background: var(--bg); color: var(--ink);
    font-family: -apple-system, "Segoe UI Variable Text", "Segoe UI", "Microsoft YaHei UI", sans-serif;
    display: flex; align-items: center; gap: 48px; padding: 0 56px;
  }
  .brand { flex: 0 0 420px; min-width: 0; }
  .lockup { display: flex; align-items: center; gap: 15px; }
  .lockup img { width: 54px; height: 54px; display: block; }
  h1 { font-size: 36px; font-weight: 650; letter-spacing: -0.01em; line-height: 1.1; }
  .tagline { margin-top: 18px; max-width: 400px; font-size: 16px; line-height: 1.62; color: var(--ink-2); }
  .lanes { display: flex; gap: 7px; margin-top: 22px; }
  .lanes i { height: 6px; border-radius: 3px; }
  .lanes i:nth-child(1) { width: 46px; background: var(--urgent); }
  .lanes i:nth-child(2) { width: 74px; background: var(--today); }
  .lanes i:nth-child(3) { width: 36px; background: var(--later); }
  .meta { margin-top: 18px; font-size: 13px; color: var(--ink-3); font-variant-numeric: tabular-nums; }
  .shot { flex: 0 0 583px; min-width: 0; margin-left: auto; }
  .shot img {
    width: 583px; height: auto; display: block; border: 1px solid var(--stroke); border-radius: 8px;
    background: var(--surface); box-shadow: var(--shadow-16);
  }
</style>
</head>
<body>
  <div class="brand">
    <div class="lockup">
      <img src="../../resources/icon.png" alt="">
      <h1>工作计划</h1>
    </div>
    <p class="tagline">加急、今天、以后 —— 把一天要干的事摊在三条泳道上。文字记不下，就把聊天截图直接贴进那条记录。</p>
    <div class="lanes"><i></i><i></i><i></i></div>
    <p class="meta">Windows · macOS &nbsp;·&nbsp; 完全离线，无账号无同步 &nbsp;·&nbsp; Electron + React</p>
  </div>
  <div class="shot"><img id="board" src="../media/board.png" alt="工作计划看板界面"></div>
</body>
</html>
`

/** 离屏窗口只能吃 paint 事件，需要新帧时 invalidate() 逼它重绘（同 capture.cjs 的实测结论）。 */
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
      reject(new Error('no paint frame within 8s'))
    }, 8000)
  })
}

app.whenReady().then(async () => {
  const tmp = path.join(TOOLS, `_hero-${process.pid}.html`)
  fs.writeFileSync(tmp, HTML)
  nativeTheme.themeSource = process.env.WP_THEME === 'dark' ? 'dark' : 'light'

  const win = new BrowserWindow({
    show: false,
    frame: false,
    useContentSize: true,
    width: WIDTH,
    height: HEIGHT,
    webPreferences: { contextIsolation: true, nodeIntegration: false, offscreen: true, backgroundThrottling: false }
  })

  try {
    await win.webContents.loadFile(tmp)
    // 两张图都必须真解码完成，否则拍到空位（complete && naturalWidth===0 才是裂图）
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const state = await win.webContents.executeJavaScript(
        `const i=[...document.images];JSON.stringify(i.map(x=>[x.complete,x.naturalWidth])) + '|' + document.body.scrollHeight`
      )
      const done = !state.split('|')[0].includes('false') && !state.split('|')[0].includes(',0]')
      if (done) break
      await new Promise((resolve) => setTimeout(resolve, 100))
      if (attempt === 79) throw new Error('images never loaded: ' + state)
    }
    await new Promise((resolve) => setTimeout(resolve, 350))
    const png = (await grabFrame(win)).toPNG()
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, png)
    // 回读 IHDR 而不是相信窗口尺寸：窗口被工作区夹掉时，排版宽度是对的但图会缺一条
    const got = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`
    if (got !== `${WIDTH}x${HEIGHT}`) {
      throw new Error(`拍出来是 ${got}，期望 ${WIDTH}x${HEIGHT} —— 画面被裁了，把 WIDTH 调小`)
    }
    console.log(`${path.relative(process.cwd(), OUT)} ${png.length} bytes @ ${got}`)
  } finally {
    win.destroy()
    fs.rmSync(tmp, { force: true })
    app.quit()
  }
})
