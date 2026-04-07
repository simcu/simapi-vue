import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/simapi.core.ts',
      name: 'SimApiCore',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    rollupOptions: {
      // 不再需要 external，使用原生 fetch
    }
  },
  define: {
    // 版本号从环境变量读取,构建时传入:
    // npm run build:core -- --AppVersion=1.2.3 --SimApiVersion=2.3.4
    // 或:
    // AppVersion=1.2.3 SimApiVersion=2.3.4 npm run build:core
    'AppVersion': JSON.stringify(process.env.AppVersion || process.env.npm_config_AppVersion || '0.0.0-develop'),
    'SimApiVersion': JSON.stringify(process.env.SimApiVersion || process.env.npm_config_SimApiVersion || '0.0.0-develop'),
  }
}))
