const axios = require('axios');

async function testAdminLogin() {
  try {
    console.log('测试管理员登录功能...');
    
    // 发送登录请求
    const response = await axios.post('http://localhost:4000/api/admin/auth/login', {
      username: 'admin',
      password: 'Admin123!'
    });
    
    console.log('登录响应:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('✅ 管理员登录成功!');
      console.log('用户信息:', response.data.data.user);
      console.log('访问令牌:', response.data.data.accessToken.substring(0, 20) + '...');
    } else {
      console.log('❌ 管理员登录失败:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 登录请求失败:', error.response?.data || error.message);
  }
}

testAdminLogin();