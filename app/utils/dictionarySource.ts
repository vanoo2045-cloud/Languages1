import { parseReaderDictionary, type DictionaryEntry, type ReaderLanguage } from './textReplacement'
import japaneseSupplement from '../data/japaneseSupplement.json'
import { publicAssetUrl } from './publicAssetUrl'

function withSupplement(entries: DictionaryEntry[], language: ReaderLanguage): DictionaryEntry[] {
  if (language !== 'japanese') return entries
  const result = entries.map(entry => ({ ...entry }))
  for (const supplement of japaneseSupplement.vocabulary) {
    const existing = result.filter(entry => entry.japan === supplement.japan)
    if (existing.length) {
      for (const entry of existing) {
        entry.stems = [...new Set([...(entry.stems || []), ...supplement.stems])]
        entry.stemsInsideWords = supplement.stemsInsideWords
        entry.readingForms = [...(entry.readingForms || []), ...supplement.readingForms]
      }
    } else result.push(supplement)
  }
  return result
}

const repository = 'vanoo2045-cloud/languages'
export const dictionaryGithubUrl = (language: ReaderLanguage) => `https://raw.githubusercontent.com/${repository}/main/${language}/words.json`
export const dictionaryEditorUrl = (language: ReaderLanguage) => `https://github.com/${repository}/edit/main/${language}/words.json`
export const dictionaryPublicUrl = (language: ReaderLanguage, baseURL = '/') => publicAssetUrl(`dictionaries/${language}.json`, baseURL)

export async function loadReaderDictionary(language: ReaderLanguage, signal: AbortSignal, baseURL = '/'): Promise<{ entries: DictionaryEntry[]; source: 'github' | 'public'; warning: string }> {
  const remoteController = new AbortController()
  const abortRemote = () => remoteController.abort()
  if (signal.aborted) abortRemote()
  else signal.addEventListener('abort', abortRemote, { once: true })
  const timeout = setTimeout(abortRemote, 10000)
  let remoteError = ''
  try {
    const response = await fetch(`${dictionaryGithubUrl(language)}?v=${Date.now()}`, { cache: 'no-store', signal: remoteController.signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return { entries: withSupplement(parseReaderDictionary(await response.json()), language), source: 'github', warning: '' }
  } catch (err) {
    if (signal.aborted) throw err
    remoteError = err instanceof Error ? err.message : 'Ошибка загрузки'
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', abortRemote)
  }
  const response = await fetch(`${dictionaryPublicUrl(language, baseURL)}?v=${Date.now()}`, { cache: 'no-store', signal })
  if (!response.ok) throw new Error(`GitHub недоступен (${remoteError}), резервная копия: HTTP ${response.status}`)
  const entries = withSupplement(parseReaderDictionary(await response.json()), language)
  return { entries, source: 'public', warning: `Не удалось прочитать словарь из GitHub (${remoteError}). Используется резервная копия сайта; последние правки GitHub могут в ней отсутствовать. Нажмите «Обновить словарь», чтобы повторить загрузку.` }
}
