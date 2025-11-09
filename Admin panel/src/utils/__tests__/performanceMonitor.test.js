/**
 * 性能监控工具单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import performanceMonitor from '@/utils/performanceMonitor'

// 模拟performance API
const mockPerformance = {
  now: vi.fn(),
  getEntriesByType: vi.fn(),
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  navigation: {
    type: 0
  },
  timing: {
    navigationStart: 0,
    loadEventEnd: 0,
    domContentLoadedEventEnd: 0
  }
}

// 模拟navigator API
const mockNavigator = {
  sendBeacon: vi.fn()
}

// 设置全局模拟
global.performance = mockPerformance
global.navigator = mockNavigator

// 模拟PerformanceObserver
const mockPerformanceObserver = vi.fn()
mockPerformanceObserver.prototype.observe = vi.fn()
mockPerformanceObserver.prototype.disconnect = vi.fn()
global.PerformanceObserver = mockPerformanceObserver

describe('performanceMonitor', () => {
  beforeEach(() => {
    // 重置模拟函数
    vi.clearAllMocks()
    
    // 设置默认返回值
    mockPerformance.now.mockReturnValue(100)
    mockPerformance.getEntriesByType.mockReturnValue([])
    mockPerformance.timing.navigationStart = 0
    mockPerformance.timing.loadEventEnd = 1000
    mockPerformance.timing.domContentLoadedEventEnd = 800
  })

  afterEach(() => {
    // 停止性能监控
    performanceMonitor.stop()
  })

  it('应该正确初始化性能监控', () => {
    performanceMonitor.start()
    
    expect(performanceMonitor.isRunning()).toBe(true)
    expect(mockPerformance.mark).toHaveBeenCalledWith('performance-monitor-start')
  })

  it('应该正确停止性能监控', () => {
    performanceMonitor.start()
    performanceMonitor.stop()
    
    expect(performanceMonitor.isRunning()).toBe(false)
  })

  describe('页面加载性能', () => {
    it('应该计算页面加载时间', () => {
      performanceMonitor.start()
      
      // 模拟页面加载完成
      Object.defineProperty(document, 'readyState', { value: 'complete' })
      
      // 模拟performance.getEntriesByType返回navigation条目
      const mockNavigation = {
        domainLookupEnd: 100,
        domainLookupStart: 50,
        connectEnd: 150,
        connectStart: 100,
        responseEnd: 300,
        requestStart: 200,
        domContentLoadedEventEnd: 400,
        domContentLoadedEventStart: 350,
        loadEventEnd: 500,
        fetchStart: 0,
        responseStart: 250
      }
      
      mockPerformance.getEntriesByType.mockReturnValue([mockNavigation])
      
      // 手动触发页面加载计算
      performanceMonitor.calculatePageLoad()
      
      const report = performanceMonitor.getReport()
      
      expect(report.pageLoad).toBeDefined()
      expect(report.pageLoad.dns).toBe(50)
      expect(report.pageLoad.tcp).toBe(50)
      expect(report.pageLoad.request).toBe(100)
      expect(report.pageLoad.dom).toBe(50)
      expect(report.pageLoad.total).toBe(500)
      expect(report.pageLoad.whiteScreen).toBe(250)
    })

    it('应该处理没有navigation条目的情况', () => {
      performanceMonitor.start()
      
      // 模拟没有navigation条目
      mockPerformance.getEntriesByType.mockReturnValue([])
      
      // 手动触发页面加载计算
      performanceMonitor.calculatePageLoad()
      
      const report = performanceMonitor.getReport()
      
      expect(report.pageLoad).toBeNull()
    })
  })



  it('应该记录API请求时间', () => {
    performanceMonitor.start()
    
    const startTime = performance.now()
    const endTime = startTime + 200
    
    mockPerformance.now.mockReturnValueOnce(startTime).mockReturnValueOnce(endTime)
    
    performanceMonitor.recordApiRequest('/api/test', 'GET', 200, startTime)
    performanceMonitor.recordApiRequest('/api/test', 'GET', 200, endTime)
    
    const report = performanceMonitor.getReport()
    
    expect(report.apiRequests).toHaveLength(2)
    expect(report.avgApiTime).toBe(200)
  })

  it('应该记录组件渲染时间', () => {
    performanceMonitor.start()
    
    const startTime = performance.now()
    const endTime = startTime + 50
    
    mockPerformance.now.mockReturnValueOnce(startTime).mockReturnValueOnce(endTime)
    
    performanceMonitor.recordComponentRender('TestComponent', 50)
    performanceMonitor.recordComponentRender('TestComponent', 100)
    
    const report = performanceMonitor.getReport()
    
    expect(report.componentRenders).toHaveLength(2)
    expect(report.avgComponentRenderTime).toBe(75)
  })

  describe('Web Vitals指标', () => {
    it('应该记录首次内容绘制时间', () => {
      performanceMonitor.start()
      
      // 模拟FCP观察者回调
      const mockEntries = [{ startTime: 1000 }]
      const mockCallback = mockPerformanceObserver.mock.calls[0][0]
      
      // 调用回调函数
      mockCallback({ getEntries: () => mockEntries })
      
      const report = performanceMonitor.getReport()
      
      expect(report.firstContentfulPaint).toBe(1000)
    })

    it('应该记录最大内容绘制时间', () => {
      performanceMonitor.start()
      
      // 模拟LCP观察者回调
      const mockEntries = [{ startTime: 2000 }, { startTime: 2500 }]
      const mockCallback = mockPerformanceObserver.mock.calls[1][0]
      
      // 调用回调函数
      mockCallback({ getEntries: () => mockEntries })
      
      const report = performanceMonitor.getReport()
      
      expect(report.largestContentfulPaint).toBe(2500)
    })

    it('应该记录首次输入延迟', () => {
      performanceMonitor.start()
      
      // 模拟FID观察者回调
      const mockEntries = [{ startTime: 1000, processingStart: 1050 }]
      const mockCallback = mockPerformanceObserver.mock.calls[2][0]
      
      // 调用回调函数
      mockCallback({ getEntries: () => mockEntries })
      
      const report = performanceMonitor.getReport()
      
      expect(report.firstInputDelay).toBe(50)
    })

    it('应该记录累积布局偏移', () => {
      performanceMonitor.start()
      
      // 模拟CLS观察者回调
      const mockEntries = [
        { value: 0.1, hadRecentInput: false },
        { value: 0.2, hadRecentInput: true },
        { value: 0.05, hadRecentInput: false }
      ]
      const mockCallback = mockPerformanceObserver.mock.calls[3][0]
      
      // 调用回调函数
      mockCallback({ getEntries: () => mockEntries })
      
      const report = performanceMonitor.getReport()
      
      expect(report.cumulativeLayoutShift).toBe(0.15)
    })

    it('应该处理空的Web Vitals数据', () => {
      performanceMonitor.start()
      
      // 模拟空条目
      const mockCallback = mockPerformanceObserver.mock.calls[0][0]
      mockCallback({ getEntries: () => [] })
      
      const report = performanceMonitor.getReport()
      
      expect(report.firstContentfulPaint).toBeNull()
    })
  })

  it('应该生成性能报告', () => {
    performanceMonitor.start()
    
    // 模拟页面加载性能
    const mockNavigation = {
      domainLookupEnd: 100,
      domainLookupStart: 50,
      connectEnd: 150,
      connectStart: 100,
      responseEnd: 300,
      requestStart: 200,
      domContentLoadedEventEnd: 400,
      domContentLoadedEventStart: 350,
      loadEventEnd: 500,
      fetchStart: 0,
      responseStart: 250
    }
    mockPerformance.getEntriesByType.mockReturnValue([mockNavigation])
    performanceMonitor.calculatePageLoad()
    
    // 模拟API请求
    performanceMonitor.recordApiRequest('/api/test', 'GET', 200, 100)
    performanceMonitor.recordComponentRender('TestComponent', 50)
    
    const report = performanceMonitor.getReport()
    
    expect(report.pageLoad).toBeDefined()
    expect(report.apiRequests).toHaveLength(1)
    expect(report.componentRenders).toHaveLength(1)
    expect(report.avgApiTime).toBe(100)
    expect(report.avgComponentRenderTime).toBe(50)
  })

  it('应该打印性能报告', () => {
    const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
    
    performanceMonitor.start()
    
    // 模拟一些数据
    performanceMonitor.recordApiRequest('/api/test', 'GET', 200, 100)
    performanceMonitor.recordComponentRender('TestComponent', 50)
    
    performanceMonitor.printReport()
    
    expect(consoleSpy).toHaveBeenCalledWith('[性能监控] 性能报告')
    expect(consoleLogSpy).toHaveBeenCalledWith('API请求总数:', 1)
    expect(consoleLogSpy).toHaveBeenCalledWith('组件渲染总数:', 1)
    expect(consoleGroupEndSpy).toHaveBeenCalled()
    
    consoleSpy.mockRestore()
    consoleLogSpy.mockRestore()
    consoleGroupEndSpy.mockRestore()
  })

  it('应该处理不存在的性能指标', () => {
    // 模拟没有timing信息
    mockPerformance.timing = null
    
    performanceMonitor.start()
    
    const pageLoadTime = performanceMonitor.getPageLoadTime()
    const domLoadTime = performanceMonitor.getDomLoadTime()
    
    expect(pageLoadTime).toBe(0)
    expect(domLoadTime).toBe(0)
  })

  it('应该处理空的Web Vitals数据', () => {
    // 模拟没有Web Vitals条目
    mockPerformance.getEntriesByType.mockReturnValue([])
    
    performanceMonitor.start()
    
    const webVitals = performanceMonitor.getWebVitals()
    
    expect(webVitals.FCP).toBeUndefined()
    expect(webVitals.LCP).toBeUndefined()
    expect(webVitals.FID).toBeUndefined()
    expect(webVitals.CLS).toBeUndefined()
  })

  it('应该在没有启动时返回默认值', () => {
    const pageLoadTime = performanceMonitor.getPageLoadTime()
    const domLoadTime = performanceMonitor.getDomLoadTime()
    const apiStats = performanceMonitor.getApiStats()
    const componentStats = performanceMonitor.getComponentStats()
    const webVitals = performanceMonitor.getWebVitals()
    
    expect(pageLoadTime).toBe(0)
    expect(domLoadTime).toBe(0)
    expect(apiStats).toEqual({})
    expect(componentStats).toEqual({})
    expect(webVitals).toEqual({})
  })
})