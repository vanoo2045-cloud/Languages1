export type ReaderLanguage = 'ancientGreek' | 'japanese' | 'chinese'
export type DictionaryEntry = {
  word: string
  greece?: string
  japan?: string
  chineese?: string
  codeBible?: string
  status?: string
  meanings_ru?: string[]
  aliases?: string[]
  stems?: string[]
  stemsInsideWords?: boolean
  readingForms?: { russian: string; foreign: string }[]
  is_radical?: boolean
  radical_learned?: boolean
  radical_meaning_ru?: string
}
export type DictionaryAlias = { russian: string; foreign: string; codeBible?: string }
export type Replacement = { russian: string; foreign: string; radical: boolean }
export type ReaderToken = { text: string; replacement?: Replacement }
type Trie = { children: Map<string, Trie>; replacement?: Replacement }
export type ReplacementIndex = { root: Trie; stems: { stem: string; insideWord: boolean; replacement: Replacement }[]; rules: number; usableEntries: number }

const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ё/g, 'е')
const wordPattern = /\p{L}[\p{L}\p{M}]*/gu
const phraseWords = (text: string): string[] => {
  const cleaned = text.replace(/[.,!?;:·;]+$/u, '').trim()
  if (!/^[\p{Script=Cyrillic}\p{M}\s-]+$/u.test(cleaned)) return []
  const words = [...cleaned.matchAll(wordPattern)].map(match => normalize(match[0]))
  return words.length <= 8 ? words : []
}
const foreignField = { ancientGreek: 'greece', japanese: 'japan', chinese: 'chineese' } as const

export function parseReaderDictionary(value: unknown): DictionaryEntry[] {
  if (!value || typeof value !== 'object' || !('vocabulary' in value) || !Array.isArray(value.vocabulary)) throw new Error('В JSON должен быть массив vocabulary.')
  return value.vocabulary.filter((entry): entry is DictionaryEntry => !!entry && typeof entry === 'object' && typeof entry.word === 'string')
}

