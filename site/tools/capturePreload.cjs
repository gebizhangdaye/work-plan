// 截图用的假 API：把一套演示数据喂给真实渲染层（组件与 CSS 都是产品本尊），
// 这样产品图既不用碰 %APPDATA%\work-plan 的真实数据，也不是手画的假界面。
const { contextBridge } = require('electron')

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()
const iso = (offsetDays, hour = 9) => {
  const date = new Date(now + offsetDays * DAY)
  date.setHours(hour, 20, 0, 0)
  return date.toISOString()
}
const day = (offsetDays) => iso(offsetDays, 12).slice(0, 10)

const TAGS = {
  pay: { id: 'tag-pay', name: '支付', color: '#c2413f' },
  ops: { id: 'tag-ops', name: '线上问题', color: '#b3541e' },
  web: { id: 'tag-web', name: '官网', color: '#0b5cab' },
  api: { id: 'tag-api', name: '接口', color: '#1f7a4d' },
  test: { id: 'tag-test', name: '测试', color: '#6b4fa0' },
  infra: { id: 'tag-infra', name: '基建', color: '#4a5568' }
}

const CHAT = {
  id: 'att-chat',
  relPath: 'attachments/2026/10/a41f9c27.png',
  bytes: 31_402,
  width: 420,
  height: 264,
  croppedFrom: null
}

let items = [
  {
    id: 'i-1',
    title: '支付回调重复入账，补幂等键',
    noteMd: '线上同一笔订单入了两次账。回调要按 outTradeNo 去重，先查对账流水再落库。',
    lane: 'urgent',
    plannedDate: day(-2),
    status: 'open',
    doneAt: null,
    rank: 100,
    createdAt: iso(-3, 10),
    updatedAt: iso(0, 8),
    attachments: [],
    tags: [TAGS.pay, TAGS.ops]
  },
  {
    id: 'i-2',
    title: '官网首屏文案定稿',
    noteMd: '三句话讲清：记什么、怎么用、数据在哪。',
    lane: 'urgent',
    plannedDate: day(0),
    status: 'open',
    doneAt: null,
    rank: 200,
    createdAt: iso(-2, 15),
    updatedAt: iso(-1, 17),
    attachments: [],
    tags: [TAGS.web]
  },
  {
    id: 'i-3',
    title: '和后端对齐导出字段',
    noteMd: '微信上说的 8 列以截图为准，别照 PRD 里的旧版本写。',
    lane: 'today',
    plannedDate: day(0),
    status: 'open',
    doneAt: null,
    rank: 100,
    createdAt: iso(-1, 11),
    updatedAt: iso(0, 9),
    attachments: [CHAT],
    tags: [TAGS.api]
  },
  {
    id: 'i-4',
    title: '整理 Q4 需求池，砍掉三条',
    noteMd: '',
    lane: 'today',
    plannedDate: day(0),
    status: 'open',
    doneAt: null,
    rank: 200,
    createdAt: iso(-4, 9),
    updatedAt: iso(-2, 14),
    attachments: [],
    tags: []
  },
  {
    id: 'i-5',
    title: '补 ordering 归一化的单测',
    noteMd: '半间距翻转那条边界要覆盖到。',
    lane: 'today',
    plannedDate: day(-1),
    status: 'done',
    doneAt: iso(-1, 18),
    rank: 300,
    createdAt: iso(-5, 9),
    updatedAt: iso(-1, 18),
    attachments: [],
    tags: [TAGS.test]
  },
  {
    id: 'i-6',
    title: '把应用日志接进集中查询',
    noteMd: '先看现成的方案，别自己造采集端。',
    lane: 'later',
    plannedDate: day(9),
    status: 'open',
    doneAt: null,
    rank: 100,
    createdAt: iso(-6, 9),
    updatedAt: iso(-3, 10),
    attachments: [],
    tags: [TAGS.infra]
  },
  {
    id: 'i-7',
    title: '写招聘 JD 初稿',
    noteMd: '',
    lane: 'later',
    plannedDate: null,
    status: 'open',
    doneAt: null,
    rank: 200,
    createdAt: iso(-7, 16),
    updatedAt: iso(-7, 16),
    attachments: [],
    tags: []
  },
  {
    id: 'i-8',
    title: '读《重构》第 4 章并做笔记',
    noteMd: '',
    lane: 'later',
    plannedDate: day(4),
    status: 'done',
    doneAt: iso(0, 7),
    rank: 300,
    createdAt: iso(-9, 21),
    updatedAt: iso(0, 7),
    attachments: [],
    tags: []
  }
]

