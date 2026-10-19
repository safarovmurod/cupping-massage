import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createReadStream, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function staticRoutePages() {
  return {
    name: 'static-route-pages',
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url || '/', 'http://localhost').pathname
        if (!request.headers.accept?.includes('text/html') || pathname === '/') return next()
        const outDir = resolve(server.config.root, server.config.build.outDir)
        if (pathname === '/contact' || pathname === '/contact/') {
          response.setHeader('Content-Type', 'text/html; charset=utf-8')
          createReadStream(resolve(outDir, 'contact/index.html')).pipe(response)
          return
        }
        if (existsSync(resolve(outDir, '.' + pathname))) return next()
        response.statusCode = 404
        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        createReadStream(resolve(outDir, '404.html')).pipe(response)
      })
    },
  }
}

// The public site is static and needs no backend credentials.
export default defineConfig({ plugins: [react(), staticRoutePages()], base: '/', build: { outDir: 'dist', sourcemap: false } })
