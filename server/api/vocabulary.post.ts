export default defineEventHandler(async (event) => {
  const body = await readBody<{
    vocabulary?: Array<{ word?: string; pronunciation?: string; english?: string }>
  }>(event)
  const incoming = Array.isArray(body?.vocabulary) ? body.vocabulary : []
  const current = await readVocabulary()
  const known = new Set(current.vocabulary.map((entry) => entry.pronunciation))

  let added = 0
  let skipped = 0

  for (const item of incoming) {
    const word = typeof item?.word === 'string' ? item.word.trim() : ''
    const pronunciation = typeof item?.pronunciation === 'string' ? item.pronunciation.trim() : ''
    const english = typeof item?.english === 'string' ? item.english.trim() : ''

    if (!word || !pronunciation || known.has(pronunciation)) {
      skipped++
      continue
    }

    known.add(pronunciation)
    current.vocabulary.push({ word, pronunciation, english })
    added++
  }

  await writeVocabulary(current)

  return {
    added,
    skipped,
    total: current.vocabulary.length
  }
})
