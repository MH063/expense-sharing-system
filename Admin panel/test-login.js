import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:8100',
  timeout: 10000
});

// 测试登录功能
async function testLogin() {
  try {
    console.log('开始测试管理员登录功能...');
    
    // 发送登录请求
    const response = await api.post('/api/admin/auth/login', {
      username: 'admin',
      password: 'Admin123!'
    });
    
    console.log('登录响应:', response.data);
    
    if (response.data.success) {
      console.log('登录成功!');
      console.log('用户信息:', response.data.data.user);
      console.log('访问令牌:', response.data.data.accessToken);
    } else {
      console.error('登录失败:', response.data.message);
    }
  } catch (error) {
    console.error('登录请求失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 执行测试
testLogin();