// 核对 npm run icons 的 mac 产物真字节：
// 1) icon.icns 的条目表能走通、每条目都是 PNG 载荷、尺寸对上槽位；
// 2) 模板图 trayTemplate 的 alpha 必须有中间值（软边）且 RGB 全 0，否则 macOS 拿它当蒙版会渲成实心块。
// 用法：node scripts/probe-mac-assets.mjs
import { inflateSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const dir = path.resolve(import.meta.dirname, '../resources')
const ICNS_SLOT = { ic07: 128, ic08: 256, ic09: 512, ic10: 1024, ic11: 32, ic12: 64, ic13: 256, ic14: 512 }

checkIcns()
checkTemplates()

function checkIcns() {
  const icns = readFileSync(path.join(dir, 'icon.icns'))
  const magic = icns.subarray(0, 4).toString('ascii')
  console.log('icon.icns magic', JSON.stringify(magic), 'declared', icns.readUInt32BE(4), 'actual', icns.length)

  let off = 8
  const rows = []
  while (off + 8 <= icns.length) {
    const type = icns.subarray(off, off + 4).toString('ascii')
    const len = icns.readUInt32BE(off + 4)
    const payload = icns.subarray(off + 8, off + len)
    const { width, height } = pngHeader(payload)
    rows.push({ type, len, isPng: payload.readUInt32BE(0) === 0x89504e47, width, height, expected: ICNS_SLOT[type] })
    off += len
  }
  for (const r of rows) {
    const ok = r.isPng && r.width === r.height && r.width === r.expected
    console.log(`  ${r.type} ${r.width}x${r.height} png=${r.isPng} slot=${r.expected} ${ok ? 'OK' : 'BAD'}`)
  }
  console.log('  walked to end:', off === icns.length, '| entries:', rows.length)
}

function checkTemplates() {
  for (const name of ['trayTemplate.png', 'trayTemplate@2x.png', 'tray.png']) {
    const { width, data } = decodeRgba(readFileSync(path.join(dir, name)))
    const alpha = new Set()
    let colored = 0
    let opaque = 0
    for (let i = 0; i < data.length; i += 4) {
      alpha.add(data[i + 3])
      if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) colored += 1
      if (data[i + 3] === 255) opaque += 1
    }
    const values = [...alpha].sort((a, b) => a - b)
    console.log(
      `${name} ${width}px alpha值=${values.length} 中间值=${values.filter((v) => v > 0 && v < 255).length}` +
        ` RGB非零像素=${colored} 不透明像素=${opaque}`
    )
  }
}

function pngHeader(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

/** 够读makeIcons.mjs 写出来的那几张：RGBA8、非交错、位深 8。 */
function decodeRgba(buf) {
  let p = 8
  let width = 0
  let height = 0
  const idat = []
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p)
    const type = buf.subarray(p + 4, p + 8).toString('ascii')
    if (type === 'IHDR') {
      width = buf.readUInt32BE(p + 8)
      height = buf.readUInt32BE(p + 12)
    }
    if (type === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len))
    p += 12 + len
  }

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * 4
  const out = Buffer.alloc(height * stride)
  let prev = Buffer.alloc(stride)
  let rp = 0
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rp++]
    const line = Buffer.alloc(stride)
    for (let x = 0; x < stride; x += 1) {
      const cur = raw[rp + x]
      const a = x >= 4 ? line[x - 4] : 0
      const b = prev[x]
      const c = x >= 4 ? prev[x - 4] : 0
      const delta = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? paeth(a, b, c) : 0
      line[x] = (cur + delta) & 0xff
    }
    rp += stride
    line.copy(out, y * stride)
    prev = line
  }
  return { width, height, data: out }
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}
