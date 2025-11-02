<template>
  <div class="home">
    <div class="hero-section">
      <h1 class="hero-title">寝室费用分摊记账系统</h1>
      <p class="hero-description">轻松管理寝室费用，智能分摊账单</p>
      
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">💰</div>
          <h3>费用管理</h3>
          <p>记录和管理所有寝室费用</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>智能分摊</h3>
          <p>自动计算每个人的分摊金额</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📱</div>
          <h3>扫码支付</h3>
          <p>支持扫码支付，方便快捷</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📈</div>
          <h3>统计分析</h3>
          <p>查看费用趋势和统计报告</p>
        </div>
      </div>

      <div class="cta-section">
        <button class="primary-btn" @click="navigateToExpenses">开始使用</button>
        <button class="secondary-btn" @click="showGuide">使用指南</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const navigateToExpenses = () => {
  // 这里可以跳转到费用管理页面
  console.log('跳转到费用管理')
}

const showGuide = () => {
  alert('使用指南功能开发中...')
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-section {
  text-align: center;
  color: white;
  max-width: 1200px;
  padding: 2rem;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.hero-description {
  font-size: 1.5rem;
  margin-bottom: 3rem;
  opacity: 0.9;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.feature-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.feature-card p {
  opacity: 0.8;
  line-height: 1.6;
}

.cta-section {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.primary-btn, .secondary-btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.primary-btn {
  background: #ff6b6b;
  color: white;
}

.primary-btn:hover {
  background: #ff5252;
  transform: translateY(-2px);
}

.secondary-btn {
  background: transparent;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-description {
    font-size: 1.2rem;
  }
  
  .feature-grid {
    grid-template-columns: 1fr;
  }
}
</style>