/**
 * 测试环境设置文件
 */

import { config } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ElementPlus from 'element-plus'

// 全局配置Vue Test Utils
config.global.plugins = [ElementPlus]

// 全局配置Pinia测试插件
config.global.plugins.push(createTestingPinia({
  // 创建初始状态
  initialState: {},
  // 启用存根
  stubActions: false,
  // 创建间谍
  createSpy: vi.fn
}))

// 全局模拟window对象的一些属性
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// 模拟ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// 模拟IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// 模拟console方法以减少测试输出中的噪音
global.console = {
  ...console,
  // 保留error和warn
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
}

// 模拟fetch API
global.fetch = vi.fn()

// 模拟localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// 模拟sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.sessionStorage = sessionStorageMock