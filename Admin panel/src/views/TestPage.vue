<template>
  <div class="test-page">
    <h1>测试页面</h1>
    <p>这是一个用于测试错误处理的页面</p>
    <el-button @click="triggerError" type="danger">触发错误</el-button>
  </div>
</template>

<script setup>
import { ElButton } from 'element-plus'

const triggerError = () => {
  throw new Error('这是一个测试错误')
}
</script>

<style scoped>
.test-page {
  padding: 20px;
}
</style>