<template>
  <main class="container reader-page">
    <div class="reader-heading">
      <span class="eyebrow">Практика чтения</span>
      <h1>Ваш текст со знакомыми словами</h1>
      <p>Вставьте русский текст или загрузите файл. Выберите язык — слова и выражения из словаря появятся прямо в тексте.</p>
    </div>

    <section class="reader-settings" aria-label="Настройки замены">
      <label class="language-label">Язык
        <select v-model="language" data-testid="language">
          <option value="ancientGreek">🇬🇷 Древнегреческий</option>
          <option value="japanese">🇯🇵 Японский</option>
          <option value="chinese">🇨🇳 Китайский</option>
        </select>
      </label>
      <label class="check-label"><input v-model="knownOnly" type="checkbox"> Только изучавшиеся</label>
      <label class="check-label"><input v-model="includeRadicals" type="checkbox"> Включать ключи</label>
      <button type="button" class="reader-button" :disabled="loading" @click="loadDictionary">{{ loading ? 'Загрузка…' : 'Обновить словарь' }}</button>
      <a :href="editorUrl" target="_blank" rel="noopener">Редактировать на GitHub ↗</a>
      <a :href="dictionaryPath" target="_blank" rel="noopener">Открыть JSON ↗</a>
    </section>
    <p v-if="error" class="reader-error" role="alert">{{ error }} <button type="button" @click="loadDictionary">Повторить</button></p>
    <p v-if="aliasesWarning" class="reader-notice" role="status">{{ aliasesWarning }}</p>
    <p v-if="sourceWarning" class="reader-notice" role="status">{{ sourceWarning }}</p>
    <p class="dictionary-status" role="status">{{ loading ? 'Загружаем словарь…' : `В словаре ${entries.length} записей · доступно ${index.rules} слов и выражений для замены · ${dictionarySource === 'github' ? 'из GitHub' : 'резервная копия сайта'}` }}</p>

    <div class="reader-columns">
      <section class="editor-panel" aria-labelledby="source-title">
        <div class="panel-heading"><h2 id="source-title">Исходный текст</h2><span>{{ text.length.toLocaleString('ru-RU') }} знаков</span></div>
        <div class="reader-toolbar">
          <label class="reader-button file-button" tabindex="0" @keydown.enter.prevent="textFileInput?.click()" @keydown.space.prevent="textFileInput?.click()">Загрузить текст<input ref="textFileInput" type="file" accept=".txt,.md,.html,.htm,text/plain,text/markdown,text/html" @change="loadTextFile"></label>
          <button type="button" class="reader-button" @click="restorePrayers">Вечерние молитвы</button>
          <button type="button" class="reader-button quiet" @click="text = ''">Очистить</button>
        </div>
        <p class="file-help">TXT, Markdown или HTML в UTF-8, до 2 МБ. HTML загружается как обычный текст.</p>
        <label class="sr-only" for="reader-source">Русский текст для замены</label>
        <textarea id="reader-source" v-model="text" data-testid="source" spellcheck="false" placeholder="Вставьте сюда любой русский текст…"></textarea>
        <p v-if="fileError" class="reader-error" role="alert">{{ fileError }}</p>
        <p class="privacy-note">Текст обрабатывается в вашем браузере и не отправляется на сервер.</p>
      </section>

      <section class="result-panel" aria-labelledby="result-title" :aria-busy="loading">
        <div class="panel-heading"><h2 id="result-title">Для чтения</h2><span data-testid="replacement-count">{{ replacementCount }} замен</span></div>
        <div class="reader-toolbar">
          <button type="button" class="reader-button" :aria-pressed="showOriginal" @click="showOriginal = !showOriginal">{{ showOriginal ? 'Показать замены' : 'Исходный текст' }}</button>
          <button type="button" class="reader-button" :disabled="!text || loading || !!error" @click="copyResult">Скопировать</button>
          <button type="button" class="reader-button" :disabled="!text || loading || !!error" @click="downloadResult">Скачать TXT</button>
        </div>
        <p class="file-help">Нажмите на выделенное слово, чтобы увидеть русский вариант.</p>
        <article class="reader-result" data-testid="result">
          <p v-if="!text" class="empty-result">Здесь появится ваш текст с заменами.</p>
          <template v-else-if="showOriginal || loading || error">{{ text }}</template>
          <template v-else v-for="(token, tokenIndex) in tokens" :key="tokenIndex"><button v-if="token.replacement" type="button" class="replacement-word" :lang="revealed.has(tokenIndex) ? 'ru' : foreignLang" :title="`${token.text} → ${token.replacement.foreign}`" :aria-label="`${token.replacement.foreign} — ${token.text}`" :aria-pressed="revealed.has(tokenIndex)" @click="toggleWord(tokenIndex)">{{ revealed.has(tokenIndex) ? token.text : token.replacement.foreign }}</button><template v-else>{{ token.text }}</template></template>
        </article>
        <p v-if="feedback" class="reader-feedback" role="status">{{ feedback }}</p>
      </section>
    </div>
    <details class="reader-help">
      <summary>Как работают замены</summary>
      <p>Заменяются целые слова и фразы из основных значений и поля aliases каждой записи. Длинные выражения имеют приоритет. Регистр букв и русские ударения не мешают поиску. Сомнительные словарные записи пропускаются. Основное значение имеет приоритет перед дополнительной формой другой записи; при остальных совпадениях используется первая подходящая запись словаря.</p>
      <p>«Только изучавшиеся» учитывает отметки изучения и знание ключей, а не поле mastery_confirmed. Для знакомых форм и выражений используются также списки соответствий. Если нужной формы слова нет, она останется по-русски.</p>
      <p>Для японского языка, если целое слово или фраза не найдены, проверяются корни из поля stems словаря. Перенесены правила из японского молитвослова: «Матере» → «母е», «сыне» → «子е», «Пречистыя» → «Пре浄ыя». Русские части слова сохраняются. Полные совпадения имеют приоритет.</p>
      <p>Это учебная подстановка слов, а не полный перевод: грамматика предложения автоматически не перестраивается.</p>
      <p>Для правок выберите «Редактировать на GitHub», измените JSON и сохраните через Commit changes в ветку main. Затем нажмите «Обновить словарь» или откройте страницу заново. Деплой для правок словаря не нужен; GitHub может отдавать изменения с небольшой задержкой.</p>
      <p>Словари на GitHub: <a :href="dictionaryEditorUrl('ancientGreek')" target="_blank" rel="noopener">древнегреческий</a>, <a :href="dictionaryEditorUrl('japanese')" target="_blank" rel="noopener">японский</a>, <a :href="dictionaryEditorUrl('chinese')" target="_blank" rel="noopener">китайский</a>.</p>
    </details>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { buildReplacementIndex, replaceRussianText, type DictionaryEntry, type DictionaryAlias, type ReaderLanguage } from '~/utils/textReplacement'
