// 离屏探针：扫小窗的候选宽高，量出"再小就挤坏"的临界点，用来定 minWidth / minHeight。
// DOM 与 MiniBoard 同构（含 mini.css），并强制展开 chrome —— chrome 收起时更宽松，
// 所以展开态就是最坏情况。用法：node scripts/probe-mini-resize.cjs
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const styles = ['app.css', 'mini.css']
  .map((f) => pathToFileURL(path.resolve(__dirname, '../src/renderer/styles', f)).href)
  .map((href) => `<link rel="stylesheet" href="${href}">`)
  .join('\n')

const rows = Array.from(
  { length: 8 },
  (_, i) => `
    <li class="mini-row lane-today">
      <input class="check" type="checkbox">
      <i class="lane-block"></i>
      <button type="button" class="mini-main">
        <span class="mini-title">第 ${i + 1} 条任务标题，可能比较长需要换行</span>
        <span class="mini-meta"><span class="date-flag">10-08</span></span>
      </button>
    </li>`
).join('')

const html = `<!doctype html><html><head><meta charset="utf-8">${styles}
<style>.mini.force .mini-chrome{grid-template-rows:1fr;opacity:1}</style>
</head><body style="margin:0">
<div class="mini force">
  <div class="mini-grab"></div>
  <div class="mini-chrome"><div class="mini-chrome-inner">
    <header class="mini-head"><img class="brand-mark" width="16" height="16"><strong>工作计划</strong>
      <time class="mini-date">10-08</time><span class="spacer"></span>
      <div class="segmented" role="group"><button type="button" aria-pressed="false">看板</button><button type="button" aria-pressed="true">小窗</button></div>
    </header>
    <div class="mini-tally"><span class="tally-chip lane-urgent"><i class="lane-mark"></i>加急 0</span>
      <span class="tally-chip lane-today"><i class="lane-mark"></i>今天 1</span>
      <span class="tally-chip lane-later"><i class="lane-mark"></i>以后 0</span></div>
    <label class="search mini-search"><input aria-label="搜索任务" placeholder="搜标题 / 正文 / 标签"></label>
  </div></div>
  <ul class="mini-list">${rows}</ul>
</div>
<script>
window.__probe = function () {
  const q = (s) => document.querySelector(s)
  const head = q('.mini-head')
  const seg = q('.mini-head .segmented')
  const input = q('.mini-search input')
  const list = q('.mini-list')
  const row = q('.mini-row')
  return {
    // 横向不溢出不代表没挤坏：head 是固定 48px 行高，文字换行会变成竖向被裁
    headClip: head.scrollHeight - head.clientHeight,
    brandLines: q('.mini-head strong').getClientRects().length,
    segHeight: Math.round(seg.getBoundingClientRect().height),
    segGap: Math.round(head.getBoundingClientRect().right - seg.getBoundingClientRect().right),
    inputWidth: input.clientWidth,
    listHeight: list.clientHeight,
    rowWidth: Math.round(row.getBoundingClientRect().width),
    titleLines: Math.round(row.getBoundingClientRect().height / 24)
  }
}
</script>
</body></html>`

const WIDTHS = [200, 220, 240, 260, 280, 300, 320, 340]
const HEIGHTS = [160, 200, 240, 280, 320, 360, 440, 560]

app.whenReady().then(async () => {
  const file = path.join(os.tmpdir(), 'wp-mini-resize-probe.html')
  fs.writeFileSync(file, html)

  // 一个进程只能有一个 offscreen 窗口，所以全程同一个窗口靠 setContentSize 换尺寸
  const win = new BrowserWindow({
    show: false,
    frame: false,
    useContentSize: true,
    width: 420,
    height: 560,
    webPreferences: { offscreen: true, backgroundThrottling: false }
  })
  await win.loadURL(pathToFileURL(file).toString())
  // 钉死 1 倍：Chromium 的缩放是按 origin 持久化的，capture.cjs 给 out/renderer 那个
  // file:// origin 存过 zoomFactor 2，不强制就会在 420 的窗口里量到 210 CSS px 的布局。
  win.webContents.setZoomFactor(1)

  const measure = async (w, h) => {
    win.setContentSize(w, h)
    await new Promise((resolve) => setTimeout(resolve, 120))
    return win.webContents.executeJavaScript('window.__probe()')
  }

  console.log('— 宽度扫描（高固定 560，chrome 展开）—')
  for (const w of WIDTHS) {
    const r = await measure(w, 560)
    console.log(
      `w=${String(w).padStart(3)} headClip=${r.headClip} brandLines=${r.brandLines} segH=${String(r.segHeight).padStart(3)} segGap=${String(r.segGap).padStart(4)} input=${String(r.inputWidth).padStart(3)} rowW=${r.rowWidth}`
    )
  }

  console.log('— 高度扫描（宽固定 420）—')
  for (const h of HEIGHTS) {
    const r = await measure(420, h)
    console.log(`h=${String(h).padStart(3)} listHeight=${String(r.listHeight).padStart(4)} titleLines=${r.titleLines}`)
  }

  console.log('— 候选最小值组合 —')
  for (const [w, h] of [[320, 320], [340, 360], [360, 380], [320, 400]]) {
    const r = await measure(w, h)
    console.log(`${w}x${h} → ${JSON.stringify(r)}`)
  }

  win.destroy()
  app.quit()
})
