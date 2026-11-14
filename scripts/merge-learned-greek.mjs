import { readFileSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const root = new URL('../', import.meta.url)
const path = new URL('.cache/languages-sync/ancientGreek/words.json', root)
const dictionary = JSON.parse(readFileSync(path, 'utf8'))
const original = structuredClone(dictionary)
const extracted = JSON.parse(readFileSync(new URL('exports/learned-greek-1cor1-8.json', root), 'utf8'))
const learned = readFileSync(new URL('app/data/learnedWords.ts', root), 'utf8').split('])')[0]
const hints = new Map([...learned.matchAll(/"(\d+)",\s*\/\/\s*(.*?)\s+-\s+([^\r\n]+)/g)].map(match => [match[1], { greek: match[2], russian: match[3] }]))
const stripPunctuation = text => text.trim().replace(/^[.,;:!?··;]+|[.,;:!?··;]+$/g, '')
const normalize = text => stripPunctuation(text).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const codes = new Set(dictionary.vocabulary.map(entry => entry.codeBible))
const skipped = []
const added = []
for (const entry of extracted.entries) {
  if (codes.has(entry.strong)) { skipped.push({ code: entry.strong, reason: 'already_in_dictionary' }); continue }
  // The saved chapter labels standalone καί as 1499; that number belongs to εἰ καί.
  // Standalone καί is already imported correctly as 2532, so do not create a false duplicate.
  if (entry.strong === '1499') { skipped.push({ code: entry.strong, reason: 'standalone_kai_duplicate_of_2532' }); continue }
  const hint = hints.get(entry.strong)
  const hintForms = (hint?.greek || '').split(',').map(normalize)
  const form = entry.forms.find(form => hintForms.includes(normalize(form.greek))) || entry.forms[0]
  const greek = stripPunctuation(form.greek)
  // Articles have contextual bracketed glosses in the interlinear, not a standalone translation.
  const russian = entry.strong === '3588' ? 'определённый артикль' : stripPunctuation(form.russian)
  const record = {
    word: russian,
    codeBible: entry.strong,
    english: '',
    french: '',
    greece: greek,
    japan: '',
    chineese: '',
    status: 'learned',
    mastery_confirmed: true,
    notes: `Отмечено пользователем как изначально изученное в app/data/learnedWords.ts. Форма и перевод из 1 Кор ${form.chapters.join(', ')}; сохранена форма из текста, не обязательно словарная. Отдельная проверка знания не проводилась.`
  }
  dictionary.vocabulary.push(record)
  codes.add(entry.strong)
  added.push({ codeBible: entry.strong, word: russian, greece: greek })
}
assert.deepEqual(dictionary.vocabulary.slice(0, original.vocabulary.length), original.vocabulary)
assert.deepEqual(Object.keys(dictionary), Object.keys(original))
assert.ok(dictionary.vocabulary.every(entry => !Object.hasOwn(entry, 'id')))
assert.equal(new Set(dictionary.vocabulary.map(entry => entry.codeBible)).size, dictionary.vocabulary.length)
const allowedFields = new Set(original.vocabulary.flatMap(entry => Object.keys(entry)))
for (const record of dictionary.vocabulary) for (const key of Object.keys(record)) assert.ok(allowedFields.has(key), `New schema field: ${key}`)
writeFileSync(path, JSON.stringify(dictionary, null, 2) + '\n')
console.log(JSON.stringify({ before: original.vocabulary.length, added: added.length, total: dictionary.vocabulary.length, skipped, newRecords: added }, null, 2))
