// 离屏探针：把真实的 mini.css / app.css 挂到一份与 MiniBoard 同构的 DOM 上，量悬停展开到底挪动了多少布局。
// :hover 没法用 JS 触发，所以注入一条等价规则（.mini.force .mini-chrome 与 .mini:hover .mini-chrome 声明完全相同）来对照。
const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const styles = ['app.css', 'mini.css']
  .map((f) => pathToFileURL(path.resolve(__dirname, '../src/renderer/styles', f)).href)
  .map((href) => `<link rel="stylesheet" href="${href}">`)
  .join('\n')

const rows = Array.from(
  { length: Number(process.env.ROWS ?? 12) },
  (_, i) => `
    <li class="mini-row lane-today">
      <input class="check" type="checkbox">
      <i class="lane-block"></i>
      <button type="button" class="mini-main">
        <span class="mini-title">第 ${i + 1} 条任务标题</span>
        <span class="mini-meta"><span class="date-flag">10-08</span></span>
      </button>
    </li>`
).join('')

const html = `<!doctype html><html><head><meta charset="utf-8">${styles}
<style>.mini.force .mini-chrome{grid-template-rows:1fr;opacity:1}</style>
</head><body style="margin:0">
<div class="mini">
  <div class="mini-grab"></div>
  <div class="mini-chrome"><div class="mini-chrome-inner">
    <header class="mini-head"><strong>工作计划</strong><time class="mini-date">10-08</time>
      <span class="spacer"></span>
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
window.__snapshot = function () {
  const mini = document.querySelector('.mini')
  const list = document.querySelector('.mini-list')
  const row = document.querySelector('.mini-row')
  const cs = getComputedStyle(mini)
  return {
    listTop: Math.round(list.getBoundingClientRect().top),
    listHeight: Math.round(list.getBoundingClientRect().height),
    rowTop: Math.round(row.getBoundingClientRect().top),
    rowWidth: Math.round(row.getBoundingClientRect().width),
    listClientWidth: list.clientWidth,
    scrollbar: Math.round(list.offsetWidth - list.clientLeft - list.clientWidth) + 'px',
    scrollable: list.scrollHeight > list.clientHeight,
    chromeHeight: Math.round(document.querySelector('.mini-chrome').getBoundingClientRect().height),
    appRegionRoot: cs.getPropertyValue('-webkit-app-region'),
    appRegionGrab: getComputedStyle(document.querySelector('.mini-grab')).getPropertyValue('-webkit-app-region'),
    grabHeight: Math.round(document.querySelector('.mini-grab').getBoundingClientRect().height),
    segmentedTop: Math.round(document.querySelector('.mini-head .segmented').getBoundingClientRect().top),
    appRegionLi: getComputedStyle(row).getPropertyValue('-webkit-app-region'),
    appRegionChrome: getComputedStyle(document.querySelector('.mini-chrome')).getPropertyValue('-webkit-app-region'),
    appRegionLabel: getComputedStyle(document.querySelector('.mini-search')).getPropertyValue('-webkit-app-region')
  }
}
window.__measure = async function (forced) {
  document.querySelector('.mini').classList.toggle('force', forced)
  // 0fr→1fr 是 140ms 过渡，同步读矩形只会读到过渡起点，必须等它跑完。
  await new Promise((r) => setTimeout(r, 300))
  return window.__snapshot()
}
</script>
</body></html>`

app.whenReady().then(async () => {
  const file = path.join(require('node:os').tmpdir(), 'wp-mini-hover-probe.html')
  require('node:fs').writeFileSync(file, html)

  const win = new BrowserWindow({
    show: false,
    frame: false,
    useContentSize: true,
    width: 420,
    height: 560,
    webPreferences: { offscreen: true }
  })
  await win.loadURL(pathToFileURL(file).toString())
  const out = await win.webContents.executeJavaScript(`(async () => {
    const expanded = await window.__measure(true)
    const resting = await window.__measure(false)
    document.querySelector('.mini').classList.add('force')
    await new Promise((r) => setTimeout(r, 60))
    const mid = window.__snapshot()
    return { resting, mid, expanded }
  })()`)
  out.deltaRowTop = out.expanded.rowTop - out.resting.rowTop
  out.deltaRowWidth = out.expanded.rowWidth - out.resting.rowWidth
  console.log('PROBE_MINI ' + JSON.stringify(out, null, 1))
  win.destroy()
  app.quit()
})
