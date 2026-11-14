// utils/bibleParser.ts

// Нормализация слов 
import { normalizeGreekWord } from '~/data/greekNormalizer'
import { isInitiallyLearned } from '~/data/learnedWords'

export interface WordData {
  id: string
  strong: string
  greek: string
  russian: string
  learned: boolean  // true - показываем греческий, false - показываем русский
  strongUrl: string
}

export class BibleParser {
  private container: HTMLElement | null = null
  private words: Map<string, WordData> = new Map()
  private storageKey: string = 'bibleProgress'
  
  async loadFromFile(filePath: string): Promise<void> {
    const response = await fetch(filePath)
    const html = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    this.container = doc.body
    this.parseWords()
  }
  
  loadFromString(htmlString: string): void {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlString, 'text/html')
    this.container = doc.body
    this.parseWords()
  }
  
  setStorageKey(key: string): void {
    this.storageKey = key
  }
  
  private parseWords(): void {
    if (!this.container) return
    
    const wordSpans = this.container.querySelectorAll('span.word')
    
    wordSpans.forEach((span) => {
      const id = span.getAttribute('data-id') || ''
      const strong = span.getAttribute('data-word') || ''
      
      const greekLink = span.querySelector('a.greek-word')
      const greek = greekLink ? greekLink.textContent?.trim() || '' : ''
      
      const strongUrl = greekLink ? greekLink.getAttribute('href') || '' : ''
      
      const rusSpan = span.querySelector('span.rus-word')
      let russian = rusSpan ? rusSpan.textContent?.trim() || '' : ''
      if (russian === '') russian = ' '
      
      // Определяем начальное состояние:
      // true - если слово есть в словаре изученных (isInitiallyLearned)
      // false - в остальных случаях
      const initiallyLearned = isInitiallyLearned(strong)
      
      this.words.set(id, {
        id,
        strong,
        greek,
        russian,
        learned: initiallyLearned,  // ← здесь устанавливаем начальное состояние
        strongUrl
      })
    })
  }
  
  getAllWords(): WordData[] {
    return Array.from(this.words.values())
  }
  
  getWordById(id: string): WordData | undefined {
    return this.words.get(id)
  }
  
  toggleLearned(id: string): void {
    const word = this.words.get(id)
    if (word) {
      word.learned = !word.learned
      this.saveProgress()
    }
  }
  
  // Сбросить всё к русскому тексту
  resetToRussian(): void {
    this.words.forEach((word) => {
      word.learned = false
    })
    this.saveProgress()
  }
  
  // Сбросить всё к начальному состоянию (учитывая initiallyLearned)
  resetToInitial(): void {
    this.words.forEach((word) => {
      word.learned = isInitiallyLearned(word.strong)
    })
    this.saveProgress()
  }
  
  saveProgress(): void {
    const progress: Record<string, boolean> = {}
    this.words.forEach((word) => {
      // Сохраняем только слова, которые отличаются от начального состояния
      const initialLearned = isInitiallyLearned(word.strong)
      if (word.learned !== initialLearned) {
        progress[word.id] = word.learned
      }
    })
    localStorage.setItem(this.storageKey, JSON.stringify(progress))
  }
  
  loadProgress(): void {
    const saved = localStorage.getItem(this.storageKey)
    if (!saved) return
    
    const progress: Record<string, boolean> = JSON.parse(saved)
    Object.entries(progress).forEach(([id, learned]) => {
      const word = this.words.get(id)
      if (word) {
        word.learned = learned
      }
    })
  }
  
  renderHTML(): string {
    if (!this.container) return ''
    
    const clone = this.container.cloneNode(true) as HTMLElement
    
    // Удаляем ненужные блоки
    clone.querySelectorAll('div.numbers, div.chapters , div.number, a.chapter-href, ul.chapters, li.menu-item, span.panel, div.header-container, div.footer-container, div.popup, form.settings, div.link, nav.mobile-nav').forEach(el => el.remove())
    
    const wordSpans = clone.querySelectorAll('span.word')
    
    wordSpans.forEach((span) => {
      const id = span.getAttribute('data-id')
      if (!id) return
      
      const word = this.words.get(id)
      if (!word) return
      
      if (word.strongUrl) {
        span.setAttribute('data-strong-url', word.strongUrl)
      }
      
      const greekLink = span.querySelector('a.greek-word') as HTMLElement | null
      const rusSpan = span.querySelector('span.rus-word') as HTMLElement | null
      const transcripts = span.querySelectorAll('span.transcript')
      
      transcripts.forEach(t => t.remove())
      
      if (greekLink) {
        greekLink.removeAttribute('href')
        greekLink.style.cursor = 'pointer'
        
        // ========== НОРМАЛИЗАЦИЯ ГРЕЧЕСКОГО ТЕКСТА ==========
        // Сохраняем оригинальный текст
        const originalText = greekLink.textContent || ''
        
        // Применяем нормализацию (убираем диакритику)
        greekLink.textContent = normalizeGreekWord(originalText)
        
        // Сохраняем оригинал в атрибут для словаря
        greekLink.setAttribute('data-original-greek', originalText)
        
        // Добавляем подсказку с оригиналом
        if (word.strong) {
          greekLink.setAttribute('title', `${originalText} (Strong: ${word.strong})`)
        }
        
        // ДЛЯ ОТКЛЮЧЕНИЯ НОРМАЛИЗАЦИИ:
        // Закомментируйте строки выше и раскомментируйте строку ниже
        // greekLink.textContent = originalText;
        // ===================================================
      }
      
      if (word.learned) {
        if (greekLink) {
          greekLink.style.display = 'inline'
          span.classList.add('learned')
        }
        if (rusSpan) rusSpan.style.display = 'none'
      } else {
        if (greekLink) greekLink.style.display = 'none'
        if (rusSpan) rusSpan.style.display = 'inline'
      }
    })
    
    return clone.innerHTML
  }
}