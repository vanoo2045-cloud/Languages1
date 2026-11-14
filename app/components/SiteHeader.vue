<template>
  <header class="site-header">
    <div class="site-header__inner">
      <NuxtLink to="/" class="site-header__brand">Языки</NuxtLink>
      <nav class="site-header__nav" aria-label="Основная навигация">
        <NuxtLink to="/" :aria-current="route.path === '/' ? 'page' : undefined">Главная</NuxtLink>
        <NuxtLink to="/text-reader" :aria-current="route.path.replace(/\/$/, '') === '/text-reader' ? 'page' : undefined">Ваш текст</NuxtLink>
        <NuxtLink to="/1cor" :aria-current="/^\/1cor\d*\/?$/.test(route.path) ? 'page' : undefined">Библия</NuxtLink>
        <NuxtLink to="/greek-prayers" :aria-current="route.path.replace(/\/$/, '') === '/greek-prayers' ? 'page' : undefined">Греческий молитвослов</NuxtLink>
        <NuxtLink to="/chinese-prayers" :aria-current="route.path.replace(/\/$/, '') === '/chinese-prayers' ? 'page' : undefined">Китайский молитвослов</NuxtLink>
        <a :href="japaneseUrl">Японский</a>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { publicAssetUrl } from '~/utils/publicAssetUrl'
const route = useRoute()
const japaneseUrl = publicAssetUrl('japanese.html', useRuntimeConfig().app.baseURL)
</script>
