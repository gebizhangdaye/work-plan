// 官网交互：文档目录/进度/永久链接、图片大图的键盘可达对话框、视频缺片降级。零依赖。
(() => {
  const chapters = [...document.querySelectorAll('article.doc-chapter')]

  /* ---------- 文档：右侧目录由章节生成 ---------- */
  const toc = document.getElementById('docToc')
  if (toc && chapters.length > 0) {
    toc.innerHTML = ''
    for (const chapter of chapters) {
      const link = document.createElement('a')
      link.href = `#${chapter.id}`
      link.textContent = chapter.querySelector('h2')?.textContent ?? chapter.id
      toc.append(link)
    }
  }

  const railLinks = [...document.querySelectorAll('.doc-rail a[href^="#"]')]
  const tocLinks = [...document.querySelectorAll('.doc-toc a[href^="#"]')]

  const setCurrent = (id) => {
    for (const link of [...railLinks, ...tocLinks]) {
      link.setAttribute('aria-current', String(link.getAttribute('href') === `#${id}`))
    }
  }

  /* 目录跳转落在 76px 处，用 IntersectionObserver 的可见带判定会慢一节；
     直接取"最后一个顶部已经越过阅读线的章节"，点目录和滚动都立刻对上。 */
  const currentChapter = () => {
    let current = chapters[0]
    for (const chapter of chapters) {
      if (chapter.getBoundingClientRect().top <= 140) current = chapter
    }
    return current
  }

  if (chapters.length > 0) {
    /* 节流但补一次后缘：只丢事件的话，点目录跳转的最后一帧可能不被处理，高亮会停在上一节 */
    let last = 0
    let pending = 0
    const refresh = () => setCurrent(currentChapter().id)
    window.addEventListener('scroll', () => {
      const now = Date.now()
      if (now - last >= 60) {
        last = now
        refresh()
        return
      }
      if (pending) return
      pending = setTimeout(() => {
        pending = 0
        last = Date.now()
        refresh()
      }, 80)
    }, { passive: true })
    refresh()
  }

  /* ---------- 文档：章节永久链接 ---------- */
  for (const chapter of chapters) {
    const heading = chapter.querySelector('h2')
    if (!heading) continue
    const anchor = document.createElement('a')
    anchor.className = 'anchor'
    anchor.href = `#${chapter.id}`
    anchor.textContent = '#'
    anchor.setAttribute('aria-label', `本章链接：${heading.textContent}`)
    heading.append(anchor)
  }

  /* ---------- 文档：顶部阅读进度 ---------- */
  const bar = document.querySelector('.read-progress')
  if (bar) {
    const paint = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`
    }
    window.addEventListener('scroll', paint, { passive: true })
    window.addEventListener('resize', paint)
    paint()
  }

  /* ---------- 文档：← / → 切章节 ---------- */
  if (chapters.length > 0) {
    document.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      const tag = event.target instanceof Element ? event.target.tagName : ''
      if (tag === 'INPUT' || tag === 'TEXTAREA' || zoomOpen()) return
      const index = chapters.indexOf(currentChapter())
      const step = event.key === 'ArrowRight' ? 1 : -1
      const next = chapters[index + step]
      if (!next) return
      event.preventDefault()
      next.scrollIntoView()
      history.replaceState(null, '', `#${next.id}`)
      setCurrent(next.id)
    })
  }

  /* ---------- 文档：左侧目录过滤（连同空掉的分组一起藏起来） ---------- */
  const filter = document.getElementById('docFilter')
  if (filter) {
    const nav = document.getElementById('docNav')
    filter.addEventListener('input', () => {
      const needle = filter.value.trim().toLowerCase()
      for (const link of railLinks) {
        link.hidden = needle.length > 0 && !link.textContent.toLowerCase().includes(needle)
      }
      for (const heading of nav.querySelectorAll('.grp')) {
        let node = heading.nextElementSibling
        let anyVisible = false
        while (node && node.tagName !== 'H2') {
          if (node.tagName === 'A' && !node.hidden) anyVisible = true
          node = node.nextElementSibling
        }
        heading.hidden = needle.length > 0 && !anyVisible
      }
    })
  }

  /* ---------- 图片：点图或回车看大图，做成一个真对话框 ---------- */
  const overlay = document.createElement('div')
  overlay.className = 'zoomer'
  overlay.hidden = true
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', '图片大图')
  overlay.setAttribute('tabindex', '-1')
  overlay.innerHTML = '<img alt=""><p class="hint">Esc 关闭 · 点任意处退出</p>'
  document.body.append(overlay)

  let returnFocus = null

  const zoomOpen = () => !overlay.hidden

  const openZoom = (image) => {
    overlay.querySelector('img').src = image.src
    overlay.querySelector('img').alt = image.alt
    returnFocus = image
    overlay.hidden = false
    document.body.style.overflow = 'hidden'
    overlay.focus()
  }

  const closeZoom = () => {
    if (!zoomOpen()) return
    overlay.hidden = true
    document.body.style.overflow = ''
    returnFocus?.focus()
    returnFocus = null
  }

  for (const image of document.querySelectorAll('.shot img')) {
    image.setAttribute('role', 'button')
    image.tabIndex = 0
    image.setAttribute('aria-label', `放大查看：${image.alt}`)
    image.addEventListener('click', () => openZoom(image))
    image.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openZoom(image)
      }
    })
  }
  overlay.addEventListener('click', closeZoom)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeZoom()
  })

  /* ---------- 视频：录屏没放进来就只展示首屏图 + 一行说明，不给点了没反应的播放器 ---------- */
  const frame = document.querySelector('.player .frame')
  if (frame) {
    const note = document.querySelector('.player .missing')
    const src = frame.dataset.video
    fetch(src, { method: 'HEAD' })
      .then((response) => {
        if (!response.ok) return
        const video = document.createElement('video')
        video.setAttribute('controls', '')
        video.preload = 'metadata'
        video.poster = frame.dataset.poster ?? ''
        video.src = src
        frame.replaceChildren(video)
        if (note) note.hidden = true
      })
      .catch(() => undefined)
  }
})()
