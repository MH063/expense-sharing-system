const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:4000/api';
const TEST_USER = { username: 'sysadmin', password: 'SysAdmin123!@#', role: '系统管理员' };

/**
 * 用户登录获取token
 */
async function loginUser(username, password) {
  try {
    console.log(`尝试登录用户: ${username}`);
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username,
      password
    }, {
      timeout: 30000 // 30秒超时
    });
    
    console.log('登录响应:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.success && response.data.data && response.data.data.accessToken) {
      return response.data.data.accessToken;
    }
    throw new Error('登录响应格式不正确');
  } catch (error) {
    console.error(`用户 ${username} 登录失败:`, error.message);
    if (error.response) {
      console.error(`响应状态码: ${error.response.status}`);
      console.error(`响应数据:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('请求已发送但没有收到响应');
    } else {
      console.error('请求设置错误:', error);
    }
    return null;
  }
}

// 测试单个用户
async function testSingleUser() {
  console.log(`测试用户: ${TEST_USER.username} (${TEST_USER.role})`);
  
  // 登录获取token
  const token = await loginUser(TEST_USER.username, TEST_USER.password);
  if (!token) {
    console.log(`用户 ${TEST_USER.username} 登录失败`);
    return;
  }
  
  console.log(`用户 ${TEST_USER.username} 登录成功`);
  console.log(`Token: ${token.substring(0, 50)}...`);
}

testSingleUser();