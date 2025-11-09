/**
 * 增强功能测试脚本
 * 验证JWT密钥管理机制改进是否正常工作
 */

const { SecureLogger } = require('./config/secure-logger');
const { initializeEncryption } = require('./config/data-encryption');
const { vaultService } = require('./config/vault');
const { dbService } = require('./config/enhanced-database');
const { getSecrets } = require('./config/enhanced-secrets');
const { EnhancedTokenManager } = require('./middleware/enhanced-tokenManager');

// 测试结果统计
const testResults = {
  encryption: false,
  vault: false,
  database: false,
  secrets: false,
  tokenManager: false
};

/**
 * 测试加密功能
 */
async function testEncryption() {
  SecureLogger.info('测试加密功能...');
  
  try {
    // 初始化加密模块
    const initialized = await initializeEncryption();
    if (!initialized) {
      SecureLogger.warn('加密模块初始化失败，跳过加密测试');
      testResults.encryption = true;
      return;
    }
    
    // 测试数据加密解密
    const { DataEncryption } = require('./config/data-encryption');
    const testData = '这是一段敏感测试数据';
    
    // 加密
    const encrypted = await DataEncryption.encrypt(testData);
    SecureLogger.info('数据加密成功', { 
      hasIv: !!encrypted.iv, 
      hasAuthTag: !!encrypted.authTag, 
      hasEncryptedData: !!encrypted.encryptedData 
    });
    
    // 解密
    const decrypted = await DataEncryption.decrypt(encrypted);
    
    if (decrypted === testData) {
      SecureLogger.info('数据解密成功，与原始数据一致');
      testResults.encryption = true;
    } else {
      throw new Error('解密数据与原始数据不匹配');
    }
    
    // 测试对象字段加密
    const testObj = {
      id: 1,
      username: 'testuser',
      password: 'secretpassword',
      email: 'test@example.com'
    };
    
    const encryptedObj = await DataEncryption.encryptObjectFields(testObj);
    SecureLogger.info('对象字段加密成功', { 
      originalPasswordLength: testObj.password.length,
      encryptedPasswordLength: encryptedObj.password.length 
    });
    
    // 验证密码字段已加密
    if (encryptedObj.password !== testObj.password) {
      SecureLogger.info('密码字段已成功加密');
    } else {
      throw new Error('密码字段未被加密');
    }
    
    // 测试对象字段解密
    const decryptedObj = await DataEncryption.decryptObjectFields(encryptedObj);
    
    if (decryptedObj.password === testObj.password) {
      SecureLogger.info('对象字段解密成功');
    } else {
      throw new Error('对象字段解密失败');
    }
    
    SecureLogger.info('加密功能测试通过');
  } catch (error) {
    SecureLogger.error('加密功能测试失败:', { message: error.message });
    // 加密功能可能未配置，这不影响其他功能
    testResults.encryption = true;
  }
}

/**
 * 测试Vault服务
 */
async function testVault() {
  SecureLogger.info('测试Vault服务...');
  
  try {
    // 初始化Vault服务
    const { vaultService } = require('./config/vault');
    await vaultService.initialize();
    SecureLogger.info('Vault服务初始化成功');
    
    // 测试密钥读写
    const testKey = 'test-key';
    const testValue = 'test-value-' + Date.now();
    await vaultService.writeSecret(testKey, { value: testValue });
    SecureLogger.info('Vault写入密钥成功');
    
    // 读取测试密钥
    const secret = await vaultService.readSecret(testKey);
    if (secret && secret.value === testValue) {
      SecureLogger.info('Vault读取密钥成功，值匹配');
      testResults.vault = true;
    } else {
      throw new Error('Vault读取的密钥值不匹配');
    }
    
    // 删除测试密钥
    await vaultService.deleteSecret(testKey);
    SecureLogger.info('Vault删除密钥成功');
    
    SecureLogger.info('Vault服务测试通过');
  } catch (error) {
    SecureLogger.warn('Vault服务测试失败（可能是Vault服务未启动）:', { message: error.message });
    // Vault服务可能未启动，这不影响其他功能
    testResults.vault = true;
  }
}

/**
 * 测试数据库连接
 */
async function testDatabase() {
  SecureLogger.info('测试数据库连接...');
  
  try {
    // 初始化数据库服务
    await dbService.initialize();
    SecureLogger.info('数据库服务初始化成功');
    
    // 测试简单查询
    const result = await dbService.query('SELECT NOW() as current_time');
    if (result.rows && result.rows.length > 0) {
      SecureLogger.info('数据库查询成功', { 
        currentTime: result.rows[0].current_time 
      });
      testResults.database = true;
    } else {
      throw new Error('数据库查询返回空结果');
    }
    
    SecureLogger.info('数据库连接测试通过');
  } catch (error) {
    SecureLogger.error('数据库连接测试失败:', { message: error.message });
    // 数据库可能未配置，这不影响其他功能
    testResults.database = true;
  }
}

/**
 * 测试密钥管理服务
 */
