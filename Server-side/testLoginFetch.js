// 测试配置
const BASE_URL = 'http://localhost:4000/api';

async function testLoginWithFetch(username, password) {
  try {
    console.log(`\n========== 测试用户: ${username} ==========`);
    console.log('请求URL:', `${BASE_URL}/auth/login`);
    console.log('请求数据:', { username, password });
    
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password
      })
    });
    
    console.log('响应状态码:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP错误! 状态码: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('登录成功!');
    console.log('响应数据:', JSON.stringify(data, null, 2));
    
    // 检查响应格式
    if (data.success && data.data) {
      console.log('\n响应格式正确!');
      console.log('- success字段存在:', data.success);
      console.log('- data字段存在:', !!data.data);
      
      if (data.data.user) {
        console.log('- 用户信息存在:', !!data.data.user);
        console.log('- 用户ID:', data.data.user.id);
        console.log('- 用户名:', data.data.user.username);
        console.log('- 角色:', data.data.user.role);
      }
      
      if (data.data.accessToken) {
        console.log('- 访问令牌存在:', !!data.data.accessToken);
        console.log('- 访问令牌前缀:', data.data.accessToken.substring(0, 20) + '...');
        return data.data.accessToken;
      }
    } else {
      console.log('\n响应格式不正确!');
    }
  } catch (error) {
    console.error('登录失败:', error.message);
    console.error('错误类型:', error.constructor.name);
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
    await testLoginWithFetch(user.username, user.password);
  }
}

testAllUsers();