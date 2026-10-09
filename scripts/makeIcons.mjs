// 生成 resources/tray.png(16) / trayTemplate.png(16) / trayTemplate@2x.png(32) /
//      resources/icon.png(256) / icon.ico（内嵌 PNG，Vista+ 起支持）/ icon.icns（macOS 用）
// 纯 Node：PNG = zlib deflate + CRC32 分块，不引图像库，也不依赖只有 Mac 上才有的 iconutil。
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const INK = [37, 99, 235, 255]
const PAPER = [255, 255, 255, 255]
const TRANSPARENT = [0, 0, 0, 0]

/** icns 条目类型 → 像素边长（10.7+ 的 @2x 槽位单独算）。 */
const ICNS_ENTRIES = [
  ['ic07', 128],
  ['ic08', 256],
  ['ic09', 512],
  ['ic10', 1024],
  ['ic11', 32],
  ['ic12', 64],
  ['ic13', 256],
  ['ic14', 512]
]

const outDir = path.resolve(import.meta.dirname, '../resources')
mkdirSync(outDir, { recursive: true })

writeFileSync(path.join(outDir, 'tray.png'), encodePng(render(16), 16))
writeFileSync(path.join(outDir, 'trayTemplate.png'), encodePng(renderGlyph(16), 16))
writeFileSync(path.join(outDir, 'trayTemplate@2x.png'), encodePng(renderGlyph(32), 32))
writeFileSync(path.join(outDir, 'icon.png'), encodePng(render(256), 256))
writeFileSync(path.join(outDir, 'icon.ico'), encodeIco(encodePng(render(256), 256)))

// 同一尺寸只栅格化一次（ic13/ic08 都是 256），否则 1024 那一档要把采样循环跑两遍
const pngBySize = new Map()
for (const [, size] of ICNS_ENTRIES) {
  if (!pngBySize.has(size)) pngBySize.set(size, encodePng(render(size), size))
}
writeFileSync(
  path.join(outDir, 'icon.icns'),
  encodeIcns(ICNS_ENTRIES.map(([type, size]) => ({ type, png: pngBySize.get(size) })))
)
console.log('icons written to', outDir)

/** 圆角方底 + 白色对勾，4x 超采样做边缘过渡。 */
function render(size) {
  const samples = 4
  const rgba = new Uint8Array(size * size * 4)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let coverage = 0
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          if (isTick((x + sx / samples) / size, (y + sy / samples) / size)) coverage += 1
        }
      }
      const color = pixelColour((x + 0.5) / size, (y + 0.5) / size, coverage / (samples * samples))
      color.forEach((value, index) => {
        rgba[y * size * 4 + x * 4 + index] = value
      })
    }
  }
  return rgba
}

function pixelColour(u, v, tickRatio) {
  if (!inRoundedSquare(u, v)) return TRANSPARENT
  return mix(INK, PAPER, tickRatio)
}

/**
 * macOS 菜单栏模板图专用：只画对勾字形，RGB 一律 0，抗锯齿全落在 alpha 上。
 * tray.png 那份不能直接拿来设 isTemplate —— 它圆角方框内 alpha 恒为 255，
 * 而模板图系统只看 alpha 当蒙版，结果就是一块实心黑圆角，勾根本看不见。
 * pad 把字形外扩一点点，16pt 下才不至于糊成一团。
 */
function renderGlyph(size) {
  const samples = 4
  const pad = 0.05
  const span = size * (1 - 2 * pad)
  const rgba = new Uint8Array(size * size * 4)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let coverage = 0
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const u = (x + sx / samples - size * pad) / span
          const v = (y + sy / samples - size * pad) / span
          if (isTick(u, v)) coverage += 1
        }
      }
      rgba[(y * size + x) * 4 + 3] = Math.round((coverage / (samples * samples)) * 255)
    }
  }
  return rgba
}

function mix(from, to, ratio) {
  return [
    Math.round(from[0] + (to[0] - from[0]) * ratio),
    Math.round(from[1] + (to[1] - from[1]) * ratio),
    Math.round(from[2] + (to[2] - from[2]) * ratio),
    255
  ]
}

function inRoundedSquare(u, v) {
  const margin = 0.04
  const radius = 0.22
  const min = margin
  const max = 1 - margin
  if (u < min || u > max || v < min || v > max) return false

  const cx = clamp(u, min + radius, max - radius)
  const cy = clamp(v, min + radius, max - radius)
  return Math.hypot(u - cx, v - cy) <= radius
}

/** 对勾：短边 (0.26,0.55)→(0.43,0.70)，长边 (0.43,0.70)→(0.78,0.30)。 */
function isTick(u, v) {
  const thickness = 0.085
  return (
    distanceToSegment(u, v, 0.26, 0.55, 0.43, 0.7) < thickness ||
    distanceToSegment(u, v, 0.43, 0.7, 0.78, 0.3) < thickness
  )
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const squared = dx * dx + dy * dy
  const t = squared === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / squared, 0, 1)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function clamp(value, low, high) {
  return Math.min(Math.max(value, low), high)
}

function encodePng(rgba, dim) {
  const stride = dim * 4
  const raw = Buffer.alloc(dim * (stride + 1))
  for (let y = 0; y < dim; y += 1) {
    raw[y * (stride + 1)] = 0
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(dim, 0)
  ihdr.writeUInt32BE(dim, 4)
  ihdr[8] = 8
  ihdr[9] = 6

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/**
 * icns = 'icns' + 文件总长 + 若干 (4 字节类型, 含头长度, 载荷)。
 * macOS 10.7+ 每个条目都接受 PNG 载荷，所以不必调只有 Mac 上才有的 iconutil；
 * electron-builder 自己那条 png→icns 的路要先从 GitHub 下一套 icons toolset，这份是纯离线的。
 */
function encodeIcns(entries) {
  const body = Buffer.concat(
    entries.map(({ type, png }) => Buffer.concat([Buffer.from(type, 'ascii'), uint32be(png.length + 8), png]))
  )
  return Buffer.concat([Buffer.from('icns', 'ascii'), uint32be(body.length + 8), body])
}

function uint32be(value) {
  const buf = Buffer.alloc(4)
  buf.writeUInt32BE(value, 0)
  return buf
}

function encodeIco(png) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  const entry = Buffer.alloc(16)
  entry[0] = 0
  entry[1] = 0
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(22, 12)

  return Buffer.concat([header, entry, png])
}

function chunk(type, data) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'ascii')
  // CRC 覆盖 type+data，但流里 type 只出现一次（head 里已经写过）
  const crcInput = Buffer.concat([Buffer.from(type, 'ascii'), data])
  return Buffer.concat([head, data, crc32(crcInput)])
}

function crc32(buffer) {
  let value = 0xffffffff
  for (const byte of buffer) {
    value ^= byte
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1
  }
  const out = Buffer.alloc(4)
  out.writeUInt32BE((value ^ 0xffffffff) >>> 0, 0)
  return out
}
