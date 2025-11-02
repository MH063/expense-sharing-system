<template>
  <div class="forbidden">
    <div class="content">
      <div class="icon">🚫</div>
      <h1>无访问权限</h1>
      <p>抱歉，您没有权限访问当前页面。如果需要访问，请联系管理员获取相应权限。</p>
      <div class="actions">
        <button class="btn" @click="goBack">返回上一页</button>
        <button class="btn" @click="goHome">返回首页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.back()
}

const goHome = () => {
  router.push({ name: 'Home' })
}
</script>

<style scoped>
.forbidden {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  padding: 2rem;
}

.content {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 2.5rem;
  max-width: 520px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #2c3e50;
}

p {
  color: #606266;
  line-height: 1.8;
  margin-bottom: 1.5rem;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(118, 75, 162, 0.2);
}

@media (max-width: 480px) {
  .content {
    padding: 2rem;
  }

  .btn {
    width: 100%;
  }
}
</style>
