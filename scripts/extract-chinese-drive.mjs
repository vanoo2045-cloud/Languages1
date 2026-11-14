import fs from 'node:fs'

const sources = JSON.parse(fs.readFileSync('.cache/chinese-drive-sources.json', 'utf8'))
const candidates = new Map()
const excluded = []
const han = /^\p{Script=Han}+$/u
const suspicious = new Set(['云物', '且聪', '察警', '玉', '匕', '氏', '頁', '摩', '𤴓'])
function add(raw, translation, pinyin, source, reason = '') {
  let chinese = raw.trim().replace(/[—–-]+$/u, '')
  if (chinese === '唱歌＇петь') { chinese = '唱歌'; translation = 'петь'; reason += ' Разделены слипшиеся китайское слово и перевод.' }
  translation = (translation || '').trim()
  // The original card generator sometimes attached Russian text to the Hanzi field.
  const mixed = chinese.match(/^(\p{Script=Han}+)(\p{Script=Cyrillic}.*)$/u)
  if (mixed) { chinese = mixed[1]; reason += ` Исправлено слипшееся поле: ${raw}.`; translation = translation.replace(raw, '').trim().replace(/^[,\s]+/, '') }
  if (chinese.includes('/')) { chinese.split('/').forEach(part => add(part, translation, pinyin, source, reason)); return }
  if (!han.test(chinese) || [...chinese].length > 8 || /фразочка|Я яблоки/i.test(translation)) {
    excluded.push({ chinese: raw, translation, source: source.title, reason: 'Шаблон, пример предложения или повреждённая запись' }); return
  }
  let entry = candidates.get(chinese)
  if (!entry) { entry = { chinese, translations: [], pinyin: [], sources: [], notes: [], needsReview: suspicious.has(chinese) }; candidates.set(chinese, entry) }
  if (translation && !entry.translations.includes(translation)) entry.translations.push(translation)
  if (pinyin && !entry.pinyin.includes(pinyin.trim())) entry.pinyin.push(pinyin.trim())
  if (!entry.sources.some(item => item.id === source.id)) entry.sources.push({ id: source.id, title: source.title, url: source.url })
  if (reason && !entry.notes.includes(reason.trim())) entry.notes.push(reason.trim())
}
for (const source of sources) {
  if (/^Json Ассоц|^Json ассоц/u.test(source.title)) {
    JSON.parse(source.content).forEach(row => add(row.hanzi, row.translation, row.pinyin, source))
  }
  if (source.title === 'Json Карточки.json') {
    JSON.parse(fs.readFileSync('.cache/chinese-cards.json', 'utf8')).forEach(row => add(row.hanzi, row.translation, row.pinyin, source))
  }
  if (source.title === 'Generated2_Cards.html') {
    const literal = source.content.match(/const exampleData = (\[[\s\S]*?\n\s*\]);/u)?.[1]
    if (!literal) throw Error('Missing exampleData in personal card generator')
    JSON.parse(literal).forEach(row => add(row.hanzi, row.translation, row.pinyin, source))
  }
  if (source.title.endsWith('.docx')) {
    for (const line of source.content.split(/\r?\n/)) {
      const match = line.match(/^(\p{Script=Han}+)(?:\s*\((\p{Script=Han}+)\))?\s*(.*)$/u)
      if (!match) continue
      const remainder = match[3].replace(/^[\s–—,:-]+/u, '').replace(/^\((?:ранее|совр\.|устар\.)\)\s*/u, '')
      const reading = remainder.match(/\(([a-zāēīōūǖáéíóúǘǎěǐǒǔǚàèìòùǜü\s]+)\)/iu)?.[1] || ''
      const meaning = remainder.replace(/^\([a-zāēīōūǖáéíóúǘǎěǐǒǔǚàèìòùǜü\s]+\)\s*[—–-]?\s*/iu, '').split(/[（(]/u)[0].replace(/[=,\s]+$/u, '').trim()
      const finalMeaning = match[1] === '㫗' ? 'толстый, обильный (устар.)' : (meaning || remainder.replace(/[()]/g, '').trim())
      const note = `Ассоциативная заметка: ${line}`
      add(match[1], finalMeaning, reading, source, note)
      if (match[2]) add(match[2], finalMeaning, reading, source, `Вариант написания ${match[1]}. ${note}`)
      if (match[1] === '电') add('電', 'электричество', reading, source, 'Традиционный вариант указан в исходной заметке.')
      if (match[1] === '爿') add('丬', 'доска; вариант ключа 爿', '', source, 'Вариант ключа указан в исходной заметке.')
    }
  }
  if (source.title.endsWith('.html') && source.title !== 'Generated2_Cards.html') {
    const literal = source.content.match(/const dictionary = \{([\s\S]*?)\n\s*\};/u)?.[1]
    if (!literal) continue
    for (const line of literal.split(/\r?\n/).filter(line => !line.trim().startsWith('//'))) {
      const pair = line.match(/"([^"]+)"\s*:\s*"([^"]+)"/u)
      if (!pair) continue
      let russian = pair[1], chinese = pair[2]
      if (russian.includes('_')) continue // Answers are fragments, not translations of the whole prompt.
      const reading = russian.match(/^([^\p{Script=Cyrillic}(]+)\s*\(([^)]+)\)$/u)
      if (reading) { add(chinese, reading[2], reading[1].trim(), source); continue }
      if (source.title.includes('Вчера') || source.title === '44 - Copy.html') add(chinese, russian.replace(/\s*\([^)]*\)\s*/g, '').trim(), '', source)
      // Extract only explicit vocabulary hints from sentence exercises, never their whole answers.
      for (const hint of russian.matchAll(/\(([^)]*)\)/g)) {
        const item = hint[1].match(/^(\p{Script=Han}+)\s*[—–-]\s*(.+)$/u)
        if (item) add(item[1], item[2], '', source)
      }
    }
  }
}
// Individual tokens in the user's personal vocabulary list are explicit vocabulary,
// unlike characters merely appearing inside example sentences.
const notes = sources.find(source => source.title === 'Карточки.txt')
for (const line of notes.content.split(/\r?\n/)) {
  if (/фразочка|如果1|我很想|我把|Я яблоки/u.test(line)) continue
  for (const match of line.matchAll(/\p{Script=Han}+/gu)) {
    // Ellipses and adjacent Hanzi joined through punctuation belong to templates.
    if (line.includes('人人..到') || line.includes('因为..')) continue
    if (match[0] === '妈妈姐姐') continue // Two adjacent family words, already present separately in JSON.
    if (!candidates.has(match[0])) add(match[0], '', '', notes, 'Указано в личном списке слов; отдельного перевода в строке нет.')
  }
}
const report = { sources: sources.map(({id, title, url}) => ({id,title,url})), candidates: [...candidates.values()], excluded }
fs.writeFileSync('.cache/chinese-import-candidates.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ files: sources.length, candidates: candidates.size, singleCharacters: report.candidates.filter(entry => [...entry.chinese].length === 1).length, withoutTranslation: report.candidates.filter(entry => !entry.translations.length).length, needsReview: report.candidates.filter(entry => entry.needsReview).length, excluded: excluded.length }))
