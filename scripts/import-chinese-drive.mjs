import fs from 'node:fs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

const repo = '.cache/languages-sync'
const report = JSON.parse(fs.readFileSync('.cache/chinese-import-candidates.json', 'utf8'))
const translations = JSON.parse(fs.readFileSync('.cache/chinese-import-translations.json', 'utf8'))
const read = path => JSON.parse(execFileSync('git', ['-C', repo, 'show', `HEAD:chinese/${path}`], { encoding: 'utf8' }))
const words = read('words.json'), hanzi = read('hanzi.json')
const beforeWords = structuredClone(words), beforeHanzi = structuredClone(hanzi)
const known = new Set(words.vocabulary.map(entry => entry.chineese.normalize('NFC')))
const knownCharacters = new Set(hanzi.entries.map(entry => entry.character.normalize('NFC')))
const ids = new Set(words.vocabulary.map(entry => entry.id))
const added = [], addedCharacters = []
for (const entry of report.candidates) {
  const chinese = entry.chinese.normalize('NFC')
  const supplemented = !entry.translations.length && Boolean(translations[chinese])
  const meaning = entry.needsReview ? '' : (entry.translations.join('; ') || translations[chinese] || '')
  const needsReview = entry.needsReview || !meaning
  const notes = [
    needsReview ? 'Импорт личных материалов с Google Drive: сомнительная запись оставлена для проверки; освоение не подтверждено.' : 'Импорт личных материалов с Google Drive: знание значения подтверждено со слов пользователя 2026-11-13; отдельного подтверждения китайского произношения и письма нет.',
    ...entry.sources.map(source => `Источник: ${source.title} (${source.url}).`),
    ...entry.notes,
    ...(supplemented ? ['В исходной карточке перевод отсутствовал; базовый русский перевод дополнен при импорте.'] : []),
    ...(entry.needsReview ? [`Сомнительная запись: исходные значения «${entry.translations.join('; ')}» сохранены только в примечании; написание и перевод требуют проверки.`] : []),
    ...(!meaning ? ['Словарное значение пока не подтверждено; не использовать для автоматической замены русских слов.'] : []),
    ...(entry.pinyin.length ? ['Пиньинь перенесён из исходника без исправлений и без подтверждения произношения.'] : [])
  ].join(' ')
  if (!known.has(chinese)) {
    const id = 'zh-' + [...chinese].map(character => character.codePointAt(0).toString(16)).join('-')
    assert.ok(!ids.has(id))
    words.vocabulary.push({ word: meaning, codeBible: '', english: '', french: '', greece: '', japan: '', chineese: chinese, pinyin: entry.pinyin.join(' / '), id, status: needsReview ? 'needs_review' : 'learned', mastery_confirmed: false, notes })
    known.add(chinese); ids.add(id); added.push(chinese)
  } else {
    const existing = words.vocabulary.find(record => record.chineese.normalize('NFC') === chinese)
    if (!needsReview && existing.status !== 'needs_review') {
      existing.status = 'learned'; existing.mastery_confirmed = false
      existing.notes = [existing.notes, 'Знание значения подтверждено со слов пользователя при импорте личного словаря с Google Drive 2026-11-13; чтение и письмо отдельно не подтверждены.'].filter(Boolean).join(' ')
    }
  }
  if ([...chinese].length === 1 && !knownCharacters.has(chinese)) {
    hanzi.entries.push({ character: chinese, meaning_ru: meaning, pinyin: entry.pinyin, meaning_recognition_confirmed: !needsReview, pronunciation_confirmed: false, needs_review: needsReview, notes })
    knownCharacters.add(chinese); addedCharacters.push(chinese)
  } else if ([...chinese].length === 1) {
    const existing = hanzi.entries.find(record => record.character.normalize('NFC') === chinese)
    if (!needsReview && !existing.needs_review) {
      existing.meaning_recognition_confirmed = true
      existing.notes = [existing.notes, 'Знание значения подтверждено со слов пользователя при импорте личного словаря 2026-11-13; чтение и письмо отдельно не подтверждены.'].filter(Boolean).join(' ')
    }
  }
}
for (let index = 0; index < beforeWords.vocabulary.length; index++) {
  const expected = { ...beforeWords.vocabulary[index] }, actual = { ...words.vocabulary[index] }
  for (const key of ['status', 'mastery_confirmed', 'notes']) { delete expected[key]; delete actual[key] }
  assert.deepEqual(actual, expected)
  if (beforeWords.vocabulary[index].status === 'needs_review') assert.deepEqual(words.vocabulary[index], beforeWords.vocabulary[index])
}
for (let index = 0; index < beforeHanzi.entries.length; index++) {
  const expected = { ...beforeHanzi.entries[index] }, actual = { ...hanzi.entries[index] }
  for (const key of ['meaning_recognition_confirmed', 'notes']) { delete expected[key]; delete actual[key] }
  assert.deepEqual(actual, expected)
  if (beforeHanzi.entries[index].needs_review) assert.deepEqual(hanzi.entries[index], beforeHanzi.entries[index])
}
assert.equal(new Set(words.vocabulary.map(entry => entry.chineese)).size, words.vocabulary.length)
assert.equal(new Set(words.vocabulary.map(entry => entry.id)).size, words.vocabulary.length)
assert.equal(new Set(hanzi.entries.map(entry => entry.character)).size, hanzi.entries.length)
hanzi.note = 'Иероглифы и ключи извлечены из личных словарей на Google Drive. Знание значений отмечено со слов пользователя 2026-11-13; чтение и письмо учитываются отдельно. Сомнительные записи и прежние отметки повторения сохранены.'
const allowedWordFields = new Set(beforeWords.vocabulary.flatMap(entry => Object.keys(entry)))
const allowedHanziFields = new Set(beforeHanzi.entries.flatMap(entry => Object.keys(entry)))
for (const entry of words.vocabulary) for (const key of Object.keys(entry)) assert.ok(allowedWordFields.has(key), key)
for (const entry of hanzi.entries) for (const key of Object.keys(entry)) assert.ok(allowedHanziFields.has(key), key)
for (const [name, data] of [['words.json', words], ['hanzi.json', hanzi]]) fs.writeFileSync(`${repo}/chinese/${name}`, JSON.stringify(data, null, 2) + '\n')
const summary = { wordsAdded: added.length, wordsTotal: words.vocabulary.length, hanziAdded: addedCharacters.length, hanziTotal: hanzi.entries.length, needsReview: words.vocabulary.slice(beforeWords.vocabulary.length).filter(entry => entry.status === 'needs_review').map(entry => entry.chineese), oldRecordsPreserved: true }
fs.writeFileSync('.cache/chinese-import-summary.json', JSON.stringify(summary, null, 2) + '\n')
console.log(JSON.stringify(summary))
