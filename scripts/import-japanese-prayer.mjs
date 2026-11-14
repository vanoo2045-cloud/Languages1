import fs from 'node:fs'
import assert from 'node:assert/strict'

const root = '.cache/languages-sync/japanese/'
const source = 'https://drive.google.com/file/d/14nidzVltx8SpcG0uNYOXTB58WpLW6lvv/view'
const candidates = JSON.parse(fs.readFileSync('.cache/japanese-prayer-candidates.json', 'utf8'))
const meanings = JSON.parse(fs.readFileSync('.cache/japanese-prayer-meanings.json', 'utf8'))
const words = JSON.parse(fs.readFileSync(root + 'words.json', 'utf8'))
const kanji = JSON.parse(fs.readFileSync(root + 'kanji.json', 'utf8'))
const originalWords = structuredClone(words.vocabulary), originalKanji = structuredClone(kanji.entries)
const excluded = new Set(['意愿', '虚伪', '对', 'の母'])
const review = new Set(['愛人者', '全能の', '上帝', '工'])
const byWord = new Map(candidates.map(entry => [entry.japanese, entry]))
byWord.set('の', { japanese: 'の', originals: ['私の', 'あなたの名'], russian: ['связь и принадлежность внутри выражений'] })
byWord.set('あなた', { japanese: 'あなた', originals: ['あなたの名', 'あなたの'], russian: ['ты / вы внутри выражений'] })
const existing = new Set(words.vocabulary.map(entry => entry.japan.normalize('NFC')))
let addedWords = 0, addedKanji = 0
const newCharacters = new Map()
for (const entry of byWord.values()) {
  if (excluded.has(entry.japanese)) continue
  assert.ok(Object.hasOwn(meanings.words, entry.japanese), entry.japanese)
  const japanese = entry.japanese.normalize('NFC')
  const needsReview = review.has(japanese)
  const notes = [`Источник: ${source}.`, 'Из личного гибридного молитвослова; чтение, письмо и освоение значения отдельно не проверялись.', `Исходные замены: ${entry.russian.join('; ')} → ${entry.originals.join('; ')}.`, 'Русские окончания удалены; русское значение приведено к самостоятельному слову или выражению.', ...(needsReview ? ['Исходная замена неточна или требует проверки; не считать её подтверждённым японским переводом.'] : [])].join(' ')
  if (!existing.has(japanese)) {
    const kanaOnly = /^[\p{Script=Hiragana}ー]+$/u.test(japanese)
    const katakanaOnly = /^[\p{Script=Katakana}ー]+$/u.test(japanese)
    words.vocabulary.push({ word: meanings.words[japanese], codeBible: '', english: '', french: '', greece: '', japan: japanese, chineese: '', hiragana: kanaOnly ? japanese : '', katakana: katakanaOnly ? japanese : '', romaji: '', id: 'ja-' + [...japanese].map(char => char.codePointAt(0).toString(16)).join('-'), status: needsReview ? 'needs_review' : 'studied', notes })
    existing.add(japanese); addedWords++
  }
  for (const character of japanese.match(/\p{Script=Han}/gu) || []) {
    if (newCharacters.has(character)) continue
    const meaning = meanings.characters[character] || meanings.words[character] || kanji.entries.find(entry => entry.character === character)?.meaning_ru
    assert.ok(meaning, `Missing character meaning: ${character}`)
    newCharacters.set(character, meaning)
  }
}
for (const [character, meaning] of newCharacters) {
  if (kanji.entries.some(entry => entry.character === character)) continue
  kanji.entries.push({ character, meaning_ru: meaning, learned_meaning: false, reading_confirmed: false, notes: `Встречается в личном гибридном молитвослове: ${source}. Значение приведено отдельно от русских окончаний и контекстных подстановок; освоение, чтение и письмо не подтверждались.` })
  addedKanji++
}
assert.deepEqual(words.vocabulary.slice(0, originalWords.length), originalWords)
assert.deepEqual(kanji.entries.slice(0, originalKanji.length), originalKanji)
assert.equal(new Set(words.vocabulary.map(entry => entry.japan.normalize('NFC'))).size, words.vocabulary.length)
assert.equal(new Set(words.vocabulary.map(entry => entry.id)).size, words.vocabulary.length)
assert.equal(new Set(kanji.entries.map(entry => entry.character)).size, kanji.entries.length)
assert.ok(words.vocabulary.every(entry => !/\p{Script=Cyrillic}/u.test(entry.japan)))
assert.ok(words.vocabulary.some(entry => entry.japan === 'と' && entry.hiragana === 'と'))
assert.ok(words.vocabulary.some(entry => entry.japan === 'あなたの名'))
assert.ok(words.vocabulary.filter(entry => entry.status === 'needs_review').every(entry => !Object.hasOwn(entry, 'mastery_confirmed') || !entry.mastery_confirmed))
for (const [name, data] of [['words.json', words], ['kanji.json', kanji]]) fs.writeFileSync(root + name, JSON.stringify(data, null, 2) + '\n')
console.log(JSON.stringify({ addedWords, totalWords: words.vocabulary.length, addedKanji, totalKanji: kanji.entries.length, reviewedExpressions: [...review], excludedFragments: [...excluded], preservedExistingEntries: true }))
