import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { renderMetadata } from '../src/lib/seo.ts'

const template = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
const clean = template
  .replace(/\s*<title>[^<]*<\/title>/g, '')
  .replace(/\s*<meta\s+(?:name="(?:description|robots|twitter:[^"]+)"|property="og:(?:title|description|image|url|locale)")[^>]*>/g, '')
  .replace(/\s*<link rel="canonical"[^>]*>/g, '')
for (const route of ['/', '/contact', '/login', '/register', '/forgot-password', '/reset-password', '/admin']) {
  const directory = new URL(`../dist${route === '/' ? '' : route}/`, import.meta.url)
  await mkdir(directory, { recursive: true })
  await writeFile(new URL('index.html', directory), clean.replace('</head>', `    ${renderMetadata(route)}\n  </head>`))
}
