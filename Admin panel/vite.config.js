import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8100,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    // 启用代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          // 将Element Plus单独打包
          'element-plus': ['element-plus'],
          // 将ECharts单独打包
          'echarts': ['echarts'],
          // 将其他第三方库打包
          'vendor': ['axios', 'vue-router', 'pinia']
        }
      }
    },
    // 启用gzip压缩
    reportCompressedSize: true,
    // 启用CSS代码分割
    cssCodeSplit: true,
    // 设置chunk大小警告限制
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  // 启用依赖预构建优化
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'axios', 'element-plus', 'echarts']
  }
})