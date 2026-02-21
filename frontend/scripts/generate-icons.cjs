const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const t = Buffer.from(type)
  const d = data || Buffer.alloc(0)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(d.length)
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc32(Buffer.concat([t, d])))
  return Buffer.concat([len, t, d, c])
}

function createPNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2

  const row = Buffer.alloc(1 + size * 3)
  row[0] = 0
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r
    row[2 + x * 3] = g
    row[3 + x * 3] = b
  }

  const raw = Buffer.alloc(row.length * size)
  for (let y = 0; y < size; y++) row.copy(raw, y * row.length)

  const compressed = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND')])
}

const AMBER = [217, 119, 6]
const DARK = [41, 37, 36]

const iconsDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(iconsDir, { recursive: true })

const files = [
  { name: 'icon-192.png', size: 192, color: AMBER },
  { name: 'icon-512.png', size: 512, color: AMBER },
  { name: 'icon-maskable-192.png', size: 192, color: AMBER },
  { name: 'icon-maskable-512.png', size: 512, color: AMBER },
]

for (const f of files) {
  const png = createPNG(f.size, ...f.color)
  fs.writeFileSync(path.join(iconsDir, f.name), png)
  console.log(`${f.name} (${f.size}x${f.size}) - ${png.length} bytes`)
}

console.log('Placeholder icons created. Replace with real icons later.')
