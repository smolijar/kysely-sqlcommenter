import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'KyselySqlCommenter',
    },
    rollupOptions: {
      external: ['kysely'],
      output: {
        globals: {
          kysely: 'kysely',
        },
      },
    },
  },
  resolve: { alias: { src: resolve('src/') } },
})
