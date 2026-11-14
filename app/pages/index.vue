<template>
  <div class="container">
    <div class="toc-header">
      <h1>📖 Библия. Новый Завет</h1>
      <p>Подстрочник с греческого языка. Кликайте на слова, чтобы учить.</p>
    </div>
    
    <div class="toc-grid">
      <NuxtLink to="/text-reader" class="toc-card">
        <span class="book-icon">✍️</span>
        <div class="book-info">
          <h2>Ваш текст</h2>
          <p>Загрузите текст и замените русские слова на иностранные</p>
          <span class="book-stats">Три словаря на выбор</span>
        </div>
      </NuxtLink>
      <NuxtLink to="/chinese-prayers" class="toc-card">
        <span class="book-icon">🇨🇳</span>
        <div class="book-info">
          <h2>Китайский — молитвослов</h2>
          <p>Русская основа со знакомыми китайскими словами</p>
          <span class="book-stats">По вашим словарям с Google Drive</span>
        </div>
      </NuxtLink>
      <NuxtLink to="/greek-prayers" class="toc-card">
        <span class="book-icon">🇬🇷</span>
        <div class="book-info">
          <h2>Греческий — молитвослов</h2>
          <p>Молитвы со знакомыми греческими словами</p>
          <span class="book-stats">Практика по вашему словарю</span>
        </div>
      </NuxtLink>
      <a :href="japaneseUrl" class="toc-card">
        <span class="book-icon">🇯🇵</span>
        <div class="book-info">
          <h2>Японский — практика</h2>
          <p>Молитвы с заменой слов и заметки об иероглифах</p>
          <span class="book-stats">Японский язык</span>
        </div>
      </a>
      <NuxtLink to="/1cor" class="toc-card">
        <span class="book-icon">📜</span>
        <div class="book-info">
          <h2>1-е Коринфянам - 1</h2>
          <p>Глава 1 • Подстрочный перевод</p>
          <span class="book-stats">31 стих</span>
        </div>
      </NuxtLink>
      
      <NuxtLink to="/1cor2" class="toc-card">
        <span class="book-icon">📜</span>
        <div class="book-info">
          <h2>1-е Коринфянам - 2</h2>
          <p>Глава 1 • Подстрочный перевод</p>
          <span class="book-stats">Скоро</span>
        </div>
      </NuxtLink>

            <NuxtLink to="/1cor3" class="toc-card">
        <span class="book-icon">📜</span>
        <div class="book-info">
          <h2>1-е Коринфянам - 3</h2>
          <p>Глава 1 • Подстрочный перевод</p>
          <span class="book-stats">Скоро</span>
        </div>
      </NuxtLink>

            <NuxtLink to="/1cor4" class="toc-card">
        <span class="book-icon">📜</span>
        <div class="book-info">
          <h2>1-е Коринфянам - 4</h2>
          <p>Глава 1 • Подстрочный перевод</p>
          <span class="book-stats">Скоро</span>
        </div>
      </NuxtLink>

            <NuxtLink to="/1cor5" class="toc-card">
        <span class="book-icon">📜</span>
        <div class="book-info">
          <h2>1-е Коринфянам - 5</h2>
          <p>Глава 1 • Подстрочный перевод</p>
          <span class="book-stats">Скоро</span>
        </div>
      </NuxtLink>

                  <NuxtLink to="/1cor6" class="toc-card">
        <span class="book-icon">📜</span>
        <div class="book-info">
          <h2>1-е Коринфянам - 6</h2>
          <p>Глава 1 • Подстрочный перевод</p>
          <span class="book-stats">Скоро</span>
        </div>
      </NuxtLink>

                       <NuxtLink to="/1cor7" class="toc-card">
        <span class="book-icon">📜</span>
        <div class="book-info">
          <h2>1-е Коринфянам - 7</h2>
          <p>Глава 1 • Подстрочный перевод</p>
          <span class="book-stats">Скоро</span>
        </div>
      </NuxtLink>

                             <NuxtLink to="/1cor8" class="toc-card">
        <span class="book-icon">📜</span>
        <div class="book-info">
          <h2>1-е Коринфянам - 8</h2>
          <p>Глава 1 • Подстрочный перевод</p>
          <span class="book-stats">Скоро</span>
        </div>
      </NuxtLink>

    </div>
  </div>
</template>

<script setup lang="ts">
import { publicAssetUrl } from '~/utils/publicAssetUrl'
const japaneseUrl = publicAssetUrl('japanese.html', useRuntimeConfig().app.baseURL)
</script>

<style scoped>
.toc-header {
  text-align: center;
  margin-bottom: 3rem;
}

.toc-header h1 {
  font-size: 2.5rem;
  color: #2c3e6b;
  margin-bottom: 0.5rem;
}

.toc-header p {
  color: #6b5b4f;
  font-size: 1.1rem;
}

.toc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.toc-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.toc-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  background: #f8f9fa;
}

.book-icon {
  font-size: 2.5rem;
}

.book-info h2 {
  margin: 0 0 0.25rem 0;
  color: #2c3e6b;
}

.book-info p {
  margin: 0;
  color: #6b5b4f;
  font-size: 0.9rem;
}

.book-stats {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #2c5f2d;
  font-weight: bold;
}
</style>

