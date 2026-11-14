<template>
  <div class="bible-reader">
    <div class="book-header">
      <h1>{{ bookTitle }}</h1>
      <div class="chapter-ref">{{ chapterRef }}</div>
    </div>

    <div class="controls">
      <button @click="resetToRussian" class="btn btn-primary">
        📖 Всё на русский
      </button>
      <button @click="resetToInitial" class="btn btn-secondary">
        🔄 Сбросить к начальному
      </button>
      <button @click="learnAll" class="btn btn-success">
        🇬🇷 Всё на греческий
      </button>
      <button @click="clearProgress" class="btn btn-danger">
        🗑 Сбросить прогресс
      </button>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        <span class="progress-text">{{ learnedCount }} / {{ totalWords }} слов изучено</span>
      </div>
    </div>

    <div class="bible-content" v-html="renderedHTML"></div>
    
    <!-- Новая панель для новых слов -->
    <div v-if="newWordsList.length > 0" class="new-words-panel">
      <div class="panel-header">
        <span>📚 Новые изученные слова (которых нет в словаре)</span>
        <div class="panel-actions">
          <button @click="addNewWordsToVocabulary" class="btn-copy" :disabled="savingVocabulary">
            {{ savingVocabulary ? 'Сохранение…' : (isLocalDevelopment ? 'Добавить в словарь' : 'Скачать словарь JSON') }}
          </button>
          <button @click="copyNewWords" class="btn-copy btn-copy-secondary">📋 Скопировать</button>
        </div>
      </div>
      <div class="panel-content">
        <div v-for="word in newWordsList" :key="word.strong" class="new-word-item">
          <code>{{ word.strong }}</code> — {{ word.greek }} — {{ word.russian }}
        </div>
      </div>
      <div class="panel-footer">
        <small v-if="isLocalDevelopment">«Добавить в словарь» дописывает слова в app/data/vocabulary.json. «Скопировать» копирует слова в формате JSON.</small>
        <small v-else>«Скачать словарь JSON» скачивает исходный словарь с новыми словами. Чтобы включить их в сайт, замените app/data/vocabulary.json этим файлом и опубликуйте обновление.</small>
      </div>
    </div>

    <div class="footer-hint">
      💡 Клик — замена слова | Двойной клик по русскому слову — открыть словарь
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { BibleParser } from '~/utils/bibleParser'
import { isInitiallyLearned, registerVocabularyStrongs } from '~/data/learnedWords'
import initialVocabulary from '~/data/vocabulary.json'

type VocabularyEntry = { word: string; pronunciation: string; english: string }
const isLocalDevelopment = import.meta.dev
const vocabularyStorageKey = 'greece_vocabulary_v1'
const readSavedVocabulary = (): VocabularyEntry[] => {
  const data = JSON.parse(localStorage.getItem(vocabularyStorageKey) || '[]')
  if (!Array.isArray(data)) throw new Error('Некорректный формат словаря')
  return data.filter((entry): entry is VocabularyEntry =>
    entry && typeof entry.word === 'string'
    && typeof entry.pronunciation === 'string' && typeof entry.english === 'string')
}

const props = defineProps<{
  bookTitle: string
  chapterRef: string
  htmlPath: string
  storageKey: string
}>()

const parser = new BibleParser()
const renderedHTML = ref('')
const totalWords = ref(0)
const learnedCount = ref(0)

// Список новых слов (которых нет в словаре)
const newWordsList = ref<Array<{ strong: string; greek: string; russian: string }>>([])

// Множество для быстрой проверки (чтобы не дублировать)
const newWordsSet = ref<Set<string>>(new Set())
const savingVocabulary = ref(false)

const progressPercentage = computed(() => {
  if (totalWords.value === 0) return 0
  return Math.round((learnedCount.value / totalWords.value) * 100)
})

const loadVocabularyStrongs = async () => {
  registerVocabularyStrongs(initialVocabulary.vocabulary.map(entry => entry.pronunciation))
  try {
    if (isLocalDevelopment) {
      const data = await $fetch<{ vocabulary: VocabularyEntry[] }>('/api/vocabulary')
      registerVocabularyStrongs(data.vocabulary.map(entry => entry.pronunciation))
      return
    }
    registerVocabularyStrongs(readSavedVocabulary().map(entry => entry.pronunciation))
  } catch (err) {
    console.error('Не удалось прочитать словарь:', err)
  }
}

onMounted(async () => {
  await loadVocabularyStrongs()
  await parser.loadFromFile(props.htmlPath)
  parser.setStorageKey(props.storageKey)
  parser.loadProgress()
  totalWords.value = parser.getAllWords().length
  updateLearnedCount()
  scanNewWords()  // Сканируем новые слова при загрузке
  render()
})

// Сканируем слова, которые были отмечены как изученные, но их нет в словаре
const scanNewWords = () => {
  const allWords = parser.getAllWords()
  const newWords: Array<{ strong: string; greek: string; russian: string }> = []
  const newSet = new Set<string>()
  
  allWords.forEach((word) => {
    // Если слово изучено (показывается греческий) И его нет в словаре initiallyLearnedWords
    if (word.learned && !isInitiallyLearned(word.strong) && word.strong) {
      // Проверяем, не добавили ли мы его уже
      if (!newSet.has(word.strong)) {
        newSet.add(word.strong)
        newWords.push({
          strong: word.strong,
          greek: word.greek,
       
          russian: word.russian
        })
      }
    }
  })
  
  newWordsList.value = newWords
  newWordsSet.value = newSet
}

const toVocabularyEntries = () => {
  return newWordsList.value.map(word => ({
    word: word.greek,
    pronunciation: word.strong,
    english: word.russian
  }))
}

