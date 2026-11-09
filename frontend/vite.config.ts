import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
