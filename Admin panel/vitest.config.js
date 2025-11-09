/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    // 启用类似Jest的API
    globals: true,
    // 测试环境
    environment: 'jsdom',
    // 支持Vue组件
    include: ['src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // 排除测试文件
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache'
    ],
    // 设置测试超时时间
    testTimeout: 10000,
    // 覆盖率配置
    coverage: {
      // 覆盖率提供者
      provider: 'v8',
      // 覆盖率报告格式
      reporter: ['text', 'json', 'html'],
      // 输出目录
      reportsDirectory: 'coverage',
      // 覆盖率阈值
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      },
      // 包含的文件
      include: [
        'src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue}'
      ],
      // 排除的文件
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.d.ts',
        'src/main.js',
        'src/**/*.stories.{js,ts,jsx,tsx}'
      ]
    },
    // 设置测试文件
    setupFiles: ['./src/test/setup.js']
  }
})