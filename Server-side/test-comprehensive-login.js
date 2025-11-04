const http = require('http');

// 测试配置
const config = {
  serverUrl: 'http://localhost:4000',
  testEndpoints: [
    { path: '/api/auth/login', method: 'POST', body: JSON.stringify({ username: 'testuser', password: '123456' }) }, // 正确密码
    { path: '/api/auth/login', method: 'POST', body: JSON.stringify({ username: 'testuser', password: 'wrongpassword' }) }, // 错误密码
  ]
};

// 发送单个请求
function sendRequest(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': endpoint.body ? Buffer.byteLength(endpoint.body) : 0
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        error: error.message
      });
    });

    if (endpoint.body) {
      req.write(endpoint.body);
    }
    
    req.end();
  });
}

// 主测试函数
async function testBruteForceAndNormalLogin() {
  console.log('开始测试暴力破解防护和正常登录...');
  console.log(`服务器地址: ${config.serverUrl}`);
  console.log('----------------------------------------');
  
  // 测试正常登录
  console.log('测试正常登录...');
  const correctLoginEndpoint = config.testEndpoints[0];
  const correctLoginResult = await sendRequest(correctLoginEndpoint);
  
  if (correctLoginResult.error) {
    console.log(`请求错误: ${correctLoginResult.error}`);
  } else {
    console.log(`状态码: ${correctLoginResult.statusCode}`);
    try {
      const data = JSON.parse(correctLoginResult.data);
      console.log(`响应: ${data.message}`);
    } catch (e) {
      console.log(`响应: ${correctLoginResult.data}`);
    }
  }
  
  console.log('----------------------------------------');
  
  // 测试暴力破解
  console.log('测试暴力破解防护...');
  let successCount = 0;
  let blockedCount = 0;
  let otherErrors = 0;
  
  const wrongLoginEndpoint = config.testEndpoints[1];
  
  for (let i = 1; i <= 10; i++) {
    console.log(`尝试 ${i}/10...`);
    
    const result = await sendRequest(wrongLoginEndpoint);
    
    if (result.error) {
      console.log(`请求错误: ${result.error}`);
      otherErrors++;
    } else {
      console.log(`状态码: ${result.statusCode}`);
      
      if (result.statusCode === 401) {
        try {
          const data = JSON.parse(result.data);
          console.log(`响应: ${data.message}`);
          successCount++;
        } catch (e) {
          console.log(`响应: ${result.data}`);
          otherErrors++;
        }
      } else if (result.statusCode === 429) {
        try {
          const data = JSON.parse(result.data);
          console.log(`响应: ${data.message}`);
          console.log('*** 暴力破解防护已触发! ***');
          blockedCount++;
        } catch (e) {
          console.log(`响应: ${result.data}`);
          otherErrors++;
        }
      } else {
        console.log(`响应: ${result.data}`);
        otherErrors++;
      }
    }
    
    console.log('----------------------------------------');
    
    // 如果被阻止，提前结束测试
    if (blockedCount > 0) {
      console.log('暴力破解防护已生效，测试结束');
      break;
    }
    
    // 等待一秒再进行下一次尝试
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('----------------------------------------');
  
  // 再次测试正常登录
  console.log('再次测试正常登录...');
  const secondCorrectLoginResult = await sendRequest(correctLoginEndpoint);
  
  if (secondCorrectLoginResult.error) {
    console.log(`请求错误: ${secondCorrectLoginResult.error}`);
  } else {
    console.log(`状态码: ${secondCorrectLoginResult.statusCode}`);
    try {
      const data = JSON.parse(secondCorrectLoginResult.data);
      console.log(`响应: ${data.message}`);
    } catch (e) {
      console.log(`响应: ${secondCorrectLoginResult.data}`);
    }
  }
  
  console.log('----------------------------------------');
  
  // 测试结果统计
  console.log('测试结果统计:');
  console.log(`正常登录次数: ${successCount}`);
  console.log(`被阻止次数: ${blockedCount}`);
  console.log(`其他错误次数: ${otherErrors}`);
  
  if (blockedCount > 0) {
    console.log('✅ 暴力破解防护功能正常工作');
  } else {
    console.log('❌ 暴力破解防护功能可能未正确配置');
  }
}

testBruteForceAndNormalLogin();