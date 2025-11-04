const http = require('http');

// 测试配置
const config = {
  serverUrl: 'http://localhost:4000',
  maxAttempts: 10,  // 最大尝试次数
  testEndpoints: [
    { path: '/api/auth/login', method: 'POST', body: JSON.stringify({ username: 'testuser', password: 'wrongpassword' }) },
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
async function testBruteForceProtection() {
  console.log('开始测试暴力破解防护...');
  console.log(`服务器地址: ${config.serverUrl}`);
  console.log(`最大尝试次数: ${config.maxAttempts}`);
  console.log('----------------------------------------');
  
  let successCount = 0;
  let blockedCount = 0;
  let otherErrors = 0;
  
  for (let i = 1; i <= config.maxAttempts; i++) {
    console.log(`尝试 ${i}/${config.maxAttempts}...`);
    
    const endpoint = config.testEndpoints[0];
    const result = await sendRequest(endpoint);
    
    if (result.error) {
      console.log(`请求错误: ${result.error}`);
      otherErrors++;
    } else {
      console.log(`状态码: ${result.statusCode}`);
      
      if (result.statusCode === 401) {
        try {
          const data = JSON.parse(result.data);
          console.log(`响应: ${data.message}`);
          
          if (data.message && data.message.includes('尝试次数过多')) {
            console.log('*** 暴力破解防护已触发! ***');
            blockedCount++;
          } else {
            successCount++;
          }
        } catch (e) {
          console.log(`响应: ${result.data}`);
          otherErrors++;
        }
      } else if (result.statusCode === 429) {
        console.log('*** 请求被限流! ***');
        blockedCount++;
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
  
  console.log('测试结果统计:');
  console.log(`成功登录次数: ${successCount}`);
  console.log(`被阻止次数: ${blockedCount}`);
  console.log(`其他错误次数: ${otherErrors}`);
  
  if (blockedCount > 0) {
    console.log('✅ 暴力破解防护功能正常工作');
  } else {
    console.log('❌ 暴力破解防护功能可能未正确配置');
  }
}

testBruteForceProtection();