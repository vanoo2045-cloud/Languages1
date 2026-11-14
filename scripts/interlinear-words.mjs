// Saved chapters use both quoted and unquoted HTML class attributes.
const clean = text => text.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').trim()
const classText = (html, tag, className) => {
  const pattern = new RegExp(`<${tag}\\b[^>]*\\bclass=(?:"${className}"|'${className}'|${className}(?=[\\s>]))[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  return clean(html.match(pattern)?.[1] || '')
}

export function extractInterlinearWords(html) {
  const markers = [...html.matchAll(/<span\b[^>]*\bclass=(?:"word"|'word'|word(?=[\s>]))[^>]*>/gi)]
  return markers.flatMap((marker, index) => {
    const strong = marker[0].match(/\bdata-word=["']?(\d+)/)?.[1]
    const body = html.slice(marker.index + marker[0].length, markers[index + 1]?.index ?? html.length)
    const greek = classText(body, 'a', 'greek-word')
    const russian = classText(body, 'span', 'rus-word')
    if (!strong || !greek || !russian || !/\p{Script=Greek}/u.test(greek)) return []
    return [{ strong, greek, russian }]
  })
}
