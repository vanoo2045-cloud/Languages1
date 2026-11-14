import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync('public/japanese.html', 'utf8')
const object = source.match(/const wordMap\s*=\s*(\{[\s\S]*?\n\s*\});/)
if (!object) throw new Error('Japanese wordMap not found')
const wordMap = vm.runInNewContext(`(${object[1]})`, {}, { timeout: 1000 })
const normalize = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ё/g, 'е')
const dictionary = JSON.parse(fs.readFileSync('public/dictionaries/japanese.json', 'utf8')).vocabulary
const groups = new Map()
for (const [original, translated] of Object.entries(wordMap)) {
  const russian = original.trim().replace(/[.,!?;:]+$/u, '')
  const replacement = translated.trim().replace(/[.,!?;:]+$/u, '')
  const foreign = replacement.replace(/\p{Script=Cyrillic}/gu, '').trim()
  if (!foreign || !/^[\p{Script=Cyrillic}\p{M}\s-]+$/u.test(russian)) continue
  let entry = groups.get(foreign)
  if (!entry) {
    const existing = dictionary.find(item => item.japan === foreign)
    entry = { word: existing?.word || russian, japan: foreign, status: 'studied', stems: [], stemsInsideWords: true, readingForms: [] }
    groups.set(foreign, entry)
  }
  entry.readingForms.push({ russian, foreign: replacement })
  // Single-word fragments in the old page were prefixes. Retain a shared Russian
  // suffix as source text instead of embedding it in the replacement button.
  if (!/\s/.test(russian) && original === original.trim()) {
    let stem = normalize(russian)
    let suffix = replacement.match(/\p{Script=Cyrillic}+$/u)?.[0] || ''
    if (suffix && stem.endsWith(normalize(suffix))) stem = stem.slice(0, -normalize(suffix).length)
    else if (suffix) continue
    if (stem.length >= 3 && !entry.stems.includes(stem)) entry.stems.push(stem)
  }
}
const mother = groups.get('母')
if (!mother) throw new Error('Mother entry missing')
mother.word = 'мать'
mother.stems.push('матер')
const vocabulary = [...groups.values()]
for (const entry of vocabulary) {
  entry.notes = 'Правила чтения перенесены из public/japanese.html. Полные словарные значения имеют приоритет; корни сохраняют русское окончание.'
}
fs.writeFileSync('app/data/japaneseSupplement.json', JSON.stringify({ vocabulary }, null, 2) + '\n')
console.log(`Imported ${vocabulary.length} entries, ${vocabulary.reduce((sum, e) => sum + e.stems.length, 0)} stems, ${vocabulary.reduce((sum, e) => sum + e.readingForms.length, 0)} reading forms`)
