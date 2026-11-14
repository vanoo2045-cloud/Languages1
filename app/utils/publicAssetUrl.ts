export function publicAssetUrl(path: string, baseURL = '/'): string {
  return `${baseURL.replace(/\/?$/, '/')}${path.replace(/^\/+/, '')}`
}
