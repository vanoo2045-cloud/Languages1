// nuxt.config.ts
import { defineNuxtConfig } from 'nuxt/config'

const baseURL = (process.env.NUXT_APP_BASE_URL || '/').replace(/\/?$/, '/')

export default defineNuxtConfig({
  // Указываем, что исходники в папке app
  srcDir: 'app/',
  app: {
    baseURL,
    head: {
      link: [
        { rel: 'stylesheet', href: `${baseURL}site-header.css` },
        { rel: 'icon', href: `${baseURL}favicon.ico` }
      ]
    }
  },

  // На Windows localhost часто открывается как ::1, и браузер получает отказ.
  // Явный IPv4-адрес принимает обычный http://127.0.0.1:3000/
  devServer: {
    host: '127.0.0.1',
    port: 3000
  },
  
  devtools: { enabled: false },  // временно отключите для стабильности
  
  css: [
    '~/assets/styles/common.css',
    '~/assets/styles/bible.css'
  ],
  
  compatibilityDate: '2024-12-01'
})
