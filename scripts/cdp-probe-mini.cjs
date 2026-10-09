// 一次性 CDP 探针（配合 --remote-debugging-port=9222 启动的应用使用）。
// 目的：把"CSS/DOM 对不对"和"OS 输入有没有真的进到渲染进程"分开验。
//   report      读小窗当前命中元素、app-region、:hover、chrome 高度
//   openmini    在主窗里点"小窗"分段按钮，把小窗拉起来（不动鼠标）
//   cdpmove     用 CDP 注入 mouseMoved，绕开 OS 拖拽命中层，只看 CSS 会不会展开
const PORT = process.env.PORT ?? '9222'
const MODE = process.argv[2] ?? 'report'

const PROBE = `(() => {
  const el = document.elementFromPoint(30, 292)
  const mini = document.querySelector('.mini')
  if (!mini) return { error: 'no .mini on this page' }
  const grab = document.querySelector('.mini-grab')
  const chrome = document.querySelector('.mini-chrome')
  return {
    hit: el ? el.tagName + '.' + (el.className || '') : null,
    hitRegion: el ? getComputedStyle(el).webkitAppRegion : null,
    rootRegion: getComputedStyle(mini).webkitAppRegion,
    grabRegion: grab ? getComputedStyle(grab).webkitAppRegion : '(无 .mini-grab)',
    grabTop: grab ? Math.round(grab.getBoundingClientRect().top) : null,
    isHover: mini.matches(':hover'),
    chromeHeight: Math.round(chrome.getBoundingClientRect().height),
    rowTop: Math.round(document.querySelector('.mini-row').getBoundingClientRect().top),
    rowWidth: Math.round(document.querySelector('.mini-row').getBoundingClientRect().width),
    innerWidth: window.innerWidth,
    dpr: window.devicePixelRatio
  }
})()`

async function pageFor(needle) {
  const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json())
  const hit = needle === '!mini' ? list.find((t) => !(t.url ?? '').includes('view=mini')) : list.find((t) => (t.url ?? '').includes(needle))
  return hit ?? list[0]
}

async function connect(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let seq = 0
  const pending = new Map()
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    const done = pending.get(msg.id)
    if (done) {
      pending.delete(msg.id)
      done(msg.result ?? { error: msg.error })
    }
  })
  const send = (method, params) =>
    new Promise((resolve) => {
      const id = ++seq
      pending.set(id, resolve)
      ws.send(JSON.stringify({ id, method, params }))
    })
  return { ws, send }
}

async function main() {
  if (MODE === 'clickbtn') {
    const { ws, send } = await connect(await pageFor(process.env.WHICH ?? '!mini'))
    const text = JSON.stringify(process.argv[3] ?? '小窗')
    const expression = `(() => {
      const btn = [...document.querySelectorAll('button')].find(
        (b) => b.textContent.trim() === ${text} || b.getAttribute('aria-label') === ${text}
      )
      if (!btn) return 'button not found'
      btn.click()
      return 'clicked'
    })()`
    console.log('CLICKBTN ' + JSON.stringify(await send('Runtime.evaluate', { expression, returnByValue: true })))
    ws.close()
    return
  }

  if (MODE === 'openmini') {
    const { ws, send } = await connect(await pageFor('!mini'))
    const expression = `(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '小窗')
      if (!btn) return 'button not found'
      btn.click()
      return 'clicked'
    })()`
    console.log('OPENMINI ' + JSON.stringify(await send('Runtime.evaluate', { expression, returnByValue: true })))
    ws.close()
    return
  }

  const { ws, send } = await connect(await pageFor('view=mini'))
  await send('Runtime.enable')
  const report = async (label) =>
    console.log(label + ' ' + JSON.stringify((await send('Runtime.evaluate', { expression: PROBE, returnByValue: true })).result.value))

  if (MODE === 'leave') {
    await send('Input.dispatchMouseEvent', { type: 'mouseLeave', x: 30, y: 292, buttons: 0 })
    await new Promise((r) => setTimeout(r, 400))
  }
  await report('BEFORE')
  if (MODE === 'cdpmove') {
    for (const y of [292, 289, 286]) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 30, y, buttons: 0 })
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  await report(MODE === 'cdpmove' ? 'AFTER_CDP_MOVE' : 'AFTER_REAL_MOVE')
  ws.close()
}

void main().catch((err) => console.log('CDP_PROBE_FAILED ' + String(err)))
