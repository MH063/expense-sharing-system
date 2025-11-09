/**
 * 性能监控工具
 * 用于监控和分析前端性能指标
 */

// 性能指标收集器
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      // 页面加载时间
      pageLoad: null,
      // 首次内容绘制
      firstContentfulPaint: null,
      // 最大内容绘制
      largestContentfulPaint: null,
      // 首次输入延迟
      firstInputDelay: null,
      // 累积布局偏移
      cumulativeLayoutShift: null,
      // API请求时间
      apiRequests: [],
      // 组件渲染时间
      componentRenders: []
    }
    
    this.observers = []
    this.isMonitoring = false
  }

  /**
   * 开始性能监控
   */
  start() {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    console.log('[性能监控] 开始监控')
    
    // 监控页面加载性能
    this.observePageLoad()
    
    // 监控Web Vitals指标
    this.observeWebVitals()
    
    // 监控API请求性能
    this.interceptFetch()
  }

  /**
   * 停止性能监控
   */
  stop() {
    if (!this.isMonitoring) return
    
    this.isMonitoring = false
    
    // 断开所有观察者
    this.observers.forEach(observer => {
      observer.disconnect()
    })
    this.observers = []
    
    console.log('[性能监控] 停止监控')
  }

  /**
   * 监控页面加载性能
   */
  observePageLoad() {
    if (document.readyState === 'complete') {
      this.calculatePageLoad()
    } else {
      window.addEventListener('load', () => {
        this.calculatePageLoad()
      })
    }
  }

  /**
   * 计算页面加载时间
   */
  calculatePageLoad() {
    const navigation = performance.getEntriesByType('navigation')[0]
    if (navigation) {
      this.metrics.pageLoad = {
        // DNS查询时间
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        // TCP连接时间
        tcp: navigation.connectEnd - navigation.connectStart,
        // 请求响应时间
        request: navigation.responseEnd - navigation.requestStart,
        // DOM解析时间
        dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        // 页面加载总时间
        total: navigation.loadEventEnd - navigation.fetchStart,
        // 白屏时间
        whiteScreen: navigation.responseStart - navigation.fetchStart
      }
      
      console.log('[性能监控] 页面加载性能:', this.metrics.pageLoad)
    }
  }

  /**
   * 监控Web Vitals指标
   */
  observeWebVitals() {
    // 监控FCP
    this.observeFirstContentfulPaint()
    
    // 监控LCP
    this.observeLargestContentfulPaint()
    
    // 监控FID
    this.observeFirstInputDelay()
    
    // 监控CLS
    this.observeCumulativeLayoutShift()
  }

  /**
   * 监控首次内容绘制
   */
  observeFirstContentfulPaint() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      if (entries.length > 0) {
        this.metrics.firstContentfulPaint = entries[0].startTime
        console.log('[性能监控] FCP:', this.metrics.firstContentfulPaint)
      }
    })
    
    observer.observe({ type: 'paint', buffered: true })
    this.observers.push(observer)
  }

  /**
   * 监控最大内容绘制
   */
  observeLargestContentfulPaint() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1]
        this.metrics.largestContentfulPaint = lastEntry.startTime
        console.log('[性能监控] LCP:', this.metrics.largestContentfulPaint)
      }
    })
    
    observer.observe({ type: 'largest-contentful-paint', buffered: true })
    this.observers.push(observer)
  }

  /**
   * 监控首次输入延迟
   */
  observeFirstInputDelay() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      if (entries.length > 0) {
        this.metrics.firstInputDelay = entries[0].processingStart - entries[0].startTime
        console.log('[性能监控] FID:', this.metrics.firstInputDelay)
      }
    })
    
    observer.observe({ type: 'first-input', buffered: true })
    this.observers.push(observer)
  }

  /**
   * 监控累积布局偏移
   */
  observeCumulativeLayoutShift() {
    let clsValue = 0
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      }
      
      this.metrics.cumulativeLayoutShift = clsValue
      console.log('[性能监控] CLS:', this.metrics.cumulativeLayoutShift)
    })
    
    observer.observe({ type: 'layout-shift', buffered: true })
    this.observers.push(observer)
  }

  /**
   * 拦截fetch请求，监控API性能
   */
  interceptFetch() {
    const originalFetch = window.fetch
    
    window.fetch = async (...args) => {
      const startTime = performance.now()
      const url = args[0]
      
      try {
        const response = await originalFetch(...args)
        const endTime = performance.now()
        const duration = endTime - startTime
        
        // 记录API请求性能
        this.metrics.apiRequests.push({
          url: typeof url === 'string' ? url : url.url,
          method: args[1]?.method || 'GET',
          status: response.status,
          duration,
          timestamp: new Date().toISOString()
        })
        
        console.log(`[性能监控] API请求 ${args[1]?.method || 'GET'} ${typeof url === 'string' ? url : url.url}: ${duration.toFixed(2)}ms`)
        
        return response
      } catch (error) {
        const endTime = performance.now()
        const duration = endTime - startTime
        
        // 记录API请求错误
        this.metrics.apiRequests.push({
          url: typeof url === 'string' ? url : url.url,
          method: args[1]?.method || 'GET',
          status: 0,
          duration,
          error: error.message,
          timestamp: new Date().toISOString()
        })
        
        console.error(`[性能监控] API请求失败 ${args[1]?.method || 'GET'} ${typeof url === 'string' ? url : url.url}: ${duration.toFixed(2)}ms`, error)
        
        throw error
      }
    }
  }

  /**
   * 记录组件渲染时间
   * @param {string} componentName 组件名称
   * @param {number} renderTime 渲染时间(ms)
   */
  recordComponentRender(componentName, renderTime) {
    this.metrics.componentRenders.push({
      componentName,
      renderTime,
      timestamp: new Date().toISOString()
    })
    
    console.log(`[性能监控] 组件渲染 ${componentName}: ${renderTime.toFixed(2)}ms`)
  }

  /**
   * 获取性能报告
   * @returns {Object} 性能报告
   */
  getReport() {
    return {
      ...this.metrics,
      // 计算API请求平均时间
      avgApiTime: this.metrics.apiRequests.length > 0
        ? this.metrics.apiRequests.reduce((sum, req) => sum + req.duration, 0) / this.metrics.apiRequests.length
        : 0,
      // 计算组件渲染平均时间
      avgComponentRenderTime: this.metrics.componentRenders.length > 0
        ? this.metrics.componentRenders.reduce((sum, comp) => sum + comp.renderTime, 0) / this.metrics.componentRenders.length
        : 0
    }
  }

  /**
   * 打印性能报告
   */
  printReport() {
    const report = this.getReport()
    
    console.group('[性能监控] 性能报告')
    
    if (report.pageLoad) {
      console.log('页面加载性能:', report.pageLoad)
    }
    
    if (report.firstContentfulPaint) {
      console.log('首次内容绘制(FCP):', report.firstContentfulPaint.toFixed(2) + 'ms')
    }
    
    if (report.largestContentfulPaint) {
      console.log('最大内容绘制(LCP):', report.largestContentfulPaint.toFixed(2) + 'ms')
    }
    
    if (report.firstInputDelay) {
      console.log('首次输入延迟(FID):', report.firstInputDelay.toFixed(2) + 'ms')
    }
    
    if (report.cumulativeLayoutShift) {
      console.log('累积布局偏移(CLS):', report.cumulativeLayoutShift)
    }
    
    if (report.apiRequests.length > 0) {
      console.log('API请求总数:', report.apiRequests.length)
      console.log('API平均响应时间:', report.avgApiTime.toFixed(2) + 'ms')
      
      // 找出最慢的API请求
      const slowestApi = report.apiRequests.reduce((max, req) => req.duration > max.duration ? req : max)
      console.log('最慢API请求:', `${slowestApi.method} ${slowestApi.url}: ${slowestApi.duration.toFixed(2)}ms`)
    }
    
    if (report.componentRenders.length > 0) {
      console.log('组件渲染总数:', report.componentRenders.length)
      console.log('组件平均渲染时间:', report.avgComponentRenderTime.toFixed(2) + 'ms')
      
      // 找出渲染最慢的组件
      const slowestComponent = report.componentRenders.reduce((max, comp) => comp.renderTime > max.renderTime ? comp : max)
      console.log('渲染最慢组件:', `${slowestComponent.componentName}: ${slowestComponent.renderTime.toFixed(2)}ms`)
    }
    
    console.groupEnd()
  }
}

// 创建全局性能监控实例
const performanceMonitor = new PerformanceMonitor()

// 导出性能监控工具
export default performanceMonitor

// 导出组件渲染性能监控HOC
export function withPerformanceMonitoring(WrappedComponent, componentName) {
  return {
    ...WrappedComponent,
    name: componentName || WrappedComponent.name || 'PerformanceMonitoredComponent',
    mounted() {
      const startTime = performance.now()
      
      // 调用原始mounted钩子
      if (WrappedComponent.mounted) {
        WrappedComponent.mounted.call(this)
      }
      
      // 记录渲染时间
      const endTime = performance.now()
      const renderTime = endTime - startTime
      performanceMonitor.recordComponentRender(componentName || WrappedComponent.name, renderTime)
    }
  }
}