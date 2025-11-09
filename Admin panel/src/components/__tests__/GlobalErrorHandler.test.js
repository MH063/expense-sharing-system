/**
 * GlobalErrorHandler组件单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import GlobalErrorHandler from '@/components/GlobalErrorHandler.vue'

// 模拟console.error
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('GlobalErrorHandler.vue', () => {
  beforeEach(() => {
    // 清除之前的模拟
    vi.clearAllMocks()
    // 重置window.location
    delete window.location
    window.location = { href: '' }
  })

  afterEach(() => {
    // 恢复console.error
    consoleErrorSpy.mockRestore()
  })

  it('应该正常渲染而不显示错误', () => {
    const wrapper = mount(GlobalErrorHandler)
    expect(wrapper.find('.error-boundary').exists()).toBe(true)
    expect(wrapper.find('.error-container').exists()).toBe(false)
  })

  it('应该捕获子组件中的错误', () => {
    // 创建一个会抛出错误的组件
    const ErrorComponent = {
      template: '<div>错误组件</div>',
      mounted() {
        throw new Error('测试错误')
      }
    }

    const wrapper = mount(GlobalErrorHandler, {
      slots: {
        default: ErrorComponent
      }
    })

    // 捕获错误后，错误容器应该显示
    expect(wrapper.find('.error-container').exists()).toBe(true)
    expect(wrapper.find('.error-title').text()).toContain('应用程序出现错误')
  })

  it('应该显示错误信息', async () => {
    const wrapper = mount(GlobalErrorHandler)
    
    // 手动触发错误
    const error = new Error('测试错误信息')
    wrapper.vm.handleError(error, 'TestComponent')
    
    await nextTick()
    
    expect(wrapper.find('.error-container').exists()).toBe(true)
    expect(wrapper.find('.error-message').text()).toContain('测试错误信息')
    expect(wrapper.find('.error-component').text()).toContain('TestComponent')
  })

  it('应该记录错误到控制台', () => {
    const wrapper = mount(GlobalErrorHandler)
    const error = new Error('测试错误信息')
    
    wrapper.vm.handleError(error, 'TestComponent')
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '全局错误捕获:',
      error,
      '组件: TestComponent'
    )
  })

  it('应该重置错误状态', async () => {
    const wrapper = mount(GlobalErrorHandler)
    
    // 先触发错误
    const error = new Error('测试错误信息')
    wrapper.vm.handleError(error, 'TestComponent')
    await nextTick()
    
    // 确认错误已显示
    expect(wrapper.find('.error-container').exists()).toBe(true)
    
    // 重置错误
    wrapper.vm.resetError()
    await nextTick()
    
    // 确认错误已重置
    expect(wrapper.find('.error-container').exists()).toBe(false)
  })

  it('应该刷新页面', () => {
    const wrapper = mount(GlobalErrorHandler)
    
    // 模拟window.location.reload
    window.location.reload = vi.fn()
    
    wrapper.vm.refreshPage()
    
    expect(window.location.reload).toHaveBeenCalled()
  })

  it('应该在开发环境下显示错误详情', async () => {
    // 模拟开发环境
    const originalEnv = import.meta.env.DEV
    import.meta.env.DEV = true
    
    const wrapper = mount(GlobalErrorHandler)
    const error = new Error('测试错误信息')
    error.stack = '错误堆栈信息'
    
    wrapper.vm.handleError(error, 'TestComponent')
    await nextTick()
    
    // 在开发环境下，应该显示错误详情
    expect(wrapper.find('.error-details').exists()).toBe(true)
    expect(wrapper.find('.error-stack').text()).toContain('错误堆栈信息')
    
    // 恢复原始环境变量
    import.meta.env.DEV = originalEnv
  })

  it('应该在生产环境下隐藏错误详情', async () => {
    // 模拟生产环境
    const originalEnv = import.meta.env.DEV
    import.meta.env.DEV = false
    
    const wrapper = mount(GlobalErrorHandler)
    const error = new Error('测试错误信息')
    error.stack = '错误堆栈信息'
    
    wrapper.vm.handleError(error, 'TestComponent')
    await nextTick()
    
    // 在生产环境下，应该隐藏错误详情
    expect(wrapper.find('.error-details').exists()).toBe(false)
    
    // 恢复原始环境变量
    import.meta.env.DEV = originalEnv
  })

  it('应该处理空错误对象', async () => {
    const wrapper = mount(GlobalErrorHandler)
    
    // 传入空错误
    wrapper.vm.handleError(null, 'TestComponent')
    await nextTick()
    
    expect(wrapper.find('.error-container').exists()).toBe(true)
    expect(wrapper.find('.error-message').text()).toContain('未知错误')
  })

  it('应该处理字符串错误', async () => {
    const wrapper = mount(GlobalErrorHandler)
    
    // 传入字符串错误
    wrapper.vm.handleError('字符串错误', 'TestComponent')
    await nextTick()
    
    expect(wrapper.find('.error-container').exists()).toBe(true)
    expect(wrapper.find('.error-message').text()).toContain('字符串错误')
  })
})