import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The public site is static and needs no backend credentials.
export default defineConfig({ plugins: [react()], base: '/', build: { outDir: 'dist', sourcemap: false } })
