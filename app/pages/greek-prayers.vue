<template>
  <main class="container prayer-page">
    <NuxtLink to="/" class="back-link">← К оглавлению</NuxtLink>
    <h1>Греческий — молитвослов</h1>
    <p class="intro">Молитвы на сон грядущим для практики чтения. Знакомые слова из вашего словаря заменены греческими. Это учебная замена слов, а не полный перевод молитв.</p>
    <div class="prayer-controls">
      <button class="btn" :class="mixed ? 'btn-primary' : 'btn-secondary'" :aria-pressed="mixed" @click="mixed = true">🇬🇷 Со знакомыми словами</button>
      <button class="btn" :class="!mixed ? 'btn-primary' : 'btn-secondary'" :aria-pressed="!mixed" @click="mixed = false">📖 Исходный текст</button>
      <span>{{ matchedWords.length }} словарных форм в молитвах</span>
    </div>
    <p class="hint">Нажмите на выделенное слово, чтобы увидеть исходное. Повторное нажатие вернёт греческое.</p>
    <article class="prayer-text">
      <component :is="paragraph.heading ? 'h2' : 'p'" v-for="(paragraph, paragraphIndex) in paragraphs" :key="paragraphIndex">
        <template v-for="(token, tokenIndex) in paragraph.tokens" :key="tokenIndex">
          <button v-if="mixed && token.word" type="button" class="greek-word" :title="`${token.text} · Стронг ${token.word.strong}`" :aria-label="`${token.word.greek} — ${token.text}`" :aria-pressed="revealed.has(`${paragraphIndex}:${tokenIndex}`)" @click="toggleWord(`${paragraphIndex}:${tokenIndex}`)">{{ revealed.has(`${paragraphIndex}:${tokenIndex}`) ? token.text : token.word.greek }}</button><template v-else>{{ token.text }}</template>
        </template>
      </component>
    </article>
    <details class="prayer-dictionary">
      <summary>Словарь этой страницы ({{ matchedWords.length }})</summary>
      <p>Греческие формы взяты из вашего словаря и подстрочника. Падежи и синтаксис всего текста автоматически не переводятся.</p>
      <ul><li v-for="word in matchedWords" :key="word.russian"><span lang="grc">{{ word.greek }}</span> — {{ word.russian }} <small>№ {{ word.strong }}</small></li></ul>
    </details>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import prayers from '~/data/prayers.json'
import prayerWords from '~/data/prayerWords.json'
import { normalizePrayerWord, tokenizePrayer, type PrayerWord } from '~/utils/prayerWords'

useHead({ title: 'Греческий — молитвослов', meta: [{ name: 'description', content: 'Молитвы на сон грядущим с греческими словами из изученного словаря.' }] })
const dictionary = new Map(prayerWords.map(word => [normalizePrayerWord(word.russian), word]))
const paragraphs = prayers.map(paragraph => ({ ...paragraph, tokens: tokenizePrayer(paragraph.text, dictionary) }))
const matched = new Map<string, PrayerWord>()
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
.greek-word { display: inline; border: 0; border-bottom: 1px dotted currentColor; border-radius: 0; padding: 0; background: transparent; color: #286034; font: inherit; cursor: pointer; }
.greek-word:hover, .greek-word:focus-visible { background: #e8f3e6; }
.prayer-dictionary { margin-top: 2rem; line-height: 1.7; }
.prayer-dictionary summary { cursor: pointer; font-weight: 600; }
.prayer-dictionary ul { columns: 2; padding-left: 1.5rem; }
.prayer-dictionary li { break-inside: avoid; }
.prayer-dictionary small { color: #657080; }
@media (max-width: 600px) { .prayer-dictionary ul { columns: 1; } }
</style>
