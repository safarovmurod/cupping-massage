import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createServer, loadEnv } from 'vite'
import { renderMetadata, SITE_URL } from '../src/lib/seo.ts'

const env = loadEnv('production', process.cwd(), 'VITE_')
const siteOrigin = new URL(env.VITE_PRODUCTION_ORIGIN || SITE_URL).origin
const template = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
const clean = template
  .replace(/\s*<title>[^<]*<\/title>/g, '')
  .replace(/\s*<meta\s+(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/g, '')
  .replace(/\s*<link rel="canonical"[^>]*>/g, '')
  .replace(/\s*<link data-seo-image[^>]*>/g, '')
  .replace(/\s*<script id="site-schema"[^>]*>[\s\S]*?<\/script>/g, '')
// Pre-render the actual components so crawlers and visitors receive useful HTML.
process.env.NODE_ENV = 'production'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', ssr: { noExternal: [/^@mui\//] }, optimizeDeps: { noDiscovery: true, include: [] }, logLevel: 'error' })
try {
  const { render } = await server.ssrLoadModule('/src/entry-server.tsx')
  for (const route of ['/', '/contact', '/missing']) {
    const html = clean.replace('<div id="root"></div>', () => '<div id="root">' + render(route) + '</div>')
      .replace('</head>', '    ' + renderMetadata(route, siteOrigin) + '\n  </head>')
    if (route === '/missing') await writeFile(new URL('../dist/404.html', import.meta.url), html)
    else {
      const directory = new URL('../dist' + (route === '/' ? '' : route) + '/', import.meta.url)
      await mkdir(directory, { recursive: true })
      await writeFile(new URL('index.html', directory), html)
    }
  }
} finally {
  await server.close()
}
for (const file of ['robots.txt', 'sitemap.xml']) {
  const target = new URL('../dist/' + file, import.meta.url)
  await writeFile(target, (await readFile(target, 'utf8')).replaceAll(SITE_URL, siteOrigin))
}
