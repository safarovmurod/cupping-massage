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
for (const route of ['/', '/contact']) {
  const directory = new URL('../dist' + (route === '/' ? '' : route) + '/', import.meta.url)
  await mkdir(directory, { recursive: true })
  await writeFile(new URL('index.html', directory), clean.replace('</head>', '    ' + renderMetadata(route, siteOrigin) + '\n  </head>'))
}
await writeFile(new URL('../dist/404.html', import.meta.url), clean.replace('</head>', '    ' + renderMetadata('/missing', siteOrigin) + '\n  </head>'))
for (const file of ['robots.txt', 'sitemap.xml']) {
  const target = new URL('../dist/' + file, import.meta.url)
  await writeFile(target, (await readFile(target, 'utf8')).replaceAll(SITE_URL, siteOrigin))
}
