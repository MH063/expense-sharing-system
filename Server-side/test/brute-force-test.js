const axios = require('axios');

// 测试暴力破解防护功能
async function testBruteForceProtection() {
  const baseURL = 'http://localhost:3000/api/auth';
  const username = 'testuser';
  const wrongPassword = 'wrongpassword';
  
  console.log('开始测试暴力破解防护功能...');
  
  // 进行多次失败登录尝试
  for (let i = 1; i <= 10; i++) {
    try {
      console.log(`第 ${i} 次登录尝试...`);
      const response = await axios.post(`${baseURL}/login`, {
        username: username,
        password: wrongPassword
      });
      
      console.log(`登录成功:`, response.data);
    } catch (error) {
      console.log(`登录失败 (${i}):`, error.response?.data || error.message);
      
      // 检查是否被封锁
      if (error.response?.status === 429) {
        console.log('检测到暴力破解防护生效，请求被限制');
        break;
      }
    }
    
    // 等待一段时间再进行下一次尝试
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('暴力破解防护测试完成');
}

// 运行测试
testBruteForceProtection().catch(console.error);