import { loadReaderDictionary, dictionaryGithubUrl, dictionaryEditorUrl, dictionaryPublicUrl } from '~/utils/dictionarySource'

useHead({ title: 'Ваш текст — практика языков', meta: [{ name: 'description', content: 'Чтение любого русского текста с заменой слов на древнегреческие, японские или китайские из личного словаря.' }] })
const language = ref<ReaderLanguage>('ancientGreek')
const text = ref('')
const knownOnly = ref(false)
const includeRadicals = ref(true)
const entries = ref<DictionaryEntry[]>([])
const aliases = ref<DictionaryAlias[]>([])
const loading = ref(true)
const error = ref('')
const aliasesWarning = ref('')
const sourceWarning = ref('')
const dictionarySource = ref<'github' | 'public'>('github')
const fileError = ref('')
const feedback = ref('')
const showOriginal = ref(false)
const revealed = ref(new Set<number>())
const textFileInput = ref<HTMLInputElement | null>(null)
const dictionaryPath = computed(() => dictionarySource.value === 'github' ? dictionaryGithubUrl(language.value) : dictionaryPublicUrl(language.value))
const editorUrl = computed(() => dictionaryEditorUrl(language.value))
const foreignLang = computed(() => ({ ancientGreek: 'grc', japanese: 'ja', chinese: 'zh' }[language.value]))
const index = computed(() => buildReplacementIndex(entries.value, aliases.value, language.value, { knownOnly: knownOnly.value, includeRadicals: includeRadicals.value }))
const tokens = computed(() => replaceRussianText(text.value, index.value))
const replacementCount = computed(() => tokens.value.filter(token => token.replacement).length)
const resultText = computed(() => tokens.value.map(token => token.replacement?.foreign || token.text).join(''))
let controller: AbortController | undefined
let prayerController: AbortController | undefined
let feedbackTimer: ReturnType<typeof setTimeout> | undefined

