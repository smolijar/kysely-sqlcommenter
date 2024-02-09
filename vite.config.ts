import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'kysely-sqlformatter',
    },
  },
  resolve: { alias: { src: resolve('src/') } },
  plugins: [
    dts({
      insertTypesEntry: true,
      exclude: ['**/**/*.spec.*', '**/**/_.*'],
      rollupTypes: true,
    }),
  ],
})
