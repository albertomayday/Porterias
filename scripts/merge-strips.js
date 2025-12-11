const fs = require('fs')
const path = require('path')
const destPath = process.argv[2] || 'public/data/strips.json'
const srcPath = process.argv[3] || 'porteria/public/data/strips.json'
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { return { strips: [] } } }
const dest = readJson(destPath)
const src = readJson(srcPath)
const map = new Map()
;(dest.strips || []).forEach(s => map.set(s.id, s))
;(src.strips || []).forEach(s => {
  if (!map.has(s.id)) {
    if (s.image && !s.image.startsWith('/')) s.image = '/strips/' + path.basename(s.image)
    map.set(s.id, s)
  }
})
const merged = { strips: Array.from(map.values()) }
fs.mkdirSync(path.dirname(destPath), { recursive: true })
fs.writeFileSync(destPath, JSON.stringify(merged, null, 2), 'utf8')
console.log(`Merged ${(dest.strips||[]).length} + ${(src.strips||[]).length} => ${merged.strips.length} strips saved to ${destPath}`)
