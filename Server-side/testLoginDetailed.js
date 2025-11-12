const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:4000/api';

async function testLoginDetailed(username, password) {
  try {
    console.log(`\n========== 测试用户: ${username} ==========`);
    console.log('请求URL:', `${BASE_URL}/auth/login`);
    console.log('请求数据:', { username, password });
    
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username,
      password
    });
    
    console.log('登录成功!');
    console.log('响应状态码:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    // 检查响应格式
    if (response.data.success && response.data.data) {
      console.log('\n响应格式正确!');
      console.log('- success字段存在:', response.data.success);
      console.log('- data字段存在:', !!response.data.data);
      
      if (response.data.data.user) {
        console.log('- 用户信息存在:', !!response.data.data.user);
        console.log('- 用户ID:', response.data.data.user.id);
        console.log('- 用户名:', response.data.data.user.username);
        console.log('- 角色:', response.data.data.user.role);
      }
      
      if (response.data.data.accessToken) {
        console.log('- 访问令牌存在:', !!response.data.data.accessToken);
        console.log('- 访问令牌前缀:', response.data.data.accessToken.substring(0, 20) + '...');
        return response.data.data.accessToken;
      }
    } else {
      console.log('\n响应格式不正确!');
    }
  } catch (error) {
    console.error('登录失败:', error.message);
    console.error('错误类型:', error.constructor.name);
    
    if (error.response) {
      console.error('响应状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('请求已发送但没有收到响应');
    } else {
      console.error('请求设置出错:', error.message);
    }
  }
  
  return null;
}

async function testAllUsers() {
  const TEST_USERS = [
    { username: 'sysadmin', password: 'SysAdmin123!@#', role: '系统管理员' },
    { username: 'admin001', password: 'Admin123!@#', role: '管理员' },
    { username: 'dormleader001', password: 'DormLeader123!@#', role: '寝室长' },
    { username: 'user001', password: 'User123!@#', role: '普通用户' },
    { username: 'payer001', password: 'Payer123!@#', role: '缴费人' }
  ];
  
  for (const user of TEST_USERS) {
    await testLoginDetailed(user.username, user.password);
  }
}

testAllUsers();