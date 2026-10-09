// 一次性探测脚本：在 Electron 自带 Node 里验证 node:sqlite 的真实可用性（含 WAL 与 fts5 编译开关）。
const { app } = require('electron')
const os = require('node:os')
const path = require('node:path')
const fs = require('node:fs')

app.whenReady().then(() => {
  const report = { electron: app.getVersion(), node: process.versions.node, sqlite: process.versions.sqlite }
  try {
    const sqlite = require('node:sqlite')
    report.exportedKeys = Object.keys(sqlite).join(',')
    const Ctor = sqlite.DatabaseSync ?? sqlite.Database
    report.ctor = Ctor === sqlite.DatabaseSync ? 'DatabaseSync' : 'Database'

    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wp-probe-')), 'probe.db')
    const db = new Ctor(file)
    db.exec('PRAGMA journal_mode = WAL;')
    const mode = db.prepare('PRAGMA journal_mode;').get()
    db.exec('CREATE TABLE t (id TEXT PRIMARY KEY, v INTEGER);')
    db.prepare('INSERT INTO t (id, v) VALUES (?, ?);').run('a', 7)
    report.roundTrip = db.prepare('SELECT v FROM t WHERE id = ?;').get('a')
    db.close()
    report.walMode = mode.journal_mode
    report.fileCreated = fs.existsSync(file)

    const probe2 = new Ctor(':memory:')
    try {
      probe2.exec('CREATE VIRTUAL TABLE f USING fts5(x);')
      report.fts5 = true
    } catch (err) {
      report.fts5 = false
      report.fts5Error = String(err.message).slice(0, 80)
    }
    probe2.close()
    report.result = 'OK'
  } catch (err) {
    report.result = 'FAILED'
    report.error = String(err && err.stack ? err.stack : err).slice(0, 400)
  }
  console.log('PROBE_JSON:' + JSON.stringify(report))
  app.quit()
})
