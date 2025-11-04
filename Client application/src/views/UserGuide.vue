<template>
  <div class="user-guide">
    <div class="guide-container">
      <div class="guide-header">
        <h1 class="guide-title">使用指南</h1>
        <p class="guide-subtitle">轻松掌握寝室费用分摊记账系统的使用方法</p>
      </div>

      <div class="guide-content">
        <!-- 快速开始部分 -->
        <section class="guide-section">
          <h2 class="section-title">
            <span class="icon">🚀</span>
            快速开始
          </h2>
          <div class="step-list">
            <div class="step-item">
              <div class="step-number">1</div>
              <div class="step-content">
                <h3>注册账号</h3>
                <p>点击首页"开始使用"按钮，进入登录页面，选择"注册新账号"，填写基本信息完成注册。</p>
              </div>
            </div>
            <div class="step-item">
              <div class="step-number">2</div>
              <div class="step-content">
                <h3>创建或加入寝室</h3>
                <p>登录后，您可以创建一个新的寝室或通过邀请码加入已有寝室。</p>
              </div>
            </div>
            <div class="step-item">
              <div class="step-number">3</div>
              <div class="step-content">
                <h3>记录费用</h3>
                <p>在费用管理页面添加各种费用支出，系统会自动计算每个人的分摊金额。</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 功能介绍部分 -->
        <section class="guide-section">
          <h2 class="section-title">
            <span class="icon">📋</span>
            功能介绍
          </h2>
          <div class="feature-grid">
            <div class="feature-item">
              <div class="feature-icon">💰</div>
              <h3>费用管理</h3>
              <p>记录和管理寝室日常费用，包括餐饮、日用品、水电费等各种支出。支持添加费用详情、分类和日期。</p>
            </div>
            <div class="feature-item">
              <div class="feature-icon">📊</div>
              <h3>智能分摊</h3>
              <p>系统根据寝室成员自动计算每个人的分摊金额，支持平均分摊和自定义比例分摊。</p>
            </div>
            <div class="feature-item">
              <div class="feature-icon">📱</div>
              <h3>扫码支付</h3>
              <p>生成个人收款二维码，其他成员扫码即可完成支付，方便快捷，避免现金交易。</p>
            </div>
            <div class="feature-item">
              <div class="feature-icon">📈</div>
              <h3>统计分析</h3>
              <p>查看费用趋势图表、分类统计和成员消费对比，帮助寝室更好地管理开支。</p>
            </div>
            <div class="feature-item">
              <div class="feature-icon">🔔</div>
              <h3>通知提醒</h3>
              <p>费用记录、支付提醒和账单通知，确保所有成员及时了解寝室财务状况。</p>
            </div>
            <div class="feature-item">
              <div class="feature-icon">👥</div>
              <h3>成员管理</h3>
              <p>管理寝室成员信息，设置权限，邀请新成员加入，维护寝室成员关系。</p>
            </div>
          </div>
        </section>

        <!-- 常见问题部分 -->
        <section class="guide-section">
          <h2 class="section-title">
            <span class="icon">❓</span>
            常见问题
          </h2>
          <div class="faq-list">
            <div class="faq-item" v-for="(faq, index) in faqList" :key="index">
              <div class="faq-question" @click="toggleFaq(index)">
                {{ faq.question }}
                <span class="faq-toggle" :class="{ active: faq.isOpen }">▼</span>
              </div>
              <div class="faq-answer" v-show="faq.isOpen">
                {{ faq.answer }}
              </div>
            </div>
          </div>
        </section>

        <!-- 联系支持部分 -->
        <section class="guide-section">
          <h2 class="section-title">
            <span class="icon">💬</span>
            联系支持
          </h2>
          <div class="support-content">
            <p>如果您在使用过程中遇到任何问题或有改进建议，欢迎随时联系我们：</p>
            <div class="contact-methods">
              <div class="contact-item">
                <span class="contact-icon">📧</span>
                <span>邮箱：support@expense-sharing.com</span>
              </div>
              <div class="contact-item">
                <span class="contact-icon">💬</span>
                <span>在线客服：工作日 9:00-18:00</span>
              </div>
              <div class="contact-item">
                <span class="contact-icon">📱</span>
                <span>QQ群：123456789</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="guide-footer">
        <button class="back-btn" @click="goBack">返回首页</button>
        <button class="start-btn" @click="startUsing">开始使用</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 常见问题数据
