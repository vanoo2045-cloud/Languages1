import fs from 'node:fs'
import assert from 'node:assert/strict'

const root = '.cache/languages-sync/japanese/'
const source = 'https://docs.google.com/document/d/1p208OzgLtJJ135RITAkOYJdRzkO8y18HIwAdgu0L2JQ/edit'
const text = fs.readFileSync('.cache/japanese-next-lessons.txt', 'utf8')
const read = name => JSON.parse(fs.readFileSync(root + name, 'utf8'))
const kanji = read('kanji.json'), words = read('words.json'), queue = read('learning_queue.json'), progress = read('progress.json')
const previousKanji = structuredClone(kanji.entries), previousWords = structuredClone(words.vocabulary), previousLessons = structuredClone(queue.lessons)
const candidates = text.split(/\r?\n/).flatMap(line => {
  const match = line.match(/^(\p{Script=Han})\s*[—–-]\s*(.+)$/u)
  return match ? [{ rank: 0, character: match[1], meaning_ru: match[2] }] : []
}).map((entry, index) => ({ ...entry, rank: index + 1 }))
assert.equal(candidates.length, 250)
assert.equal(new Set(candidates.map(entry => entry.character)).size, 250)
const alreadyCovered = candidates.filter(entry => kanji.entries.some(existing => existing.character === entry.character && existing.learned_meaning)).map(entry => entry.character)
let addedKanji = 0, addedWords = 0, enrichedReadings = 0
for (const entry of candidates) {
  if (kanji.entries.some(existing => existing.character === entry.character)) continue
  kanji.entries.push({ character: entry.character, meaning_ru: entry.meaning_ru, learned_meaning: false, reading_confirmed: false, notes: `Запланировано для изучения: № ${entry.rank} в личном списке 250 кандзи. Источник: ${source}.` })
  addedKanji++
}
const phraseData = [
  ['やめてください', 'やめてください', 'пожалуйста, прекратите', 'requests'],
  ['やめて', 'やめて', 'прекратите; перестаньте', 'requests'],
  ['ください', 'ください', 'пожалуйста (в вежливой просьбе)', 'requests'],
  ['くらえよ', 'くらえよ', 'на, получай!; получи! (разговорный боевой выкрик)', 'requests'],
  ['くらえ', 'くらえ', 'получай!', 'requests'],
  ['よ', 'よ', 'усилительная частица', 'requests'],
  ['何', 'なに', 'что?; что?!; чего?!', 'requests'],
  ['止まれ', 'とまれ', 'стоп!; остановись! (приказ на дорожном знаке)', 'road'],
  ['止まってください', 'とまってください', 'остановитесь, пожалуйста', 'road'],
  ['道', 'みち', 'дорога; путь', 'road'],
  ['車', 'くるま', 'автомобиль', 'road'],
  ['右', 'みぎ', 'право; правая сторона', 'road'],
  ['左', 'ひだり', 'лево; левая сторона', 'road'],
  ['まっすぐ', 'まっすぐ', 'прямо', 'road'],
  ['日本', 'にほん', 'Япония', 'road'],
  ['ありがとう', 'ありがとう', 'спасибо', 'road']
]
const phraseCandidates = phraseData.map(([japan, hiragana, word, group]) => ({ japan, hiragana, word, group }))
for (const entry of phraseCandidates) {
  assert.ok(text.includes(entry.japan), entry.japan)
  assert.ok(text.includes(entry.hiragana), entry.hiragana)
  const existing = words.vocabulary.find(item => item.japan === entry.japan)
  if (existing) {
    if (!existing.hiragana) {
      existing.hiragana = entry.hiragana
      existing.notes = [existing.notes, `Чтение из списка для изучения: ${source}; произношение и употребление пока не отработаны.`].filter(Boolean).join(' ')
      enrichedReadings++
    }
    continue
  }
  words.vocabulary.push({ word: entry.word, codeBible: '', english: '', french: '', greece: '', japan: entry.japan, chineese: '', hiragana: entry.hiragana, katakana: '', romaji: '', id: 'ja-' + [...entry.japan].map(character => character.codePointAt(0).toString(16)).join('-'), status: entry.japan === '何' ? 'encountered' : 'planned', notes: `Список для изучения или повторения: ${source}. Чтение приведено по документу; его наличие не подтверждает освоение. ${entry.japan === '何' ? 'По документу значение услышано и узнано 2026-11-04; требуется повторение.' : 'Чтение и употребление пока не отработаны.'}` })
  addedWords++
}
const newLessons = [
  { id: 'ja-interesting-phrases-from-doc', language: 'ja', title: 'Интересные реплики: просьбы, «получай!» и «что?!»', priority: 'high', status: 'planned', prerequisite_ids: [], objectives: ['Разобрать やめてください, やめて и ください как вежливую просьбу.', 'Изучить くらえよ, くらえ и よ; отличать разговорный боевой выкрик от вежливой речи.', 'Повторить なに（何）: значение, чтение и интонацию.', 'Отрабатывать чтение и употребление до подтверждения освоения.'], source_text: source, vocabulary_candidates: phraseCandidates.filter(entry => entry.group === 'requests').map(({ group, ...entry }) => entry) },
  { id: 'ja-road-vocabulary-from-doc', language: 'ja', title: 'Слова с японской дороги: остановка, направления и Япония', priority: 'high', status: 'planned', prerequisite_ids: [], objectives: ['Различать приказ 止まれ и вежливую просьбу 止まってください.', 'Читать и употреблять 道, 車, 右, 左 и まっすぐ.', 'Закрепить 日本 и ありがとう в коротких фразах.', 'Проверять чтения отдельно от уже знакомых значений кандзи.'], source_text: source, vocabulary_candidates: phraseCandidates.filter(entry => entry.group === 'road').map(({ group, ...entry }) => entry) },
  { id: 'ja-top-250-kanji-from-doc', language: 'ja', title: '250 популярных кандзи из личного списка', priority: 'medium', status: 'planned', prerequisite_ids: [], objectives: ['Сохранять порядок личного списка и проходить незнакомые знаки небольшими группами.', `Пропускать повторное изучение уже подтверждённых значений (${alreadyCovered.length} на момент импорта); чтения проверять отдельно.`, 'Не отмечать освоенным весь список по факту его добавления.', 'Использовать вместе с программой кандзи второго класса, без дублирования записей в kanji.json.'], source_text: source, already_covered: alreadyCovered, kanji_candidates: candidates }
]
for (const lesson of newLessons) assert.ok(!queue.lessons.some(existing => existing.id === lesson.id))
queue.lessons.push(...newLessons)
queue.updated_at = '2026-11-13'
progress.updated_at = '2026-11-13'
progress.future_topics.push('250 популярных кандзи из личного документа: изучать неизвестные значения в исходном порядке и отдельно проверять чтения.', 'Фразы やめてください, くらえよ, なに（何） и слова с японской дороги: добавить в ближайшие уроки.')
progress.history.push({ date: '2026-11-13', activity: `В план добавлен личный список 250 кандзи и 16 слов и фраз из ${source}. Это план изучения, не подтверждение освоения.` })
assert.deepEqual(kanji.entries.slice(0, previousKanji.length), previousKanji)
assert.deepEqual(queue.lessons.slice(0, previousLessons.length), previousLessons)
for (let index = 0; index < previousWords.length; index++) {
  const expected = { ...previousWords[index] }, actual = { ...words.vocabulary[index] }
  for (const key of ['hiragana', 'notes']) { delete expected[key]; delete actual[key] }
  assert.deepEqual(actual, expected)
  if (previousWords[index].hiragana) assert.equal(words.vocabulary[index].hiragana, previousWords[index].hiragana)
}
assert.equal(new Set(kanji.entries.map(entry => entry.character)).size, kanji.entries.length)
assert.equal(new Set(words.vocabulary.map(entry => entry.japan)).size, words.vocabulary.length)
assert.equal(new Set(words.vocabulary.map(entry => entry.id)).size, words.vocabulary.length)
assert.equal(new Set(queue.lessons.map(lesson => lesson.id)).size, queue.lessons.length)
assert.ok(kanji.entries.slice(previousKanji.length).every(entry => !entry.learned_meaning && !entry.reading_confirmed))
for (const [name, data] of [['kanji.json', kanji], ['words.json', words], ['learning_queue.json', queue], ['progress.json', progress]]) fs.writeFileSync(root + name, JSON.stringify(data, null, 2) + '\n')
console.log(JSON.stringify({ kanjiInPlan: candidates.length, knownMeanings: alreadyCovered.length, addedKanji, totalKanji: kanji.entries.length, phrasesInPlan: phraseCandidates.length, addedWords, enrichedReadings, totalWords: words.vocabulary.length, addedLessons: newLessons.length }))
