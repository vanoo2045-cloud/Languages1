import fs from 'node:fs'
import assert from 'node:assert/strict'

const root = '.cache/languages-sync/'
const source = 'https://www.unicode.org/Public/17.0.0/ucd/CJKRadicals.txt'
const names = JSON.parse(fs.readFileSync('.cache/kangxi-meanings-ru.json', 'utf8'))
const unicode = fs.readFileSync('.cache/UnicodeData.txt', 'utf8').split('\n').map(line => line.split(';'))
const raw = unicode.filter(row => row[1]?.startsWith('KANGXI RADICAL '))
assert.equal(raw.length, 214)
assert.equal(names.length, 214)
const radicals = raw.map((row, index) => ({ number: index + 1, character: String.fromCodePoint(parseInt(row[5].split(' ').at(-1), 16)), meaning: names[index], variants: [] }))
for (const line of fs.readFileSync('.cache/CJKRadicals.txt', 'utf8').split('\n')) {
  if (!/^\d/.test(line)) continue
  const [label, form, unified] = line.split(';').map(part => part.trim())
  const number = parseInt(label, 10)
  assert.ok(number >= 1 && number <= 214)
  const radical = radicals[number - 1]
  for (const code of [form, unified]) {
    if (!code) continue
    const character = String.fromCodePoint(parseInt(code, 16)).normalize('NFKC')
    if (character !== radical.character && !radical.variants.includes(character)) radical.variants.push(character)
  }
}
// Japanese shinjitai forms not all represented by the simplified-Chinese aliases.
for (const [number, form] of [[63, '戸'], [174, '青'], [199, '麦'], [201, '黄'], [203, '黒'], [210, '斉'], [211, '歯'], [212, '竜'], [213, '亀']]) {
  const entry = radicals[number - 1]
  if (form !== entry.character && !entry.variants.includes(form)) entry.variants.push(form)
}
assert.equal(new Set(radicals.map(entry => entry.character)).size, 214)
const summary = []
for (const [language, characterFile, meaningKey, learnedKey, readingKey] of [
  ['japanese', 'kanji.json', 'meaning_ru', 'learned_meaning', 'reading_confirmed'],
  ['chinese', 'hanzi.json', 'meaning_ru', 'meaning_recognition_confirmed', 'pronunciation_confirmed']
]) {
  const chars = JSON.parse(fs.readFileSync(root + language + '/' + characterFile, 'utf8'))
  const words = JSON.parse(fs.readFileSync(root + language + '/words.json', 'utf8'))
  const oldChars = structuredClone(chars.entries), oldWords = structuredClone(words.vocabulary)
  let addedCharacters = 0, addedWords = 0
  for (const radical of radicals) {
    const metadata = { is_radical: true, radical_system: 'kangxi', radical_number: radical.number, radical_learned: true, radical_meaning_ru: radical.meaning, radical_variants: radical.variants }
    const note = `Ключ Канси № ${radical.number}; выучен со слов пользователя 2026-11-13. Это отметка знания ключа, не подтверждение всех значений самостоятельного слова, чтений или письма. Источник нумерации и форм: ${source}. Варианты приведены для справки, без отдельной проверки их освоения.`
    let entry = chars.entries.find(item => item.character === radical.character)
    if (!entry) {
      entry = { character: radical.character, [meaningKey]: radical.meaning, ...(language === 'chinese' ? { pinyin: [] } : {}), [learnedKey]: true, [readingKey]: false, ...(language === 'chinese' ? { needs_review: false } : {}) }
      chars.entries.push(entry); addedCharacters++
    }
    Object.assign(entry, metadata)
    entry.notes = [entry.notes, note].filter(Boolean).join(' ')
    const japanese = language === 'japanese'
    const field = japanese ? 'japan' : 'chineese'
    let word = words.vocabulary.find(item => item[field] === radical.character)
    if (!word) {
      word = { word: radical.meaning, codeBible: '', english: '', french: '', greece: '', japan: japanese ? radical.character : '', chineese: japanese ? '' : radical.character, ...(japanese ? { hiragana: '', katakana: '', romaji: '' } : { pinyin: '' }), id: `${japanese ? 'ja' : 'zh'}-${radical.character.codePointAt(0).toString(16)}`, status: 'learned', ...(!japanese ? { mastery_confirmed: false } : {}) }
      words.vocabulary.push(word); addedWords++
    }
    Object.assign(word, metadata)
    word.notes = [word.notes, note].filter(Boolean).join(' ')
  }
  for (const [before, after] of [[oldChars, chars.entries], [oldWords, words.vocabulary]]) {
    for (let index = 0; index < before.length; index++) {
      const actual = { ...after[index] }, expected = { ...before[index] }
      for (const key of ['notes', 'is_radical', 'radical_system', 'radical_number', 'radical_learned', 'radical_meaning_ru', 'radical_variants']) { delete actual[key]; delete expected[key] }
      assert.deepEqual(actual, expected)
    }
  }
  const charRadicals = chars.entries.filter(entry => entry.is_radical && entry.radical_system === 'kangxi')
  const wordRadicals = words.vocabulary.filter(entry => entry.is_radical && entry.radical_system === 'kangxi')
  for (const entries of [charRadicals, wordRadicals]) {
    assert.equal(entries.length, 214)
    assert.equal(new Set(entries.map(entry => entry.radical_number)).size, 214)
    assert.ok(entries.every(entry => entry.radical_learned))
  }
  assert.equal(new Set(chars.entries.map(entry => entry.character)).size, chars.entries.length)
  assert.equal(new Set(words.vocabulary.map(entry => entry[language === 'japanese' ? 'japan' : 'chineese'])).size, words.vocabulary.length)
  assert.equal(new Set(words.vocabulary.map(entry => entry.id)).size, words.vocabulary.length)
  const progress = JSON.parse(fs.readFileSync(root + language + '/progress.json', 'utf8'))
  progress.updated_at = '2026-11-13'
  progress.history.push({ date: '2026-11-13', activity: 'Пользователь подтвердил знание всех 214 традиционных ключей Канси. В словаре и списке знаков добавлены is_radical, radical_number и radical_learned. Чтения, письмо и прежние отметки повторения самостоятельных слов сохранены отдельно.' })
  for (const [name, data] of [[characterFile, chars], ['words.json', words], ['progress.json', progress]]) fs.writeFileSync(root + language + '/' + name, JSON.stringify(data, null, 2) + '\n')
  summary.push({ language, radicals: charRadicals.length, learnedRadicals: charRadicals.filter(entry => entry.radical_learned).length, addedCharacters, addedWords, totalCharacters: chars.entries.length, totalWords: words.vocabulary.length })
}
console.log(JSON.stringify(summary))
