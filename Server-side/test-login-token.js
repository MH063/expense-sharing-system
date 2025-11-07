const jwt = require('jsonwebtoken');
const http = require('http');

// 创建登录请求
const postData = JSON.stringify({
  username: 'testuser',
  password: '123456'
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
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      const token = response.data.token;
      const decoded = jwt.decode(token);
      console.log('Token payload:');
      console.log(JSON.stringify(decoded, null, 2));
    } catch (error) {
      console.error('解析响应失败:', error);
      console.log('原始响应:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`请求遇到问题: ${e.message}`);
});

req.write(postData);
req.end();