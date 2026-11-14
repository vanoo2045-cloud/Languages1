import fs from 'node:fs'
import { extractInterlinearWords } from './interlinear-words.mjs'

const languages = ['ancientGreek', 'japanese', 'chinese']
fs.mkdirSync('public/dictionaries', { recursive: true })
fs.mkdirSync('public/texts', { recursive: true })
for (const language of languages) fs.copyFileSync(`.cache/languages-sync/${language}/words.json`, `public/dictionaries/${language}.json`)
const prayers = JSON.parse(fs.readFileSync('app/data/prayers.json', 'utf8'))
fs.writeFileSync('public/texts/evening-prayers.txt', prayers.map(entry => entry.text).join('\n\n') + '\n')
const aliases = { ancientGreek: [], japanese: [], chinese: [] }
for (const filename of fs.readdirSync('public').filter(name => /^1cor\d+\.html$/i.test(name))) {
  for (const entry of extractInterlinearWords(fs.readFileSync('public/' + filename, 'utf8'))) {
    aliases.ancientGreek.push({ russian: entry.russian, foreign: entry.greek.replace(/[.,;:!?·;]+$/u, ''), codeBible: entry.strong })
  }
}
const japanese = JSON.parse(fs.readFileSync('.cache/japanese-prayer-candidates.json', 'utf8'))
for (const entry of japanese) for (const russian of entry.russian) aliases.japanese.push({ russian, foreign: entry.japanese })
const chinese = JSON.parse(fs.readFileSync('app/data/chinesePrayerWords.json', 'utf8'))
for (const entry of chinese) for (const russian of entry.forms) aliases.chinese.push({ russian, foreign: entry.chinese })
for (const language of languages) aliases[language] = [...new Map(aliases[language].map(entry => [JSON.stringify(entry), entry])).values()]
fs.writeFileSync('public/dictionaries/aliases.json', JSON.stringify(aliases, null, 2) + '\n')
console.log('Prepared public dictionary snapshots, aliases and evening prayers. Build commands do not overwrite these files.')
