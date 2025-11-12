const axios = require('axios');

async function testLogin() {
  try {
    console.log('测试登录API响应格式...');
    
    // 增加超时时间
    const response = await axios.post('http://localhost:4000/api/auth/login', {
      username: 'sysadmin',
      password: 'SysAdmin123!@#'
    }, {
      timeout: 10000 // 10秒超时
    });
    
    console.log('响应状态码:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    // 检查响应格式
    if (response.data && response.data.success && response.data.data) {
      console.log('✅ 响应格式正确，包含 success 和 data 字段');
      console.log('用户信息:', JSON.stringify(response.data.data.user, null, 2));
      console.log('访问令牌:', response.data.data.accessToken ? '存在' : '不存在');
      console.log('刷新令牌:', response.data.data.refreshToken ? '存在' : '不存在');
    } else {
      console.log('❌ 响应格式不正确');
    }
    
  } catch (error) {
    console.error('登录失败:', error.message);
    if (error.response) {
      console.error('响应状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
      console.error('响应头:', error.response.headers);
    } else if (error.request) {
      console.error('请求已发送但没有收到响应:', error.request);
    } else {
      console.error('请求设置错误:', error);
    }
  }
}

testLogin();