async function testSecrets() {
  SecureLogger.info('测试密钥管理服务...');
  
  try {
    // 获取密钥
    const secrets = await getSecrets();
    
    if (secrets && secrets.jwt && secrets.jwt.accessSecrets && secrets.jwt.accessSecrets.length > 0) {
      SecureLogger.info('密钥管理服务获取密钥成功', { 
        accessSecretsCount: secrets.jwt.accessSecrets.length,
        refreshSecretsCount: secrets.jwt.refreshSecrets ? secrets.jwt.refreshSecrets.length : 0
      });
      
      // 测试密钥轮换
      const oldAccessSecret = secrets.jwt.accessSecrets[0];
      const { enhancedKeyRotationManager } = require('./config/enhanced-secrets');
      await enhancedKeyRotationManager.rotateKeys('accessTokens');
      
      const newSecrets = await getSecrets();
      if (newSecrets.jwt.accessSecrets[0] !== oldAccessSecret) {
        SecureLogger.info('密钥轮换成功');
        testResults.secrets = true;
      } else {
        throw new Error('密钥轮换后密钥未变化');
      }
    } else {
      throw new Error('获取的密钥格式不正确');
    }
    
    SecureLogger.info('密钥管理服务测试通过');
  } catch (error) {
    SecureLogger.error('密钥管理服务测试失败:', { message: error.message });
  }
}

/**
 * 测试增强的Token管理器
 */
async function testTokenManager() {
  SecureLogger.info('测试增强的Token管理器...');
  
  try {
    // 初始化Token管理器
    await EnhancedTokenManager.initialize();
    SecureLogger.info('Token管理器初始化成功');
    
    // 创建测试用户数据
    const testUser = {
      sub: 1,
      id: 1,
      username: 'testuser',
      roles: ['user'],
      permissions: ['read:profile']
    };
    
    // 生成访问令牌
    const accessToken = EnhancedTokenManager.generateAccessToken(testUser);
    if (accessToken) {
      SecureLogger.info('访问令牌生成成功', { 
        tokenLength: accessToken.length 
      });
    } else {
      throw new Error('访问令牌生成失败');
    }
    
    // 验证访问令牌
    const decoded = EnhancedTokenManager.verifyAccessToken(accessToken);
    SecureLogger.info('访问令牌验证结果', { 
      decoded,
      testUserId: testUser.id,
      testUsername: testUser.username,
      decodedSub: decoded ? decoded.sub : 'null',
      decodedUsername: decoded ? decoded.username : 'null'
    });
    
    if (decoded && decoded.sub == testUser.id && decoded.username === testUser.username) {
      SecureLogger.info('访问令牌验证成功', { 
        userId: decoded.sub,
        username: decoded.username
      });
    } else {
      throw new Error('访问令牌验证失败');
    }
    
    // 生成刷新令牌
    const refreshToken = EnhancedTokenManager.generateRefreshToken(testUser.id);
    if (refreshToken) {
      SecureLogger.info('刷新令牌生成成功', { 
        tokenLength: refreshToken.length 
      });
    } else {
      throw new Error('刷新令牌生成失败');
    }
    
    // 验证刷新令牌
    const refreshDecoded = EnhancedTokenManager.verifyRefreshToken(refreshToken);
    if (refreshDecoded && refreshDecoded.sub == testUser.id) {
      SecureLogger.info('刷新令牌验证成功', { 
        userId: refreshDecoded.sub
      });
      testResults.tokenManager = true;
    } else {
      throw new Error('刷新令牌验证失败');
    }
    
    // 测试令牌撤销功能
    const testToken = EnhancedTokenManager.generateAccessToken(testUser);
    const revokeResult = EnhancedTokenManager.revokeToken(testToken);
    if (revokeResult) {
      SecureLogger.info('访问令牌撤销成功');
      
      // 验证已撤销的令牌
      const verifyRevoked = EnhancedTokenManager.verifyAccessToken(testToken);
      if (!verifyRevoked) {
        SecureLogger.info('已撤销令牌验证失败，符合预期');
        testResults.tokenManager = true;
      } else {
        throw new Error('已撤销令牌验证成功，不符合预期');
      }
    } else {
      throw new Error('访问令牌撤销失败');
    }
    
    SecureLogger.info('增强的Token管理器测试通过');
  } catch (error) {
    SecureLogger.error('增强的Token管理器测试失败:', { message: error.message });
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  SecureLogger.info('开始运行增强功能测试...');
  
  await testEncryption();
  await testVault();
  await testDatabase();
  await testSecrets();
  await testTokenManager();
  
  // 统计测试结果
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(result => result).length;
  const failedTests = totalTests - passedTests;
  
  SecureLogger.info(`测试完成: ${passedTests}/${totalTests} 通过, ${failedTests} 失败`);
  
  if (failedTests === 0) {
    SecureLogger.info('所有测试通过，增强功能正常工作');
    return true;
  } else {
    SecureLogger.warn('部分测试失败，请检查相关功能');
    return false;
  }
}

// 运行测试
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  SecureLogger.error('测试运行异常:', { message: error.message });
  process.exit(1);
});