/**
 * 图片懒加载指令
 * 用于优化图片加载性能
 */

import { createApp } from 'vue'

// 创建一个观察者实例，用于懒加载
const createLazyLoadObserver = () => {
  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // 如果元素进入视口
      if (entry.isIntersecting) {
        const img = entry.target
        const src = img.dataset.src
        
        if (src) {
          // 设置图片src
          img.src = src
          
          // 加载完成后移除data-src属性
          img.onload = () => {
            img.removeAttribute('data-src')
            // 添加加载完成的样式
            img.classList.add('lazy-loaded')
          }
          
          // 停止观察该元素
          lazyLoadObserver.unobserve(img)
        }
      }
    })
  }, {
    // 元素进入视口前100px开始加载
    rootMargin: '100px'
  })
}

// 创建全局观察者实例
const lazyLoadObserver = createLazyLoadObserver()

/**
 * v-lazy 指令
 * 用法: <img v-lazy="imageUrl" />
 */
const lazyDirective = {
  mounted(el, binding) {
    // 保存原始图片URL到data-src属性
    el.dataset.src = binding.value
    
    // 设置默认占位图
    el.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4='
    
    // 添加加载中的样式
    el.classList.add('lazy-loading')
    
    // 开始观察该元素
    lazyLoadObserver.observe(el)
  },
  
  updated(el, binding) {
    // 如果图片URL发生变化，更新data-src
    if (binding.value !== el.dataset.src) {
      el.dataset.src = binding.value
      
      // 如果图片已经加载过，重新加载
      if (el.src && !el.src.includes('data:image/svg+xml')) {
        el.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4='
        el.classList.remove('lazy-loaded')
        el.classList.add('lazy-loading')
        
        // 重新观察该元素
        lazyLoadObserver.observe(el)
      }
    }
  },
  
  unmounted(el) {
    // 停止观察该元素
    lazyLoadObserver.unobserve(el)
  }
}

/**
 * 图片预加载工具
 */
export const preloadImages = (urls) => {
  urls.forEach(url => {
    const img = new Image()
    img.src = url
  })
}

/**
 * 批量懒加载工具
 * 用于处理动态生成的图片列表
 */
export const batchLazyLoad = (selector = '[data-src]') => {
  const elements = document.querySelectorAll(selector)
  elements.forEach(el => {
    if (!el.src || el.src.includes('data:image/svg+xml')) {
      lazyLoadObserver.observe(el)
    }
  })
}

// 导出指令
export default lazyDirective

// 导出安装函数，用于全局注册
export function install(app) {
  app.directive('lazy', lazyDirective)
}