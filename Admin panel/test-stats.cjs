const axios = require('axios');
const jwt = require('jsonwebtoken');

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:8100',
  timeout: 10000
});

// 测试登录并获取统计数据
async function testLoginAndStats() {
  try {
    console.log('开始测试管理员登录和获取统计数据...');
    
    // 1. 先登录获取token
    const loginResponse = await api.post('/api/admin/auth/login', {
      username: 'admin',
      password: 'Admin123!'
    });
    
    console.log('登录响应:', loginResponse.data);
    
    if (loginResponse.data.success) {
      const { accessToken } = loginResponse.data.data;
      console.log('登录成功，获取到访问令牌');
      
      // 验证token是否有效
      console.log('验证token有效性...');
      // 使用与TokenManager相同的密钥配置
      const jwtSecrets = (process.env.JWT_SECRETS || 'dev-secret-please-change-to-32-chars-minimum').split(',').map(s => s.trim()).filter(Boolean);
      const decoded = jwt.verify(accessToken, jwtSecrets[0], { algorithms: ['HS256', 'HS512'] });
      console.log('Token解码成功:', decoded);
      
      // 2. 使用token获取统计数据
      const statsResponse = await api.get('/api/stats/system', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      console.log('统计数据响应:', statsResponse.data);
      
      if (statsResponse.data.success) {
        console.log('获取统计数据成功!');
        console.log('总用户数:', statsResponse.data.data.user_stats?.total_users || 0);
        console.log('总费用记录:', statsResponse.data.data.expense_stats?.total_expenses || 0);
        console.log('活跃寝室:', statsResponse.data.data.active_rooms?.length || 0);
      } else {
        console.error('获取统计数据失败:', statsResponse.data.message);
      }
    } else {
      console.error('登录失败:', loginResponse.data.message);
    }
  } catch (error) {
    console.error('请求失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 执行测试
testLoginAndStats();