const { exec } = require('child_process');

console.log('开始运行后端全套测试...');
console.log('确保连接到真实的数据库，不使用模拟数据库...');

// 设置环境变量并运行测试
const testProcess = exec('set NODE_ENV=test && npx jest', {
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