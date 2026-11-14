import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { transformSync, buildSync } from 'esbuild'

const context = { module: { exports: {} }, exports: {} }
vm.runInNewContext(transformSync(fs.readFileSync('app/utils/textReplacement.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, context)
const { parseReaderDictionary, buildReplacementIndex, replaceRussianText } = context.module.exports
const entries = [
  { word: 'твоё имя', japan: 'あなたの名', status: 'studied' },
  { word: 'имя', japan: '名', status: 'studied', aliases: ['имени', 'именем', 'имён', 'мое имя', 'ошибка'] },
  { word: 'Бог', japan: '神', status: 'studied' },
  { word: 'я', japan: '私', status: 'learned', mastery_confirmed: false },
  { word: 'огонь', japan: '火', status: 'learned', is_radical: true, radical_learned: true },
  { word: 'ошибка', japan: '誤', status: 'needs_review', aliases: ['ошибочный'] },
  { word: 'новое', japan: '新', status: 'planned', aliases: ['нового'] },
  { word: 'проверка', japan: '確認', status: 'studied', aliases: [null, 123, {}, '', 'проверочный'] }
]
const index = buildReplacementIndex(entries, [{ russian: 'божий', foreign: '神' }, { russian: 'нет в словаре', foreign: '無' }], 'japanese', { knownOnly: false, includeRadicals: true })
const result = text => replaceRussianText(text, index).map(token => token.replacement?.foreign || token.text).join('')
assert.equal(result('ТВОЁ  и́мя, Бог! Богослов и богословие.'), 'あなたの名, 神! Богослов и богословие.')
assert.equal(result('твоё, имя'), 'твоё, 名')
assert.equal(result('твоё\nимя'), 'твоё\n名')
assert.equal(result('божий; ошибочный; нет в словаре'), '神; ошибочный; нет в словаре')
assert.equal(result('ИМЕ́НИ, имён, именем. Мое имя!'), '名, 名, 名. 名!')
assert.equal(result('именительный, именем-то'), 'именительный, 名-то')
assert.equal(result('проверочный'), '確認')
const stemEntries = [
  { word: 'мать', japan: '母', status: 'studied', stems: ['матер', null, 'я'] },
  { word: 'материя', japan: '物質', status: 'studied', aliases: ['материю'] },
  { word: 'материнский дом', japan: '実家', status: 'studied' },
  { word: 'ошибка', japan: '誤', status: 'needs_review', stems: ['ошиб'] }
]
const stemIndex = buildReplacementIndex(stemEntries, [], 'japanese', { knownOnly: false, includeRadicals: true })
const renderStems = text => replaceRussianText(text, stemIndex).map(token => token.replacement?.foreign || token.text).join('')
assert.equal(renderStems('Матере, МАТЕРИ, ма́тери, Матерь!'), '母е, 母И, 母и, 母ь!')
assert.equal(renderStems('мать, материя, материю, материнский дом'), '母, 物質, 物質, 実家')
assert.equal(renderStems('праматери, я, ошибка'), 'праматери, я, ошибка')
const stemOriginal = '  Ма́тере\nМатери!  '
assert.equal(replaceRussianText(stemOriginal, stemIndex).map(token => token.text).join(''), stemOriginal)
assert.equal(buildReplacementIndex(stemEntries, [], 'chinese', { knownOnly: false, includeRadicals: true }).stems.length, 0)
assert.equal(buildReplacementIndex([{ word: 'мать', japan: '母', status: 'planned', stems: ['матер'] }], [], 'japanese', { knownOnly: true, includeRadicals: true }).stems.length, 0)
const original = '  твоё\tимя\n\nБог — я; огонь!  '
assert.equal(replaceRussianText(original, index).map(token => token.text).join(''), original)
const filtered = buildReplacementIndex(entries, [], 'japanese', { knownOnly: true, includeRadicals: false })
assert.equal(replaceRussianText('я огонь новое', filtered).map(token => token.replacement?.foreign || token.text).join(''), '私 огонь новое')
assert.equal(replaceRussianText('нового ошибочный', filtered).map(token => token.replacement?.foreign || token.text).join(''), 'нового ошибочный')
const precedence = buildReplacementIndex([{ word: 'один', japan: '一', aliases: ['первый'] }, { word: 'первый', japan: '第一' }], [], 'japanese', { knownOnly: false, includeRadicals: true })
assert.equal(replaceRussianText('первый', precedence).map(token => token.replacement?.foreign || token.text).join(''), '第一')
for (const [language, field, foreign] of [['ancientGreek', 'greece', 'ὄνομα'], ['japanese', 'japan', '名'], ['chinese', 'chineese', '名']]) {
  const aliasIndex = buildReplacementIndex([{ word: 'имя', [field]: foreign, aliases: ['имени', 'именем', 'имён'] }], [], language, { knownOnly: false, includeRadicals: true })
  assert.equal(replaceRussianText('ИМЁН', aliasIndex).map(token => token.replacement?.foreign || token.text).join(''), foreign)
}
assert.throws(() => parseReaderDictionary({ entries: [] }))
assert.equal(parseReaderDictionary({ vocabulary: [null, { word: 'я' }] }).length, 1)
const aliases = JSON.parse(fs.readFileSync('public/dictionaries/aliases.json', 'utf8'))
const prayers = fs.readFileSync('public/texts/evening-prayers.txt', 'utf8')
for (const language of ['ancientGreek', 'japanese', 'chinese']) {
  const dictionary = parseReaderDictionary(JSON.parse(fs.readFileSync(`public/dictionaries/${language}.json`, 'utf8')))
  const actual = buildReplacementIndex(dictionary, aliases[language], language, { knownOnly: false, includeRadicals: true })
  const tokens = replaceRussianText(prayers, actual)
  assert.equal(tokens.map(token => token.text).join(''), prayers)
  const count = tokens.filter(token => token.replacement).length
  assert.ok(count > 50, `${language}: too few replacements`)
  console.log(`${language}: ${dictionary.length} entries, ${actual.rules} rules, ${count} replacements`)
}
console.log('Phrase priority, accents, boundaries, filters, aliases and source preservation: OK')

// Exercise the actual loader and supplement merge for both GitHub and fallback.
const japaneseDictionary = JSON.parse(fs.readFileSync('public/dictionaries/japanese.json', 'utf8'))
let offline = false
const loaderContext = {
  module: { exports: {} }, exports: {}, AbortController, setTimeout, clearTimeout,
  fetch: async url => {
    if (offline && url.startsWith('https:')) throw new Error('Offline')
    return { ok: true, json: async () => japaneseDictionary }
  }
}
vm.runInNewContext(buildSync({ entryPoints: ['app/utils/dictionarySource.ts'], bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text, loaderContext)
for (const source of ['github', 'public']) {
  offline = source === 'public'
  const loaded = await loaderContext.module.exports.loadReaderDictionary('japanese', new AbortController().signal)
  assert.equal(loaded.source, source)
  const rules = buildReplacementIndex(loaded.entries, aliases.japanese, 'japanese', { knownOnly: false, includeRadicals: true })
  const render = text => replaceRussianText(text, rules).map(token => token.replacement?.foreign || token.text).join('')
  for (const [text, expected] of [['сыне', '子е'], ['Матере', '母е'], ['славословие', '栄ословие'], ['Пречистыя', 'Пре浄ыя']]) {
    assert.equal(render(text), expected, `${source}: ${text}`)
  }
  const prayer = 'Сыне Божий, молитв ради Пречистыя Твоея Матере!'
  assert.equal(replaceRussianText(prayer, rules).map(token => token.text).join(''), prayer)
  const filteredRules = buildReplacementIndex(loaded.entries, aliases.japanese, 'japanese', { knownOnly: true, includeRadicals: false })
  assert.equal(replaceRussianText('сыне', filteredRules).map(token => token.replacement?.foreign || token.text).join(''), 'сыне')
  console.log(`${source}: imported Japanese roots, original text and radical filter OK`)
}
