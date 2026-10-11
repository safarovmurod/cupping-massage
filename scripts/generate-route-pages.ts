import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { loadEnv } from 'vite'
import { renderMetadata, SITE_URL } from '../src/lib/seo.ts'

const env = loadEnv('production', process.cwd(), 'VITE_')
const siteOrigin = new URL(env.VITE_PRODUCTION_ORIGIN || SITE_URL).origin

const template = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
const clean = template
  .replace(/\s*<title>[^<]*<\/title>/g, '')
  .replace(/\s*<meta\s+(?:name="(?:description|robots|twitter:[^"]+)"|property="og:(?:title|description|image|url|locale)")[^>]*>/g, '')
  .replace(/\s*<link rel="canonical"[^>]*>/g, '')
for (const route of ['/', '/contact', '/login', '/register', '/forgot-password', '/reset-password', '/admin']) {
  const directory = new URL(`../dist${route === '/' ? '' : route}/`, import.meta.url)
  await mkdir(directory, { recursive: true })
  await writeFile(new URL('index.html', directory), clean.replace('</head>', `    ${renderMetadata(route, siteOrigin)}\n  </head>`))
}
// Keep crawler files on the same explicit origin as the built HTML and React.
for (const file of ['robots.txt', 'sitemap.xml']) {
  const target = new URL(`../dist/${file}`, import.meta.url)
  const content = await readFile(target, 'utf8')
  await writeFile(target, content.replaceAll(SITE_URL, siteOrigin))
}
