<template>
  <main class="container prayer-page">
    <NuxtLink to="/" class="back-link">← К оглавлению</NuxtLink>
    <h1>Китайский — молитвослов</h1>
    <p class="intro">Молитвы на сон грядущим для практики чтения. Знакомые слова из вашего словаря заменены китайскими. Это учебная замена слов, а не полный перевод молитв.</p>
    <div class="prayer-controls">
      <button class="btn" :class="mixed ? 'btn-primary' : 'btn-secondary'" :aria-pressed="mixed" @click="mixed = true">🇨🇳 Со знакомыми словами</button>
      <button class="btn" :class="!mixed ? 'btn-primary' : 'btn-secondary'" :aria-pressed="!mixed" @click="mixed = false">📖 Исходный текст</button>
      <span>{{ matchedWords.length }} знакомых слов в молитвах</span>
    </div>
    <p class="hint">Нажмите на выделенное слово, чтобы увидеть исходное. Повторное нажатие вернёт китайское.</p>
    <article class="prayer-text">
      <component :is="paragraph.heading ? 'h2' : 'p'" v-for="(paragraph, paragraphIndex) in paragraphs" :key="paragraphIndex">
        <template v-for="(token, tokenIndex) in paragraph.tokens" :key="tokenIndex">
          <button v-if="mixed && token.word" type="button" class="chinese-word" :title="`${token.text}`" :aria-label="`${token.word.chinese} — ${token.text}`" :aria-pressed="revealed.has(`${paragraphIndex}:${tokenIndex}`)" @click="toggleWord(`${paragraphIndex}:${tokenIndex}`)">{{ revealed.has(`${paragraphIndex}:${tokenIndex}`) ? token.text : token.word.chinese }}</button><template v-else>{{ token.text }}</template>
        </template>
      </component>
    </article>
    <details class="prayer-dictionary">
      <summary>Словарь этой страницы ({{ matchedWords.length }})</summary>
      <p>Слова взяты из ваших китайских карточек и ассоциативных словарей на Google Drive. Исходный текст и его порядок слов сохранены.</p>
      <ul><li v-for="word in matchedWords" :key="word.russian"><span lang="zh">{{ word.chinese }}</span> — {{ word.russian }}</li></ul>
    </details>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import prayers from '~/data/prayers.json'
import prayerWords from '~/data/chinesePrayerWords.json'
import { normalizePrayerWord, tokenizePrayer } from '~/utils/prayerWords'

useHead({ title: 'Китайский — молитвослов', meta: [{ name: 'description', content: 'Молитвы на сон грядущим с китайскими словами из изученного словаря.' }] })
const dictionary = new Map(prayerWords.flatMap(word => word.forms.map(form => [normalizePrayerWord(form), word] as const)))
const paragraphs = prayers.map(paragraph => ({ ...paragraph, tokens: tokenizePrayer(paragraph.text, dictionary) }))
const matched = new Map<string, (typeof prayerWords)[number]>()
paragraphs.forEach(paragraph => paragraph.tokens.forEach(token => {
  if (token.word) matched.set(normalizePrayerWord(token.word.russian), token.word)
}))
const matchedWords = [...matched.values()].sort((a, b) => a.russian.localeCompare(b.russian, 'ru'))
const mixed = ref(true)
const revealed = ref(new Set<string>())
function toggleWord(key: string) {
  if (revealed.value.has(key)) revealed.value.delete(key)
  else revealed.value.add(key)
}
</script>

<style scoped>
.prayer-page { max-width: 900px; padding-bottom: 3rem; }
.back-link { display: inline-block; margin-bottom: 1rem; color: #2c3e6b; }
h1 { color: #2c3e6b; }
.intro, .hint { color: #596579; line-height: 1.6; }
.prayer-controls { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; margin: 1.5rem 0 1rem; }
.prayer-controls span { font-size: .9rem; color: #596579; }
.prayer-text { background: #fff; padding: clamp(1rem, 4vw, 2.5rem); border-radius: 12px; box-shadow: 0 2px 8px #0001; font-size: 1.15rem; line-height: 1.9; overflow-wrap: anywhere; }
.prayer-text h2 { font-size: 1.3rem; line-height: 1.5; margin: 2rem 0 1rem; }
.prayer-text h2:first-child { margin-top: 0; }
.chinese-word { display: inline; border: 0; border-bottom: 1px dotted currentColor; border-radius: 0; padding: 0; background: transparent; color: #286034; font: inherit; cursor: pointer; }
.chinese-word:hover, .chinese-word:focus-visible { background: #e8f3e6; }
.prayer-dictionary { margin-top: 2rem; line-height: 1.7; }
.prayer-dictionary summary { cursor: pointer; font-weight: 600; }
.prayer-dictionary ul { columns: 2; padding-left: 1.5rem; }
.prayer-dictionary li { break-inside: avoid; }
.prayer-dictionary small { color: #657080; }
@media (max-width: 600px) { .prayer-dictionary ul { columns: 1; } }
</style>
