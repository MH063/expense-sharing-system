/**
 * 懒加载指令单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

// 模拟IntersectionObserver
const mockObserve = vi.fn()
const mockUnobserve = vi.fn()
const mockDisconnect = vi.fn()

// 创建模拟的IntersectionObserver类
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback
  }
  
  observe = mockObserve
  unobserve = mockUnobserve
  disconnect = mockDisconnect
}

// 设置全局模拟
global.IntersectionObserver = MockIntersectionObserver

describe('lazyLoad指令', () => {
  let wrapper
  let LazyDirective

  beforeEach(async () => {
    // 动态导入懒加载指令
    const lazyModule = await import('@/directives/lazyLoad')
    LazyDirective = lazyModule.default
    
    // 重置模拟函数
    mockObserve.mockClear()
    mockUnobserve.mockClear()
    mockDisconnect.mockClear()
    
    // 创建测试组件
    const TestComponent = {
      template: '<img v-lazy="imageUrl" />',
      props: {
        imageUrl: String
      },
      directives: {
        lazy: LazyDirective
      }
    }
    
    wrapper = mount(TestComponent, {
      props: {
        imageUrl: 'https://example.com/image.jpg'
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  it('应该正确初始化指令', () => {
    const img = wrapper.find('img')
    
    // 检查是否设置了data-src属性
    expect(img.attributes('data-src')).toBe('https://example.com/image.jpg')
    
    // 检查是否设置了占位图
    expect(img.attributes('src')).toContain('data:image/svg+xml')
    
    // 检查是否添加了loading类
    expect(img.classes()).toContain('lazy-loading')
    
    // 检查是否开始观察元素
    expect(mockObserve).toHaveBeenCalledWith(img.element)
  })

  it('应该在元素进入视口时加载图片', async () => {
    const img = wrapper.find('img')
    
    // 获取指令的回调函数
    const callback = MockIntersectionObserver.mock.calls[0][0]
    
    // 模拟元素进入视口
    const entries = [{
      isIntersecting: true,
      target: img.element
    }]
    
    // 执行回调
    callback(entries)
    
    await nextTick()
    
    // 检查是否设置了正确的src
    expect(img.attributes('src')).toBe('https://example.com/image.jpg')
    
    // 检查是否移除了data-src属性
    expect(img.attributes('data-src')).toBeUndefined()
    
    // 检查是否添加了loaded类
    expect(img.classes()).toContain('lazy-loaded')
    
    // 检查是否停止观察元素
    expect(mockUnobserve).toHaveBeenCalledWith(img.element)
  })

  it('应该在图片URL更新时更新data-src', async () => {
    const img = wrapper.find('img')
    
    // 更新图片URL
    await wrapper.setProps({ imageUrl: 'https://example.com/new-image.jpg' })
    
    // 检查是否更新了data-src
    expect(img.attributes('data-src')).toBe('https://example.com/new-image.jpg')
  })

  it('应该在组件卸载时停止观察', () => {
    wrapper.unmount()
    
    // 检查是否停止观察元素
    expect(mockUnobserve).toHaveBeenCalled()
  })

  it('应该处理空图片URL', () => {
    const TestComponent = {
      template: '<img v-lazy="imageUrl" />',
      props: {
        imageUrl: String
      },
      directives: {
        lazy: LazyDirective
      }
    }
    
    const emptyWrapper = mount(TestComponent, {
      props: {
        imageUrl: ''
      }
    })
    
    const img = emptyWrapper.find('img')
    
    // 检查是否设置了空的data-src
    expect(img.attributes('data-src')).toBe('')
    
    emptyWrapper.unmount()
  })

  it('应该处理未定义的图片URL', () => {
    const TestComponent = {
      template: '<img v-lazy="imageUrl" />',
      props: {
        imageUrl: String
      },
      directives: {
        lazy: LazyDirective
      }
    }
    
    const undefinedWrapper = mount(TestComponent, {
      props: {
        imageUrl: undefined
      }
    })
    
    const img = undefinedWrapper.find('img')
    
    // 检查是否设置了未定义的data-src
    expect(img.attributes('data-src')).toBeUndefined()
    
    undefinedWrapper.unmount()
  })

  it('应该在元素不在视口时不加载图片', async () => {
    const img = wrapper.find('img')
    
    // 获取指令的回调函数
    const callback = MockIntersectionObserver.mock.calls[0][0]
    
    // 模拟元素不在视口
    const entries = [{
      isIntersecting: false,
      target: img.element
    }]
    
    // 执行回调
    callback(entries)
    
    await nextTick()
    
    // 检查src是否仍然是占位图
    expect(img.attributes('src')).toContain('data:image/svg+xml')
    
    // 检查data-src是否仍然存在
    expect(img.attributes('data-src')).toBe('https://example.com/image.jpg')
  })
})