import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

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
      // SimApiVersion 由环境变量注入
      'SimApiVersion': JSON.stringify(env.VITE_SimApiVersion || process.env.npm_config_SimApiVersion || '0.0.0-develop'),
    }
  }
})
