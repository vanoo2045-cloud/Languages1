import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { extractInterlinearWords } from './interlinear-words.mjs'

const root = new URL('../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')
const learned = read('app/data/learnedWords.ts').split('])')[0]
const known = new Set([...learned.matchAll(/^\s*"(\d+)"/gm)].map(match => match[1]))
const entries = new Map()
let occurrences = 0
for (let chapter = 1; chapter <= 8; chapter++) {
  const filename = chapter >= 7 ? `1Cor${chapter}.html` : `1cor${chapter}.html`
  const html = read('public/' + filename)
  for (const { strong, greek, russian } of extractInterlinearWords(html)) {
    if (!known.has(strong)) continue
    occurrences++
    if (!entries.has(strong)) entries.set(strong, { strong, forms: [] })
    const entry = entries.get(strong)
    let form = entry.forms.find(form => form.greek === greek && form.russian === russian)
    if (!form) {
      form = { greek, russian, chapters: [] }
      entry.forms.push(form)
    }
    if (!form.chapters.includes(chapter)) form.chapters.push(chapter)
  }
}
const result = {
  source: '1 Corinthians 1–8; local saved interlinear chapters',
  selection: 'initiallyLearnedWords from app/data/learnedWords.ts; browser progress not included',
  occurrences,
  missingStrongNumbers: [...known].filter(strong => !entries.has(strong)),
  entries: [...entries.values()].sort((a, b) => Number(a.strong) - Number(b.strong))
}
const output = new URL('exports/learned-greek-1cor1-8.json', root)
mkdirSync(new URL('exports/', root), { recursive: true })
writeFileSync(output, JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ file: fileURLToPath(output), knownStrongNumbers: known.size, exportedWords: entries.size, forms: result.entries.reduce((sum, entry) => sum + entry.forms.length, 0), occurrences, missingStrongNumbers: result.missingStrongNumbers }))
