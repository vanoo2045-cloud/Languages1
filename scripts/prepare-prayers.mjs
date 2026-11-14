import { readFileSync, writeFileSync, readdirSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const write = (path, data) => writeFileSync(new URL('../' + path, import.meta.url), JSON.stringify(data, null, 2) + '\n')
const normalize = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ё/g, 'е')
const clean = text => text.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').trim()
const vocabulary = JSON.parse(read('app/data/vocabulary.json')).vocabulary
const learned = read('app/data/learnedWords.ts').split('])')[0]
const known = new Set([...learned.matchAll(/^\s*"(\d+)"/gm)].map(match => match[1]))
vocabulary.forEach(entry => known.add(entry.pronunciation))
const words = new Map()
function add(russian, greek, strong) {
  russian = clean(russian).replace(/^[.,;:!?··;]+|[.,;:!?··;]+$/g, '')
  greek = clean(greek).replace(/^[.,;:!?··;]+|[.,;:!?··;]+$/g, '')
  if (!/^[\p{Script=Cyrillic}\p{M}]+$/u.test(russian) || !/\p{Script=Greek}/u.test(greek)) return
  const key = normalize(russian)
  if (!words.has(key)) words.set(key, { russian, greek, strong })
}
// Explicit vocabulary takes priority over examples from the chapters.
vocabulary.forEach(entry => add(entry.english, entry.word, entry.pronunciation))
for (const filename of readdirSync(new URL('../public/', import.meta.url)).filter(name => /^1cor\d+\.html$/i.test(name)).sort()) {
  const html = read('public/' + filename)
  for (const match of html.matchAll(/<span class="word"[^>]*data-word="(\d+)"[^>]*>([\s\S]*?)(?=<span class="word"|<\/div>)/g)) {
    if (!known.has(match[1])) continue
    const greek = match[2].match(/<a class="greek-word"[^>]*>([\s\S]*?)<\/a>/)?.[1]
    const russian = match[2].match(/<span class="rus-word"[^>]*>([\s\S]*?)<\/span>/)?.[1]
    if (greek && russian) add(russian, greek, match[1])
  }
}
// The original learned-word list also includes forms absent from the saved chapters.
for (const match of learned.matchAll(/"(\d+)",\s*\/\/\s*(\S+)\s+-\s+([^\r\n]+)/g)) add(match[3], match[2], match[1])
write('app/data/prayerWords.json', [...words.values()])

const source = read('public/japanese.html')
const start = source.indexOf('Молитвы на сон грядущим')
const end = source.indexOf('<section class="type-female">', start)
if (start < 0 || end < 0) throw Error('Prayer text boundaries not found')
const prayers = source.slice(start, end).replace(/<br\s*\/?>/gi, '\n').split(/\r?\n/)
  .map(clean).filter(Boolean).map(text => ({ text, heading: /^(Молитв[аы]|Тропари|\(24 молитвы)/u.test(text) }))
write('app/data/prayers.json', prayers)
console.log(`Prepared ${prayers.length} prayer paragraphs and ${words.size} dictionary forms`)
