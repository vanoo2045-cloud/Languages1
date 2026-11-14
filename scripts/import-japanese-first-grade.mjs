import fs from 'node:fs'
import assert from 'node:assert/strict'

const root = '.cache/languages-sync/japanese/'
const source = JSON.parse(fs.readFileSync('.cache/akanji-grades.json', 'utf8'))
const read = name => JSON.parse(fs.readFileSync(root + name, 'utf8'))
const kanji = read('kanji.json'), progress = read('progress.json'), queue = read('learning_queue.json')
const originals = structuredClone(kanji.entries)
assert.equal(source.year1.length, 80)
assert.equal(new Set(source.year1.map(entry => entry.character)).size, 80)
let added = 0
for (const entry of source.year1) {
  const existing = kanji.entries.find(item => item.character === entry.character)
  if (existing) { existing.learned_meaning = true; continue }
  // Keep one brief source gloss. The user's confirmation concerns meanings;
  // no reading or handwriting proficiency is inferred from grade membership.
  const meaning = entry.meaning.split(',')[0].replaceAll('!', '').trim()
  assert.ok(meaning)
  kanji.entries.push({ character: entry.character, meaning_ru: meaning, learned_meaning: true, reading_confirmed: false, notes: `Кёику, 1-й класс; значение отмечено как выученное со слов пользователя 2026-11-13. Источник списка: ${source.source}. Чтение и письмо отдельно не подтверждены.` })
  added++
}
const firstId = 'ja-kyouiku-year-1'
const secondId = 'ja-kyouiku-year-2'
assert.ok(!queue.lessons.some(lesson => lesson.id === firstId || lesson.id === secondId))
queue.lessons.unshift(
  { id: firstId, language: 'ja', title: 'Кёику: значения 80 кандзи первого класса', priority: 'high', status: 'completed', prerequisite_ids: [], objectives: ['Узнавать значения 80 кандзи первого класса; пользователь подтвердил освоение 2026-11-13.', 'Чтения и письмо учитывать отдельно от знания значений.'] },
  { id: secondId, language: 'ja', title: 'Кёику: начать кандзи второго класса', priority: 'high', status: 'planned', prerequisite_ids: [firstId], objectives: ['Начать с короткой диагностики значений кандзи второго класса, не считая весь список заранее изученным.', 'Проходить список из 160 кандзи небольшими группами, начиная с уже знакомых знаков.', 'Проверять значения, чтения и письмо отдельно; подтверждённые результаты записывать в kanji.json.', `Материал: ${source.year2Source}`] }
)
queue.updated_at = '2026-11-13'
progress.updated_at = '2026-11-13'
progress.history.push({ date: '2026-11-13', activity: `Пользователь подтвердил знание значений всех 80 кандзи первого класса по списку ${source.source}. Чтения и письмо отдельно не подтверждались. Второй класс запланирован как следующий этап, без отметки об освоении.` })
progress.future_topics.push('Начать кандзи второго класса: короткая диагностика и изучение небольшими группами по akanji.ru/school/kyouiku-year-2; значения и чтения проверять отдельно.')
assert.equal(new Set(kanji.entries.map(entry => entry.character)).size, kanji.entries.length)
assert.ok(source.year1.every(entry => kanji.entries.find(item => item.character === entry.character)?.learned_meaning))
for (const entry of originals) assert.deepEqual(kanji.entries.find(item => item.character === entry.character), entry)
assert.ok(kanji.entries.slice(originals.length).every(entry => !entry.reading_confirmed && !Object.hasOwn(entry, 'practiced_writing')))
for (const [name, data] of [['kanji.json', kanji], ['progress.json', progress], ['learning_queue.json', queue]]) fs.writeFileSync(root + name, JSON.stringify(data, null, 2) + '\n')
console.log(JSON.stringify({ grade1: 80, added, totalKanji: kanji.entries.length, existingEntriesPreserved: true, grade2: 'planned', grade2Count: source.year2.length }))
