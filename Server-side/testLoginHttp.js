const http = require('http');

// 测试配置
const BASE_URL = 'http://localhost:4000/api';

function testLoginWithHttp(username, password) {
  return new Promise((resolve, reject) => {
    console.log(`\n========== 测试用户: ${username} ==========`);
    console.log('请求URL:', `${BASE_URL}/auth/login`);
    console.log('请求数据:', { username, password });
    
    const postData = JSON.stringify({
      username,
      password
    });
    
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      console.log('响应状态码:', res.statusCode);
      console.log('响应头:', res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log('登录成功!');
          console.log('响应数据:', JSON.stringify(jsonData, null, 2));
          
          // 检查响应格式
          if (jsonData.success && jsonData.data) {
            console.log('\n响应格式正确!');
            console.log('- success字段存在:', jsonData.success);
            console.log('- data字段存在:', !!jsonData.data);
            
            if (jsonData.data.user) {
              console.log('- 用户信息存在:', !!jsonData.data.user);
              console.log('- 用户ID:', jsonData.data.user.id);
              console.log('- 用户名:', jsonData.data.user.username);
              console.log('- 角色:', jsonData.data.user.role);
            }
            
            if (jsonData.data.accessToken) {
              console.log('- 访问令牌存在:', !!jsonData.data.accessToken);
              console.log('- 访问令牌前缀:', jsonData.data.accessToken.substring(0, 20) + '...');
              resolve(jsonData.data.accessToken);
              return;
            }
          } else {
            console.log('\n响应格式不正确!');
          }
          resolve(null);
        } catch (error) {
          console.error('解析响应数据失败:', error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('登录失败:', error.message);
      console.error('错误类型:', error.constructor.name);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
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
    try {
      await testLoginWithHttp(user.username, user.password);
    } catch (error) {
      console.error('测试用户', user.username, '时出错:', error.message);
    }
  }
}

testAllUsers();