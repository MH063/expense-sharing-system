<template>
  <div v-if="loading" class="global-loading-overlay">
    <el-loading
      :lock="true"
      :text="text"
      background="rgba(0, 0, 0, 0.7)"
    />
  </div>
</template>

<script setup>
import { ElLoading } from 'element-plus'

// 定义props
const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: '加载中...'
  }
})

// 全局加载状态管理
const loadingState = {
  count: 0,
  instance: null,
  
  show(text = '加载中...') {
    this.count++
    
    if (!this.instance) {
      this.instance = ElLoading.service({
        lock: true,
        text,
        background: 'rgba(0, 0, 0, 0.7)',
        customClass: 'global-loading'
      })
    } else {
      // 更新加载文本
      this.instance.setText(text)
    }
  },
  
  hide() {
    this.count = Math.max(0, this.count - 1)
    
    if (this.count === 0 && this.instance) {
      this.instance.close()
      this.instance = null
    }
  },
  
  // 强制关闭所有加载状态
  forceClose() {
    this.count = 0
    if (this.instance) {
      this.instance.close()
      this.instance = null
    }
  }
}

// 导出全局加载状态管理对象
export { loadingState }
</script>

<style scoped>
.global-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
}
</style>