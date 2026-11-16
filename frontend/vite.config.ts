import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const SPA_ROUTES = [
  'admin',
  'equipe',
  'painel',
  'minha-conta',
  'gestao-produtos',
  'controle-produtos',
  'produtos-admin',
  'checkout',
]

function spaRouteEntriesPlugin(): Plugin {
  let outDir = 'dist'
  return {
    name: 'nobledeck-spa-route-entries',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const resolvedOutDir = path.resolve(process.cwd(), outDir)
      const indexFile = path.join(resolvedOutDir, 'index.html')
      if (!fs.existsSync(indexFile)) return
      const html = fs.readFileSync(indexFile, 'utf-8')
      for (const route of SPA_ROUTES) {
        const flatFile = path.join(resolvedOutDir, `${route}.html`)
        const nestedDir = path.join(resolvedOutDir, route)
        const nestedIndex = path.join(nestedDir, 'index.html')
        fs.writeFileSync(flatFile, html, 'utf-8')
        fs.mkdirSync(nestedDir, { recursive: true })
        fs.writeFileSync(nestedIndex, html, 'utf-8')
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spaRouteEntriesPlugin()],
  publicDir: 'public',
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ext-scryfall': {
        target: 'https://api.scryfall.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ext-scryfall/, ''),
      },
      '/ext-tcgdex': {
        target: 'https://api.tcgdex.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ext-tcgdex/, ''),
      },
      '/ext-ygo': {
        target: 'https://db.ygoprodeck.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ext-ygo/, ''),
      },
      '/ext-optcg': {
        target: 'https://optcgapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ext-optcg/, ''),
      },
      '/img-scryfall': {
        target: 'https://cards.scryfall.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/img-scryfall/, ''),
      },
      '/img-tcgdex': {
        target: 'https://assets.tcgdex.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/img-tcgdex/, ''),
      },
      '/img-ygo': {
        target: 'https://images.ygoprodeck.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/img-ygo/, ''),
      },
      '/img-optcg': {
        target: 'https://optcgapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/img-optcg/, ''),
      },
    },
  },
})
