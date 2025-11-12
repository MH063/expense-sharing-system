import axios from 'axios';

async function testLogin() {
  try {
    console.log('开始测试登录...');
    
    const response = await axios.post('http://localhost:4000/api/auth/login', {
      username: 'sysadmin',
      password: 'SysAdmin123!@#'
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
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
      }
      
      if (response.data.data.refreshToken) {
        console.log('- 刷新令牌存在:', !!response.data.data.refreshToken);
        console.log('- 刷新令牌前缀:', response.data.data.refreshToken.substring(0, 20) + '...');
      }
    } else {
      console.log('\n响应格式不正确!');
    }
  } catch (error) {
    console.error('登录失败:', error.message);
    
    if (error.response) {
      console.error('响应状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('请求已发送但没有收到响应');
    } else {
      console.error('请求设置出错:', error.message);
    }
  }
}

testLogin();