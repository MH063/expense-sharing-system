import axios from 'axios';

// 配置axios
const api = axios.create({
  baseURL: 'http://localhost:4000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

async function testLogin() {
  try {
    console.log('开始测试登录功能...');
    
    // 测试登录
    const loginData = {
      username: 'testuser2',
      password: 'password123'
    };
    
    console.log('发送登录请求...');
    const response = await api.post('/api/auth/login', loginData);
    
    console.log('登录响应:', response.data);
    
    if (response.data.success) {
      console.log('✅ 登录成功!');
      console.log('Token:', response.data.data.accessToken);
      
      // 测试获取用户信息
      console.log('\n测试获取用户信息...');
      const userResponse = await api.get('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${response.data.data.accessToken}`
        }
      });
      
      console.log('用户信息:', userResponse.data);
      
      if (userResponse.data.success) {
        console.log('✅ 获取用户信息成功!');
      } else {
        console.log('❌ 获取用户信息失败');
      }
    } else {
      console.log('❌ 登录失败:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

testLogin();