async function loadDictionary() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  loading.value = true; error.value = ''; aliasesWarning.value = ''; sourceWarning.value = ''; feedback.value = ''
  entries.value = []; aliases.value = []
  const currentLanguage = language.value
  try {
    const [loaded, aliasResult] = await Promise.all([
      loadReaderDictionary(currentLanguage, request.signal),
      fetch(`/dictionaries/aliases.json?v=${Date.now()}`, { cache: 'no-store', signal: request.signal }).then(async response => { if (!response.ok) throw new Error('Aliases unavailable'); return await response.json() }).catch(() => null)
    ])
    if (request.signal.aborted) return
    entries.value = loaded.entries
    dictionarySource.value = loaded.source
    sourceWarning.value = loaded.warning
    aliases.value = Array.isArray(aliasResult?.[currentLanguage]) ? aliasResult[currentLanguage] : []
    if (!aliasResult) aliasesWarning.value = 'Списки дополнительных форм не загрузились. Используем основные записи словаря.'
  } catch (err) {
    if (!request.signal.aborted) error.value = `Не удалось загрузить словарь. Проверьте JSON-файл по ссылке выше. ${err instanceof Error ? err.message : ''}`
  } finally { if (!request.signal.aborted) loading.value = false }
}
async function prayerText() {
  prayerController?.abort()
  prayerController = new AbortController()
  const response = await fetch('/texts/evening-prayers.txt', { cache: 'no-store', signal: prayerController.signal })
  if (!response.ok) throw new Error('Не удалось загрузить вечерние молитвы.')
  return await response.text()
}
async function restorePrayers() {
  try { text.value = await prayerText(); fileError.value = '' } catch { fileError.value = 'Не удалось загрузить вечерние молитвы. Можно вставить текст вручную.' }
}
async function loadTextFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  fileError.value = ''; feedback.value = ''
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error('Файл больше 2 МБ. Загрузите меньший фрагмент.')
    if (!/\.(txt|md|html?|markdown)$/i.test(file.name)) throw new Error('Поддерживаются файлы TXT, Markdown и HTML.')
    let content = (await file.text()).replace(/^\uFEFF/, '')
    if (/\.html?$/i.test(file.name)) {
      const document = new DOMParser().parseFromString(content, 'text/html')
      document.querySelectorAll('script, style, template, noscript').forEach(node => node.remove())
      document.querySelectorAll('br').forEach(node => node.replaceWith('\n'))
      document.querySelectorAll('p,div,h1,h2,h3,li,section,article').forEach(node => node.append('\n'))
      content = document.body.textContent || ''
    }
    text.value = content
  } catch (err) { fileError.value = err instanceof Error ? err.message : 'Не удалось прочитать файл.' }
  finally { input.value = '' }
}
function toggleWord(index: number) { if (revealed.value.has(index)) revealed.value.delete(index); else revealed.value.add(index) }
function notify(message: string) { feedback.value = message; clearTimeout(feedbackTimer); feedbackTimer = setTimeout(() => { feedback.value = '' }, 4000) }
async function copyResult() {
  try { await navigator.clipboard.writeText(showOriginal.value ? text.value : resultText.value); notify('Текст скопирован.') }
  catch { notify('Не удалось скопировать. Используйте «Скачать TXT».') }
}
function downloadResult() {
  const url = URL.createObjectURL(new Blob([showOriginal.value ? text.value : resultText.value], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url; link.download = `text-${language.value}.txt`; document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
watch(language, loadDictionary)
watch([text, language, entries, knownOnly, includeRadicals], () => { revealed.value = new Set(); feedback.value = '' })
onMounted(() => {
  void loadDictionary()
  void prayerText().then(defaultText => { if (!text.value) text.value = defaultText }).catch(() => { fileError.value = 'Вечерние молитвы не загрузились. Вставьте свой текст или загрузите файл.' })
})
onBeforeUnmount(() => { controller?.abort(); prayerController?.abort(); clearTimeout(feedbackTimer) })
</script>

<style scoped>
.reader-page { max-width: 1320px; }
.reader-heading { max-width: 800px; margin-bottom: 1.5rem; }
.eyebrow { color: #557451; font: 600 .8rem system-ui, sans-serif; text-transform: uppercase; letter-spacing: .1em; }
h1 { color: #2c3e6b; font-size: clamp(1.8rem, 4vw, 2.5rem); margin: .4rem 0 .7rem; line-height: 1.2; }
.reader-heading p { color: #596579; }
.reader-settings { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem 1.5rem; padding: 1.2rem; background: #edf2eb; border: 1px solid #dce6d7; border-radius: 12px; font-family: system-ui, sans-serif; font-size: .9rem; }
.language-label { display: grid; gap: .3rem; font-weight: 600; }
select { background: white; padding: .65rem; border: 1px solid #bfcbb9; border-radius: 7px; font: inherit; min-width: 200px; }
.check-label { display: flex; align-items: center; gap: .5rem; }
input[type=checkbox] { width: 1.1rem; height: 1.1rem; accent-color: #2c5f2d; }
a { color: #2c3e6b; }
.dictionary-status { padding: .8rem 0 1.2rem; color: #697466; font: .85rem system-ui, sans-serif; }
.reader-columns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); gap: 1.3rem; align-items: start; }
.editor-panel, .result-panel { min-width: 0; padding: 1.2rem; background: #fff; border: 1px solid #e0e5dd; border-radius: 12px; }
.result-panel { box-shadow: 0 3px 18px #243c2610; }
.panel-heading { display: flex; justify-content: space-between; align-items: center; gap: .7rem; flex-wrap: wrap; margin-bottom: .9rem; }
h2 { font-size: 1.25rem; color: #2c3e6b; }
.panel-heading span { color: #60705c; font: .8rem system-ui, sans-serif; }
.reader-toolbar { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: .7rem; }
.reader-button { display: inline-block; padding: .5rem .7rem; border: 1px solid #cbd4c6; border-radius: 6px; background: #f7f9f5; color: #2c3e2f; font: .85rem/1.4 system-ui, sans-serif; cursor: pointer; text-decoration: none; }
.reader-button:hover { background: #e8eee3; }
.reader-button:disabled { opacity: .5; cursor: default; }
.file-button input { display: none; }
.file-button:focus-within { outline: 2px solid #2c3e6b; }
.quiet { background: transparent; }
.file-help, .privacy-note { font: .78rem/1.6 system-ui, sans-serif; color: #65715f; margin-bottom: .8rem; }
.privacy-note { margin-top: .7rem; margin-bottom: 0; }
textarea { display: block; width: 100%; min-height: 560px; resize: vertical; border: 1px solid #d2dbce; border-radius: 7px; padding: 1rem; background: #fdfefb; color: #283526; font: 1rem/1.8 Georgia, serif; }
textarea:focus, select:focus { outline: 2px solid #66875d; outline-offset: 2px; }
.reader-result { white-space: pre-wrap; overflow-wrap: anywhere; min-height: 560px; max-height: 78vh; overflow-y: auto; padding: .8rem .3rem; font-size: 1.15rem; line-height: 1.9; }
.replacement-word { display: inline; padding: 0; border: 0; border-bottom: 1px dotted #477840; background: #f0f6eb; color: #285b2b; font: inherit; cursor: pointer; }
.replacement-word:hover, .replacement-word:focus-visible { background: #dcebd1; outline: 1px solid #6a8c5e; }
.replacement-word[aria-pressed=true] { color: #66532e; background: #faf0d9; }
.reader-error { color: #a32925; background: #fff2f0; padding: .7rem; border-radius: 6px; margin-top: .7rem; }
.reader-error button { color: inherit; background: transparent; border: 0; text-decoration: underline; cursor: pointer; }
.reader-notice { padding: .7rem; background: #fff7df; }
.reader-feedback { color: #285b2b; margin-top: .8rem; }
.reader-help { margin: 1.5rem 0; color: #596579; line-height: 1.8; }
.reader-help summary { cursor: pointer; font-weight: 600; }
.reader-help p { margin-top: .8rem; max-width: 950px; }
.empty-result { color: #85907f; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@media (max-width: 850px) { .reader-columns { grid-template-columns: minmax(0,1fr); } textarea { min-height: 260px; } .reader-result { min-height: 300px; max-height: none; } }
</style>