export function buildReplacementIndex(entries: DictionaryEntry[], aliases: DictionaryAlias[], language: ReaderLanguage, options: { knownOnly: boolean; includeRadicals: boolean }): ReplacementIndex {
  const root: Trie = { children: new Map() }
  const stems: ReplacementIndex['stems'] = []
  let rules = 0
  const usable = entries.filter(entry => {
    const foreign = entry[foreignField[language]]
    if (typeof foreign !== 'string' || !foreign.trim() || entry.status === 'needs_review') return false
    if (!options.includeRadicals && entry.is_radical) return false
    // mastery_confirmed is deliberately independent of the user's study history.
    return !options.knownOnly || entry.radical_learned || ['learned', 'studied', 'practiced', 'used_in_hybrid_writing'].includes(entry.status || '')
  })
  function add(russian: string, foreign: string, entry: DictionaryEntry, readingForm = false) {
    const words = phraseWords(russian)
    if (!words.length || (!readingForm && /\p{Script=Cyrillic}/u.test(foreign))) return
    let node = root
    for (const word of words) {
      if (!node.children.has(word)) node.children.set(word, { children: new Map() })
      node = node.children.get(word)!
    }
    // Stable dictionary order resolves ambiguous glosses; curated phrases win over shorter words.
    if (!node.replacement) { node.replacement = { russian, foreign: foreign.trim(), radical: !!entry.is_radical }; rules++ }
  }
  function addValues(values: unknown[], foreign: string, entry: DictionaryEntry) {
    for (const value of values) {
      if (typeof value !== 'string') continue
      for (const synonym of value.replace(/\([^)]*\)/g, '').replace(/[«»"\[\]]/g, '').split(/[;,/]/)) add(synonym.trim(), foreign, entry)
    }
  }
  for (const entry of usable) {
    addValues([entry.word, ...(Array.isArray(entry.meanings_ru) ? entry.meanings_ru : []), ...(options.includeRadicals && entry.is_radical && entry.radical_meaning_ru ? [entry.radical_meaning_ru] : [])], entry[foreignField[language]]!, entry)
  }
  if (language === 'japanese') {
    for (const entry of usable) {
      if (!Array.isArray(entry.readingForms)) continue
      for (const form of entry.readingForms) {
        if (!form || typeof form.russian !== 'string' || typeof form.foreign !== 'string' || !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(form.foreign)) continue
        add(form.russian, form.foreign, entry, true)
      }
    }
  }
  // Exact dictionary meanings take priority over another entry's alternate forms.
  for (const entry of usable) {
    if (Array.isArray(entry.aliases)) addValues(entry.aliases, entry[foreignField[language]]!, entry)
  }
  const byForeign = new Map(usable.map(entry => [entry[foreignField[language]]!.normalize('NFC'), entry]))
  const byStrong = new Map(usable.filter(entry => entry.codeBible).map(entry => [entry.codeBible, entry]))
  for (const alias of aliases) {
    if (!alias || typeof alias.russian !== 'string' || typeof alias.foreign !== 'string') continue
    const entry = language === 'ancientGreek' && alias.codeBible ? byStrong.get(alias.codeBible) : byForeign.get(alias.foreign.normalize('NFC'))
    if (entry) add(alias.russian, alias.foreign, entry)
  }
  if (language === 'japanese') {
    for (const entry of usable) {
      if (!Array.isArray(entry.stems)) continue
      for (const value of entry.stems) {
        if (typeof value !== 'string') continue
        const stem = normalize(value.trim())
        if (!/^[\p{Script=Cyrillic}]{3,}$/u.test(stem) || stems.some(rule => rule.stem === stem)) continue
        const foreign = entry.japan!.trim()
        if (/\p{Script=Cyrillic}/u.test(foreign)) continue
        stems.push({ stem, insideWord: !!entry.stemsInsideWords, replacement: { russian: value.trim(), foreign, radical: !!entry.is_radical } })
      }
    }
    stems.sort((a, b) => b.stem.length - a.stem.length)
  }
  return { root, stems, rules: rules + stems.length, usableEntries: usable.length }
}

export function replaceRussianText(text: string, index: ReplacementIndex): ReaderToken[] {
  const matches = [...text.matchAll(wordPattern)]
  const tokens: ReaderToken[] = []
  let cursor = 0
  for (let i = 0; i < matches.length;) {
    const first = matches[i]!
    let node: Trie | undefined = index.root
    let best: { last: number; replacement: Replacement } | undefined
    for (let j = i; j < matches.length && node; j++) {
      if (j > i) {
        const previous = matches[j - 1]!, current = matches[j]!
        if (!/^[ \t\u00a0-]+$/.test(text.slice(previous.index! + previous[0].length, current.index))) break
      }
      node = node.children.get(normalize(matches[j]![0]))
      if (node?.replacement) best = { last: j, replacement: node.replacement }
    }
    if (!best) {
      const normalized = normalize(first[0])
      const rule = index.stems.find(rule => rule.insideWord ? normalized.includes(rule.stem) : normalized.startsWith(rule.stem))
      if (!rule) { i++; continue }
      // Keep original offsets: combining accents must stay with their source letter.
      const start = normalized.indexOf(rule.stem)
      let offset = 0
      let length = 0
      for (const character of first[0]) {
        const position = normalize(first[0].slice(0, length)).length
        if (position <= start) offset = length
        if (position >= start + rule.stem.length && !/\p{M}/u.test(character)) break
        length += character.length
      }
      if (first.index! + offset > cursor) tokens.push({ text: text.slice(cursor, first.index! + offset) })
      cursor = first.index! + length
      tokens.push({ text: text.slice(first.index! + offset, cursor), replacement: rule.replacement })
      i++
      continue
    }
    if (first.index! > cursor) tokens.push({ text: text.slice(cursor, first.index) })
    const last = matches[best.last]!
    cursor = last.index! + last[0].length
    tokens.push({ text: text.slice(first.index, cursor), replacement: best.replacement })
    i = best.last + 1
  }
  if (cursor < text.length) tokens.push({ text: text.slice(cursor) })
  return tokens
}
