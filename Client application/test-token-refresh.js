import axios from 'axios';
import tokenManager from './src/utils/jwt-token-manager.js';

// 配置axios
const api = axios.create({
  baseURL: 'http://localhost:4000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

async function testTokenRefresh() {
  try {
    console.log('测试Token刷新流程...');
    
    // 初始化Token管理器
    tokenManager.init();
    
    // 测试登录
    const loginData = {
      username: 'testuser2',
      password: 'password123'
    };
    
    console.log('发送登录请求...');
    const response = await api.post('/api/users/login', loginData);
    
    console.log('登录响应:', response.data);
    
    if (response.data.success) {
      const { token, refreshToken } = response.data.data;
      
      // 存储Token到Token管理器
      tokenManager.setToken(token);
      tokenManager.setRefreshToken(refreshToken);
      
      console.log('Token已存储到管理器');
      console.log('Token状态:', tokenManager.checkTokenStatus());
      
      // 测试Token刷新
      console.log('\n测试Token刷新...');
      const refreshResponse = await api.post('/api/auth/refresh', {
        refreshToken: tokenManager.getRefreshToken()
      });
      
      console.log('刷新响应:', refreshResponse.data);
      
      if (refreshResponse.data.success) {
        const { accessToken: newToken, refreshToken: newRefreshToken } = refreshResponse.data.data;
        
        // 更新Token管理器
        tokenManager.setToken(newToken);
        if (newRefreshToken) {
          tokenManager.setRefreshToken(newRefreshToken);
        }
        
        console.log('Token刷新成功');
        console.log('新Token状态:', tokenManager.checkTokenStatus());
      } else {
        console.log('Token刷新失败:', refreshResponse.data.message);
      }
    } else {
      console.log('登录失败:', response.data.message);
    }
  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

testTokenRefresh();