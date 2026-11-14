<template>
  <div class="page-1cor">
    <div class="container">
      <NuxtLink to="/" class="back-link">← К оглавлению</NuxtLink>
      <BibleReader 
        book-title="1-е послание к Коринфянам"
        chapter-ref="Глава 2"
        html-path="/1cor2.html"
        storage-key="1cor1_progress"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import BibleReader from '~/components/BibleReader.vue'
</script>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: 1rem;
  color: #2c3e6b;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}
</style>