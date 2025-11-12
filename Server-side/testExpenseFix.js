const http = require('http');

// 测试创建费用记录API
async function testCreateExpense() {
  // 首先需要登录获取token
  const loginData = JSON.stringify({
    username: 'user001',
    password: 'password123'
  });
  
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
    }
};
  
  const loginResponse = await new Promise((resolve, reject) => {
    const loginReq = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          reject(e);
        }
      });
    });
    
    loginReq.on('error', reject);
    loginReq.write(loginData);
    loginReq.end();
  });
  
  console.log('登录响应:', JSON.stringify(loginResponse, null, 2));
  
  if (!loginResponse.data.success) {
    console.error('登录失败:', loginResponse.data.message);
    return;
  }
  
  const token = loginResponse.data.data.accessToken;
  console.log('登录成功，获取到token');
  console.log('Token:', token);
  
  // 测试创建费用记录
  const expenseData = {
    title: '测试费用',
    description: '测试分摊功能',
    amount: 100.00,
    expense_type_id: 1,
    room_id: 6,  // 使用用户16(user001)所属的寝室
    payer_id: 16,  // 使用用户16(user001)的ID
    split_type: 'equal',
    members: [
      { user_id: 16 },
      { user_id: 14 }
    ]
  };
  
  const expenseJson = JSON.stringify(expenseData);
  
  const createOptions = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/expenses',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(expenseJson)
    }
  };
  
  const expenseResponse = await new Promise((resolve, reject) => {
    const createReq = http.request(createOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          reject(e);
        }
      });
    });
    
    createReq.on('error', reject);
    createReq.write(expenseJson);
    createReq.end();
  });
  
  console.log('响应状态:', expenseResponse.statusCode);
  console.log('响应数据:', JSON.stringify(expenseResponse.data, null, 2));
  
  if (expenseResponse.data.success) {
    console.log('✅ 费用记录创建成功！');
  } else {
    console.log('❌ 费用记录创建失败:', expenseResponse.data.message);
  }
}

testCreateExpense().catch(console.error);