const clone = (value) => JSON.parse(JSON.stringify(value))
const find = (id) => items.find((item) => item.id === id)

function listTags() {
  const usage = new Map()
  for (const item of items) {
    for (const tag of item.tags) usage.set(tag.id, (usage.get(tag.id) ?? 0) + 1)
  }
  return Object.values(TAGS)
    .filter((tag) => usage.has(tag.id))
    .map((tag) => ({ ...tag, usage: usage.get(tag.id) }))
}

const settings = (openAtLogin = true) => ({
  openAtLogin,
  version: '0.1.0',
  dataRoot: 'C:\\Users\\demo\\AppData\\Roaming\\work-plan',
  dbBytes: 65_536,
  attachmentBytes: 1_284_000,
  attachmentCount: 6,
  itemCount: items.length
})

const RAW_API = {
  ping: () => 'pong',
  listItems: () => clone(items),
  listTags: () => clone(listTags()),
  createItem: (draft) => {
    const item = {
      id: `i-${Date.now()}`,
      title: draft.title,
      noteMd: draft.noteMd ?? '',
      lane: draft.lane ?? 'today',
      plannedDate: draft.plannedDate ?? null,
      status: 'open',
      doneAt: null,
      rank: 900,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
      tags: []
    }
    items = [...items, item]
    return clone(item)
  },
  updateItem: (id, draft) => {
    const item = find(id)
    Object.assign(item, draft, { updatedAt: new Date().toISOString() })
    return clone(item)
  },
  toggleDone: (id) => {
    const item = find(id)
    item.status = item.status === 'done' ? 'open' : 'done'
    item.doneAt = item.status === 'done' ? new Date().toISOString() : null
    item.updatedAt = new Date().toISOString()
    return clone(items)
  },
  moveItem: (id, lane) => {
    const item = find(id)
    item.lane = lane
    return clone(items)
  },
  deleteItem: (id) => {
    items = items.filter((item) => item.id !== id)
  },
  pasteAttachment: () => ({ attachment: null }),
  importFiles: () => [],
  addCroppedImage: () => null,
  openAttachmentInFolder: () => undefined,
  ensureTag: (name) => ({ id: `tag-${name}`, name, color: '#0b5cab', usage: 1 }),
  attachTag: (id, tagId) => {
    const item = find(id)
    const tag = Object.values(TAGS).find((entry) => entry.id === tagId)
    if (tag && !item.tags.some((entry) => entry.id === tag.id)) item.tags = [...item.tags, tag]
    return clone(items)
  },
  detachTag: (id, tagId) => {
    const item = find(id)
    item.tags = item.tags.filter((entry) => entry.id !== tagId)
    return clone(items)
  },
  exportPlan: () => 'C:\\Users\\demo\\工作计划-2026-10-08.md',
  getSettings: () => settings(),
  setAutoStart: (enabled) => settings(enabled),
  hideToTray: () => undefined,
  minimizeWindow: () => undefined,
  toggleMaximize: () => undefined,
  isMaximized: () => false,
  onWindowMaximizeChanged: () => undefined,
  runMenuAction: () => undefined,
  setMiniWindow: () => undefined,
  onWindowRefresh: () => undefined,
  quit: () => undefined,
  getPathForFile: () => ''
}

// contextBridge 会把返回值做结构化克隆：产品代码到处在 .then()，所以每个方法都得是 async。
const api = Object.fromEntries(
  Object.entries(RAW_API).map(([key, value]) => [key, async (...args) => value(...args)])
)

contextBridge.exposeInMainWorld('workPlan', api)
