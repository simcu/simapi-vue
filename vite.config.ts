import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
export default defineConfig(({ mode }) => {
  return {
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      lib: {
        entry: ['src/simapi.core.ts', 'src/simapi.pinia.ts'],
        name: 'SimApi',
        formats: ['es', 'cjs'],
        fileName: (format, entryName) => {
          if (entryName === 'simapi.core') {
            return `index.${format === 'es' ? 'mjs' : 'cjs'}`
          } else if (entryName === 'simapi.pinia') {
            return `pinia.${format === 'es' ? 'mjs' : 'cjs'}`
          }
          return `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`
        }
      },
      rollupOptions: {
        external: ['vue', 'pinia'],
        output: {
          globals: {
            vue: 'Vue',
            pinia: 'Pinia'
          }
        }
      }
    },
    define: {
      SimApiVersion: JSON.stringify(pkg.version)
    }
  }
})
