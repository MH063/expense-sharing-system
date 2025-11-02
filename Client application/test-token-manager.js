import tokenManager from './src/utils/jwt-token-manager.js';

console.log('测试Token管理器...');

// 初始化Token管理器
tokenManager.init();

// 检查是否有Token
console.log('当前Token:', tokenManager.getToken() ? '存在' : '不存在');
console.log('当前刷新Token:', tokenManager.getRefreshToken() ? '存在' : '不存在');

// 模拟设置Token
console.log('\n模拟设置Token...');
tokenManager.setToken('test_access_token');
tokenManager.setRefreshToken('test_refresh_token');

console.log('设置后Token:', tokenManager.getToken() ? '存在' : '不存在');
console.log('设置后刷新Token:', tokenManager.getRefreshToken() ? '存在' : '不存在');

// 清除Token
console.log('\n清除Token...');
tokenManager.clearTokens();

console.log('清除后Token:', tokenManager.getToken() ? '存在' : '不存在');
console.log('清除后刷新Token:', tokenManager.getRefreshToken() ? '存在' : '不存在');

console.log('\n测试完成');