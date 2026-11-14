# Nuxt Minimal Starter

## GitHub Pages

Сайт: https://vanoo2045-cloud.github.io/Languages1/

В Settings → Pages выбран источник GitHub Actions. Workflow
`.github/workflows/deploy-pages.yml` при каждом push в `main` устанавливает
зависимости, проверяет замены, выполняет `npm run generate` и публикует
`.output/public`. Прогресс публикации виден во вкладке Actions.
При этой сборке `NUXT_APP_BASE_URL=/Languages1/`; обычный запуск и сборка
для Firebase используют `/`. Словари, тексты и статические страницы учитывают
этот путь. Серверный API записи словаря работает только в режиме разработки;
на статическом сайте доступно скачивание JSON.

Для японского языка поддерживается поле `stems: ["матер"]` в записи словаря.
Если полное слово, фраза или `aliases` не совпали, корень в начале слова заменяется,
а исходное русское окончание сохраняется: `Матере` → `母е`.
Корни задаются явно; автоматически обрезать все словарные слова не нужно.
Дополнения сайта находятся в `app/data/japaneseSupplement.json` и применяются
как к словарю GitHub, так и к резервной копии. Если запись уже есть в GitHub,
к ней добавляются корни из дополнения. Действуют обычные фильтры изучения и ключей.

Из старого японского молитвослова перенесены 132 корня и 204 формы/выражения.
Для этих записей `stemsInsideWords: true` разрешает замену корня внутри слова:
`Пречистыя` → `Пре浄ыя`, `сыне` → `子е`. Полные значения словаря имеют приоритет,
затем проверяются перенесённые `readingForms`, обычные `aliases` и корни.
Повторный импорт правил: `node scripts/import-japanese-reader-rules.mjs`.
Он обновляет только `app/data/japaneseSupplement.json`, а не словарь GitHub.

## Страница «Ваш текст»

`/text-reader` позволяет вставить или загрузить русский текст (TXT, Markdown,
HTML до 2 МБ), выбрать язык и читать его с заменами из словаря. По умолчанию
загружаются вечерние молитвы из `public/texts/evening-prayers.txt`.
Обработка текста выполняется в браузере. Есть показ исходного текста,
раскрытие отдельных слов, копирование и скачивание TXT.

Страница «Ваш текст» загружает основные словари напрямую из публичного GitHub
`vanoo2045-cloud/languages`, ветка `main`: `ancientGreek/words.json`,
`japanese/words.json`, `chinese/words.json`. Кнопка «Редактировать на GitHub»
открывает веб-редактор выбранного файла. После Commit changes в `main` достаточно
открыть страницу снова или нажать «Обновить словарь»; пересборка сайта не нужна.
Возможна задержка обновления на стороне GitHub. Открытая страница не опрашивает
репозиторий непрерывно. Ключи и токены доступа в браузере не используются.

Резервные копии хранятся в исходном формате GitHub (`{ "vocabulary": [...] }`):

- `public/dictionaries/ancientGreek.json`
- `public/dictionaries/japanese.json`
- `public/dictionaries/chinese.json`

Эти файлы можно редактировать непосредственно. Сборка их не перезаписывает.
Если GitHub не отвечает за 10 секунд, вернул ошибку или повреждённый JSON,
страница использует резервную копию и явно показывает предупреждение.
Если не загрузилась и копия, результат не подменяется устаревшими данными —
показывается ошибка с повторной загрузкой. Изменения файлов в `public` вступают
в силу после деплоя и относятся к резервным копиям, а не к источнику GitHub.
В `public/dictionaries/aliases.json` лежат дополнительные соответствия русских
форм иностранным: греческие формы из восьми глав, японские выражения из
молитвослова и русские формы для китайских слов. Соответствия используются
только для записей, присутствующих и доступных в выбранном словаре.

Для явного обновления трёх основных словарей из GitHub (заменяет локальные копии):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-public-dictionaries.ps1
```

Затем выполните `firebase deploy --only hosting`, чтобы опубликовать обновлённые
резервные копии. Изменения основного словаря на GitHub деплоя не требуют.
Основной и резервный словари запрашиваются с `cache: no-store`; заголовок
Hosting для резервных JSON — `Cache-Control: no-store`.

Динамическая загрузка относится к `/text-reader`. Отдельные страницы
`/greek-prayers`, `/chinese-prayers` и `/japanese.html` используют свои
подготовленные данные и меняются при публикации сайта.

При совпадении нескольких записей выбирается первая. Длинные фразы имеют
приоритет над отдельными словами. Отмеченные `needs_review` записи исключаются.
Дополнительные русские формы берутся также из массива `aliases` внутри каждой
записи словаря. Поддерживаются слова и фразы, нормализация регистра, ударений
и ё/е. Основные значения проверяются раньше встроенных `aliases`, затем
добавляются соответствия из отдельного `aliases.json`. На все дополнительные
формы распространяются те же фильтры, что на основную запись.
Фильтр «Только изучавшиеся» учитывает историю изучения и `radical_learned`,
а не `mastery_confirmed`. Замены не являются грамматическим переводом.

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Публикация в Firebase

Проект: `Languages` (`ssd76switch`). Сайт Hosting: `greek-prayers`.
Адрес: https://greek-prayers.web.app

```bash
firebase deploy --only hosting --project ssd76switch
```

Команда автоматически запускает `npm run generate` и публикует `.output/public`.
Исходный словарь включён в сборку. Прогресс изучения сохраняется в LocalStorage.
При локальном запуске (`npm run dev`) кнопка «Добавить в словарь» дописывает слова
в `app/data/vocabulary.json` через локальный API.
На опубликованном сайте кнопка «Скачать словарь JSON» скачивает полный словарь
с новыми словами. Замените им `app/data/vocabulary.json` и опубликуйте обновление.
Слова, сохранённые в LocalStorage предыдущей версией сайта, также включаются в скачиваемый файл.
Подключение GitHub может автоматизировать публикацию изменений файла из репозитория;
Firebase Hosting сам не записывает изменения в исходные файлы.

## Греческий молитвослов

Страница `/greek-prayers` использует молитвы из `public/japanese.html` без японских
замен и заметок. `scripts/prepare-prayers.mjs` собирает словарь из
`app/data/vocabulary.json`, списка изученных номеров Стронга в `app/data/learnedWords.ts`
и соответствующих форм в сохранённых главах подстрочника.
Данные автоматически обновляются перед `dev`, `build` и `generate`.
Заменяются только целые слова; ударения в исходном тексте не мешают поиску.
Это учебная подстановка словарных форм, без перевода грамматики всего предложения.

## Китайский молитвослов

Страница `/chinese-prayers` использует тот же исходный молитвослов и знакомую лексику
из файлов «Карточки.txt», «Json Ассоц1.txt», «Json ассоц2.txt», «Json Ассоц3.txt»
в папке «Китайский» на Google Drive. Источники зафиксированы в
`app/data/chineseVocabularySources.json`, словарь замен и русские формы —
в `app/data/chinesePrayerWords.json`. Синхронизация с Drive не автоматическая.
Клик по китайскому слову показывает исходное слово; переключатель возвращает весь текст.
