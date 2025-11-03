const { exec } = require('child_process');

console.log('运行离线支付服务测试 - 使用真实数据库...');

// 设置环境变量并运行特定测试
const testProcess = exec('set NODE_ENV=test && npx jest tests/unit/offline-payment-service-real-db.test.js --verbose', {
  cwd: __dirname
});

testProcess.stdout.on('data', (data) => {
  console.log(data.toString());
});

testProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

testProcess.on('close', (code) => {
  console.log(`测试运行完成，退出码: ${code}`);
});