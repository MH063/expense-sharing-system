# JWT密钥管理机制全面改进

本文档介绍了对JWT密钥管理机制的全面改进，包括引入专业密钥管理服务、自动密钥轮换、非对称加密算法升级、敏感信息加密存储和日志脱敏机制。

## 改进内容

### 1. 专业密钥管理服务（HashiCorp Vault）

我们引入了HashiCorp Vault作为专业密钥管理服务，实现JWT密钥的集中化、安全化存储与访问控制。

**实现文件：**
- `config/vault.js` - Vault服务集成
- `config/enhanced-secrets.js` - 增强的密钥管理服务

**主要功能：**
- 密钥集中化存储
- 密钥访问控制
- 密钥缓存管理
- 密钥版本控制

### 2. 自动密钥轮换机制

设计并实现了自动密钥轮换机制，设定合理的轮换周期，确保密钥定期更新且平滑过渡。

**实现文件：**
- `config/enhanced-secrets.js` - 增强的密钥轮换管理器

**主要功能：**
- 定期自动轮换密钥
- 密钥版本管理
- 平滑过渡机制
- 旧密钥保留策略

### 3. 非对称加密算法升级（RS256）

将JWT签名算法从对称加密（HS512）升级为非对称加密算法（RS256），提升签名安全性。

**实现文件：**
- `middleware/enhanced-tokenManager.js` - 增强的Token管理器
- `middleware/enhanced-auth-middleware.js` - 增强的认证中间件

**主要功能：**
- RSA密钥对生成
- RS256签名算法
- 公钥/私钥分离
- 令牌验证增强

### 4. 敏感信息加密存储

加强了系统敏感信息保护，对敏感字段实施加密存储策略。

**实现文件：**
- `config/data-encryption.js` - 数据加密模块
- `config/enhanced-database.js` - 增强的数据库服务

**主要功能：**
- AES-256-GCM加密算法
- 敏感字段自动识别
- 数据库透明加密
- 加密密钥管理

### 5. 日志脱敏机制

实现了完善的日志脱敏机制，防止敏感信息泄露。

**实现文件：**
- `config/secure-logger.js` - 安全日志模块

**主要功能：**
- 敏感信息自动识别
- 多种脱敏策略
- 日志分级记录
- 审计日志支持

## 使用指南

### 1. 环境配置

在启动应用前，请确保设置以下环境变量：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=accounting_system
DB_USER=postgres
DB_PASSWORD=your_password

# Vault配置（可选）
VAULT_ADDR=http://localhost:8000
VAULT_TOKEN=your_vault_token
VAULT_SECRET_PATH=secret/accounting_system

# 加密配置
ENCRYPTION_KEY=your_32_character_encryption_key

# 应用配置
PORT=3000
NODE_ENV=production
```

### 2. 启动应用

使用增强的应用入口文件启动服务：

```bash
node enhanced-app.js
```

### 3. API使用示例

#### 用户注册（敏感信息自动加密）

```javascript
POST /api/users/register
Content-Type: application/json

{
  "username": "testuser",
  "password": "securepassword",
  "email": "user@example.com",
  "phone": "1234567890",
  "mfa_secret": "JBSWY3DPEHPK3PXP"
}
```

#### 用户登录（使用RS256算法签名）

```javascript
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "securepassword"
}

// 响应
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

#### 受保护资源访问

```javascript
GET /api/users/profile
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// 响应（敏感字段自动解密）
{
  "success": true,
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "user@example.com",
    "phone": "1234567890"
  }
}
```

### 4. 密钥轮换

密钥轮换是自动进行的，默认轮换周期为30天。您也可以手动触发密钥轮换：

```javascript
const { getSecrets } = require('./config/enhanced-secrets');

// 手动轮换访问令牌密钥
const secrets = await getSecrets();
await secrets.rotateAccessSecret();

// 手动轮换刷新令牌密钥
await secrets.rotateRefreshSecret();
```

### 5. 日志查看

日志文件位于 `logs/` 目录下：

- `error.log` - 错误日志
- `combined.log` - 综合日志
- `access.log` - 访问日志
- `audit.log` - 审计日志

所有日志中的敏感信息已自动脱敏处理。

## 安全最佳实践

1. **定期备份密钥**：定期备份Vault中的密钥，确保密钥不会丢失。

2. **监控密钥轮换**：监控密钥轮换过程，确保轮换成功且不影响系统运行。

3. **审计日志**：定期审查审计日志，发现异常访问或行为。

4. **最小权限原则**：为不同服务分配最小必要的权限，减少潜在攻击面。

5. **定期更新依赖**：定期更新所有依赖包，修复已知安全漏洞。

## 故障排除

### 常见问题

1. **Vault连接失败**
   - 检查Vault服务是否正常运行
   - 验证Vault地址和令牌是否正确
   - 确认网络连接是否正常

2. **密钥轮换失败**
   - 检查密钥存储路径权限
   - 验证密钥文件是否可写
   - 查看错误日志获取详细信息

3. **令牌验证失败**
   - 确认公钥/私钥匹配
   - 检查令牌是否过期
   - 验证令牌格式是否正确

4. **数据解密失败**
   - 检查加密密钥是否正确
   - 验证数据格式是否有效
   - 确认加密算法是否匹配

### 日志分析

使用以下命令分析日志：

```bash
# 查看错误日志
tail -f logs/error.log

# 查看访问日志
tail -f logs/access.log

# 查看审计日志
tail -f logs/audit.log

# 搜索特定错误
grep "ERROR" logs/combined.log
```

## 性能优化

1. **密钥缓存**：使用内存缓存减少Vault访问次数
2. **连接池**：使用数据库连接池提高数据库访问效率
3. **异步处理**：使用异步操作提高系统并发性能
4. **日志缓冲**：使用日志缓冲减少磁盘I/O操作

## 总结

通过以上改进，我们实现了：

1. **专业密钥管理**：使用HashiCorp Vault实现密钥集中化管理
2. **自动密钥轮换**：定期自动轮换密钥，提高安全性
3. **非对称加密**：使用RS256算法提高JWT签名安全性
4. **数据加密存储**：对敏感字段实施加密存储策略
5. **日志脱敏**：实现完善的日志脱敏机制

这些改进显著提高了系统的安全性，同时保持了良好的性能和可用性。