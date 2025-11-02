<template>
  <div class="auth-layout">
    <!-- 认证页面内容 -->
    <main class="auth-main">
      <router-view />
    </main>
    
    <!-- 简单页脚 -->
    <footer class="auth-footer">
      <p>&copy; 2023 寝室记账系统. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup>
// 认证布局不需要额外的逻辑
</script>

<style scoped>
.auth-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f8f9fa;
}

.auth-main {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem;
}

.auth-footer {
  padding: 1.5rem 0;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
  background-color: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.auth-footer p {
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .auth-main {
    padding: 1rem 0.5rem;
  }
}
</style>