const faqList = ref([
  {
    question: '如何添加新的费用记录？',
    answer: '登录后进入"费用管理"页面，点击"添加费用"按钮，填写费用详情、金额、分类和日期，然后保存即可。',
    isOpen: false
  },
  {
    question: '如何邀请室友加入寝室？',
    answer: '在"寝室管理"页面，点击"邀请成员"按钮，系统会生成邀请码，将邀请码分享给室友即可。',
    isOpen: false
  },
  {
    question: '如何设置不同的分摊方式？',
    answer: '在添加费用时，可以选择"平均分摊"或"自定义分摊"。自定义分摊允许您为每个成员设置不同的分摊比例。',
    isOpen: false
  },
  {
    question: '如何查看我的支付记录？',
    answer: '在"账单管理"页面，可以查看所有账单详情和支付状态。点击"支付记录"可以查看历史支付记录。',
    isOpen: false
  },
  {
    question: '忘记密码怎么办？',
    answer: '在登录页面点击"忘记密码"，输入注册邮箱，系统会发送重置密码链接到您的邮箱。',
    isOpen: false
  }
])

/**
 * 切换FAQ展开/收起状态
 */
const toggleFaq = (index) => {
  faqList.value[index].isOpen = !faqList.value[index].isOpen
}

/**
 * 返回首页
 */
const goBack = () => {
  router.push('/')
}

/**
 * 跳转到开始使用页面
 */
const startUsing = () => {
  router.push('/auth/login')
}
</script>

<style scoped>
.user-guide {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 0;
}

.guide-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 1rem;
}

.guide-header {
  text-align: center;
  color: white;
  margin-bottom: 3rem;
}

.guide-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.guide-subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
}

.guide-content {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.guide-section {
  margin-bottom: 3rem;
}

.guide-section:last-child {
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #667eea;
}

.section-title .icon {
  margin-right: 0.5rem;
  font-size: 1.5rem;
}

/* 步骤列表样式 */
.step-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step-item {
  display: flex;
  align-items: flex-start;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: #667eea;
  color: white;
  border-radius: 50%;
  font-weight: 600;
  margin-right: 1rem;
  flex-shrink: 0;
}

.step-content h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.step-content p {
  color: #666;
  line-height: 1.6;
}

/* 功能网格样式 */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.feature-item {
  background: #f8f9fa;
  border-radius: 0.5rem;
  padding: 1.5rem;
  transition: transform 0.3s ease;
}

.feature-item:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.feature-item h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.feature-item p {
  color: #666;
  line-height: 1.6;
}

/* FAQ样式 */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.faq-item {
  border: 1px solid #e9ecef;
  border-radius: 0.5rem;
  overflow: hidden;
}

.faq-question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.faq-question:hover {
  background: #e9ecef;
}

.faq-toggle {
  transition: transform 0.3s ease;
}

.faq-toggle.active {
  transform: rotate(180deg);
}

.faq-answer {
  padding: 1rem;
  color: #666;
  line-height: 1.6;
  background: white;
  border-top: 1px solid #e9ecef;
}

/* 联系支持样式 */
.support-content p {
  font-size: 1.1rem;
  color: #333;
  margin-bottom: 1.5rem;
}

.contact-methods {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.contact-item {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  color: #555;
}

.contact-icon {
  margin-right: 1rem;
  font-size: 1.2rem;
}

/* 底部按钮样式 */
.guide-footer {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.back-btn, .start-btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-btn {
  background: transparent;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

.start-btn {
  background: #ff6b6b;
  color: white;
}

.start-btn:hover {
  background: #ff5252;
  transform: translateY(-2px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .guide-title {
    font-size: 2rem;
  }
  
  .guide-subtitle {
    font-size: 1rem;
  }
  
  .guide-content {
    padding: 1.5rem;
  }
  
  .section-title {
    font-size: 1.5rem;
  }
  
  .feature-grid {
    grid-template-columns: 1fr;
  }
  
  .guide-footer {
    flex-direction: column;
    align-items: center;
  }
  
  .back-btn, .start-btn {
    width: 100%;
    max-width: 300px;
  }
}
</style>