const addNewWordsToVocabulary = async () => {
  if (newWordsList.value.length === 0 || savingVocabulary.value) return

  savingVocabulary.value = true
  const entries = toVocabularyEntries()

  try {
    if (isLocalDevelopment) {
      const result = await $fetch<{ added: number; skipped: number }>('/api/vocabulary', {
        method: 'POST',
        body: { vocabulary: entries }
      })
      registerVocabularyStrongs(entries.map(entry => entry.pronunciation))
      scanNewWords()
      alert(`Добавлено ${result.added} слов в app/data/vocabulary.json`)
      return
    }
    const saved = readSavedVocabulary()
    const known = new Set([...initialVocabulary.vocabulary, ...saved].map(entry => entry.pronunciation))
    const additions = entries.filter(entry => {
      if (known.has(entry.pronunciation)) return false
      known.add(entry.pronunciation)
      return true
    })
    const vocabulary = new Map([...initialVocabulary.vocabulary, ...saved, ...additions]
      .map(entry => [entry.pronunciation, entry]))
    const blob = new Blob([JSON.stringify({ vocabulary: [...vocabulary.values()] }, null, 2) + '\n'], {
      type: 'application/json;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'vocabulary.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    console.error('Ошибка записи словаря:', err)
    alert(isLocalDevelopment ? 'Не удалось записать app/data/vocabulary.json. Проверьте локальный сервер.' : 'Не удалось скачать словарь. Попробуйте скопировать слова кнопкой «Скопировать».')
  } finally {
    savingVocabulary.value = false
  }
}

// Копирование новых слов в буфер обмена
const copyNewWords = async () => {
  if (newWordsList.value.length === 0) return
  
  const output = JSON.stringify({ vocabulary: toVocabularyEntries() }, null, 2)
  
  // Временно создаём элемент textarea для надёжного копирования
  const textarea = document.createElement('textarea')
  textarea.value = output
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  
  try {
    const success = document.execCommand('copy')
    if (success) {
      alert(`✅ Скопировано ${newWordsList.value.length} слов в формате JSON`)
    } else {
      throw new Error('execCommand failed')
    }
  } catch (err) {
    console.error('Ошибка копирования:', err)
    alert('Не удалось скопировать. Скопируйте вручную:')
    console.log(output)
  } finally {
    document.body.removeChild(textarea)
  }
}

const render = () => {
  renderedHTML.value = parser.renderHTML()
  attachClickHandlers()
}

const attachClickHandlers = () => {
  nextTick(() => {
    const wordSpans = document.querySelectorAll('.bible-content span.word')
    
    wordSpans.forEach((span) => {
      const element = span as HTMLElement
      const id = element.getAttribute('data-id')
      if (!id) return
      
      const strongUrl = element.getAttribute('data-strong-url') || ''
      
      const newElement = element.cloneNode(true) as HTMLElement
      element.parentNode?.replaceChild(newElement, element)
      
      let clickTimer: number | null = null
      let isDoubleClick = false
      
      newElement.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        if (isDoubleClick) {
          isDoubleClick = false
          return
        }
        
        clickTimer = window.setTimeout(() => {
          parser.toggleLearned(id)
          updateLearnedCount()
          scanNewWords()  // После изменения сканируем новые слова
          render()
          clickTimer = null
        }, 150)
      })
      
      newElement.addEventListener('dblclick', (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        if (clickTimer) {
          clearTimeout(clickTimer)
          clickTimer = null
        }
        
        isDoubleClick = true
        
        const word = parser.getWordById(id)
        
        if (word && !word.learned && strongUrl) {
          window.open(strongUrl, '_blank')
        }
        
        setTimeout(() => {
          isDoubleClick = false
        }, 100)
      })
    })
  })
}

const updateLearnedCount = () => {
  const all = parser.getAllWords()
  learnedCount.value = all.filter(w => w.learned).length
}

const resetToRussian = () => {
  parser.resetToRussian()
  updateLearnedCount()
  scanNewWords()  // Обновляем список новых слов
  render()
}

const resetToInitial = () => {
  parser.resetToInitial()
  updateLearnedCount()
  scanNewWords()  // Обновляем список новых слов
  render()
}

const learnAll = () => {
  const all = parser.getAllWords()
  all.forEach(w => w.learned = true)
  parser.saveProgress()
  updateLearnedCount()
  scanNewWords()  // Обновляем список новых слов
  render()
}

const clearProgress = () => {
  if (confirm('Вы уверены? Весь прогресс будет потерян.')) {
    resetToInitial()
  }
}



  


</script>

<style scoped>
/* Стили для панели новых слов */
.new-words-panel {
  margin-top: 2rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #e9ecef;
  border-bottom: 1px solid #dee2e6;
  font-weight: bold;
}

.btn-copy {
  background: #2c5f2d;
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
}

.panel-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.btn-copy:hover {
  background: #1e4a1f;
}

.btn-copy:disabled {
  opacity: 0.7;
  cursor: default;
}

.btn-copy-secondary {
  background: #4a6741;
}

.panel-content {
  padding: 0.75rem 1rem;
  max-height: 200px;
  overflow-y: auto;
}

.new-word-item {
  padding: 0.25rem 0;
  font-family: monospace;
  font-size: 0.85rem;
  border-bottom: 1px solid #eee;
}

.new-word-item code {
  background: #e9ecef;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  color: #c0392b;
}

.panel-footer {
  padding: 0.5rem 1rem;
  background: #e9ecef;
  border-top: 1px solid #dee2e6;
  font-size: 0.75rem;
  color: #6c757d;
}
</style>
