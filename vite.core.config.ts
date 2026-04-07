import { defineConfig } from 'vite'

export default defineConfig({
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
    // SimApiVersion 由构建注入，AppVersion 留给调用方 APP 注入
    // 使用方式: npm run build -- --SimApiVersion=1.0.0
    'SimApiVersion': JSON.stringify(process.env.npm_config_SimApiVersion || '0.0.0-develop'),
  }
})
