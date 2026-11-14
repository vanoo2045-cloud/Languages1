import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export type VocabularyEntry = {
  word: string
  pronunciation: string
  english: string
}

export type VocabularyFile = {
  vocabulary: VocabularyEntry[]
}

const filePath = join(process.cwd(), 'app', 'data', 'vocabulary.json')

export async function readVocabulary(): Promise<VocabularyFile> {
  const raw = await readFile(filePath, 'utf8')
  const data = JSON.parse(raw) as VocabularyFile
  if (!data || !Array.isArray(data.vocabulary)) {
    return { vocabulary: [] }
  }

  return {
    vocabulary: data.vocabulary.filter((entry) =>
      entry
      && typeof entry.word === 'string'
      && typeof entry.pronunciation === 'string'
      && typeof entry.english === 'string'
    )
  }
}

export async function writeVocabulary(data: VocabularyFile): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}
