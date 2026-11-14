export type PrayerWord = { russian: string; greek: string; strong: string }
export type PrayerToken = { text: string; word?: PrayerWord }

export const normalizePrayerWord = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ё/g, 'е')

export function tokenizePrayer<T extends { russian: string }>(text: string, dictionary: Map<string, T>): Array<{ text: string; word?: T }> {
  const tokens: Array<{ text: string; word?: T }> = []
  let offset = 0
  for (const match of text.matchAll(/\p{L}[\p{L}\p{M}]*/gu)) {
    const index = match.index!
    if (index > offset) tokens.push({ text: text.slice(offset, index) })
    // Match complete words only; accents in the source do not affect lookup.
    tokens.push({ text: match[0], word: dictionary.get(normalizePrayerWord(match[0])) })
    offset = index + match[0].length
  }
  if (offset < text.length) tokens.push({ text: text.slice(offset) })
  return tokens
}
