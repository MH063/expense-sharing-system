# 环境配置说明

## 概述

本文档详细说明了记账系统服务器的环境配置管理，包括环境变量加载顺序、配置文件说明、安全配置和故障排除指南。

## 环境变量加载顺序

系统按以下优先级顺序加载环境变量：

1. **命令行参数** (最高优先级)
   - 例如: `--log-level debug`, `--port 3001`

2. **本地环境变量文件** (`.env`)
   - 包含真实密码和本地特定配置
   - 不应提交到版本控制系统

3. **环境特定配置文件** (`.env.{NODE_ENV}`)
   - 例如: `.env.development`, `.env.production`, `.env.test`

4. **系统环境变量** (最低优先级)

## 配置文件说明

### 1. .env.example

环境变量模板文件，包含所有可配置的环境变量及其默认值：

```bash
# 应用配置
NODE_ENV=development
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_dev
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 安全配置
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_here
CORS_ORIGIN=http://localhost:3000

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d

# 速率限制配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 暴力破解防护配置
BRUTE_FORCE_WINDOW_MS=900000
BRUTE_FORCE_MAX_ATTEMPTS=5
BRUTE_FORCE_BLOCK_DURATION=900000

# 文件上传配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx

# 邮件配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
SMTP_FROM=noreply@example.com

# 微信支付配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_MCH_ID=your_wechat_mch_id
WECHAT_API_KEY=your_wechat_api_key

# 支付宝配置
ALIPAY_APP_ID=your_alipay_app_id
ALIPAY_PRIVATE_KEY=your_alipay_private_key
ALIPAY_PUBLIC_KEY=your_alipay_public_key
```

### 2. .env.development

开发环境特定配置，包含开发环境的默认值：

```bash
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
DB_NAME=expense_dev
REDIS_DB=0
CORS_ORIGIN=http://localhost:3000
```

### 3. .env.test

测试环境特定配置：

```bash
NODE_ENV=test
PORT=3001
LOG_LEVEL=error
DB_NAME=expense_test
REDIS_DB=1
CORS_ORIGIN=http://localhost:3001
```

### 4. .env.production

生产环境特定配置：

```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
DB_NAME=expense_prod
REDIS_DB=0
CORS_ORIGIN=https://yourdomain.com
```

## 配置管理最佳实践

### 1. 安全配置

- 所有敏感信息（密码、密钥等）应存储在本地 `.env` 文件中
- 不要将包含真实密码的 `.env` 文件提交到版本控制系统
- 使用强密码和长随机密钥
- 定期轮换密钥和密码

### 2. 环境隔离

- 为不同环境使用不同的数据库
- 使用不同的Redis数据库实例
- 配置不同的日志级别和文件路径

### 3. 配置验证

系统启动时会验证关键配置项：

```javascript
// 生产环境必须配置的关键变量
const requiredProductionVars = [
  'DB_PASSWORD',
  'JWT_SECRET',
  'SESSION_SECRET'
];
```

## 命令行参数支持

服务器支持以下命令行参数：

- `--log-level <level>`: 设置日志级别 (debug, info, warn, error)
- `--port <port>`: 设置服务器端口
- `--env <environment>`: 设置运行环境
- `--help`: 显示帮助信息

示例：

```bash
# 使用调试日志级别启动
node server.js --log-level debug

# 使用自定义端口启动
node server.js --port 3001

# 设置为生产环境
node server.js --env production
```

## 测试脚本

### 1. 测试数据库连接

```bash
node test-db-connection.js --log-level debug
```

### 2. 测试环境配置加载

```bash
node test-env-config.js --log-level debug
```

### 3. 测试所有环境配置

```bash
# 测试开发环境
node test-env-config.js --env development

# 测试测试环境
node test-env-config.js --env test

# 测试生产环境
node test-env-config.js --env production
```

## 启动脚本

### Windows批处理脚本

创建了 `start-server.bat` Windows批处理脚本，简化了服务器启动过程：

```bash
# 使用默认配置启动
start-server.bat

# 使用调试日志级别启动
start-server.bat --log-level debug

# 使用自定义端口启动
start-server.bat --port 3001
```

### PowerShell脚本

创建了 `start-server.ps1` PowerShell脚本，提供更强大的功能：

```bash
# 使用默认配置启动
.\start-server.ps1

# 使用调试日志级别启动
.\start-server.ps1 -LogLevel debug

# 使用自定义端口启动
.\start-server.ps1 -Port 3001

# 使用生产环境配置启动
.\start-server.ps1 -Environment production
```

## 故障排除

### 1. 数据库连接问题

如果遇到数据库连接问题：

1. 运行 `node test-db-connection.js --log-level debug` 检查数据库连接
2. 确认本地 `.env` 文件中的数据库配置正确
3. 检查数据库服务是否正在运行
4. 验证数据库用户名和密码是否正确
5. 检查防火墙设置是否允许数据库连接

### 2. Redis连接问题

如果遇到Redis连接问题：

1. 检查Redis服务是否正在运行
2. 验证Redis配置是否正确
3. 检查Redis密码是否正确（如果设置了密码）
4. 确认Redis数据库索引是否正确

### 3. JWT认证问题

如果遇到JWT认证问题：

1. 检查JWT_SECRET是否设置
2. 确认JWT_EXPIRES_IN是否设置正确
3. 验证令牌格式是否正确
4. 检查令牌是否已过期

### 4. 文件上传问题

如果遇到文件上传问题：

1. 检查上传目录是否存在且有写权限
2. 验证文件大小是否超过限制
3. 确认文件类型是否在允许列表中
4. 检查磁盘空间是否充足

## 环境变量参考

### 应用配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| NODE_ENV | development | 运行环境 (development/test/production) |
| PORT | 3000 | 服务器端口 |

### 数据库配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| DB_HOST | localhost | 数据库主机 |
| DB_PORT | 5432 | 数据库端口 |
| DB_NAME | expense_dev | 数据库名称 |
| DB_USER | postgres | 数据库用户名 |
| DB_PASSWORD | - | 数据库密码 |
| DB_SSL | false | 是否使用SSL连接 |
| DB_POOL_MIN | 2 | 连接池最小连接数 |
| DB_POOL_MAX | 10 | 连接池最大连接数 |

### Redis配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| REDIS_HOST | localhost | Redis主机 |
| REDIS_PORT | 6379 | Redis端口 |
| REDIS_PASSWORD | - | Redis密码 |
| REDIS_DB | 0 | Redis数据库索引 |

### JWT配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| JWT_SECRET | - | JWT密钥 |
| JWT_EXPIRES_IN | 7d | JWT过期时间 |
| JWT_REFRESH_EXPIRES_IN | 30d | 刷新令牌过期时间 |

### 安全配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| BCRYPT_ROUNDS | 12 | bcrypt加密轮数 |
| SESSION_SECRET | - | 会话密钥 |
| CORS_ORIGIN | http://localhost:3000 | 允许的跨域源 |

### 日志配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| LOG_LEVEL | info | 日志级别 |
| LOG_FILE | logs/app.log | 日志文件路径 |
| LOG_MAX_SIZE | 20m | 日志文件最大大小 |
| LOG_MAX_FILES | 14d | 日志文件保留天数 |

### 速率限制配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| RATE_LIMIT_WINDOW_MS | 900000 | 速率限制时间窗口(毫秒) |
| RATE_LIMIT_MAX_REQUESTS | 100 | 时间窗口内最大请求数 |

### 暴力破解防护配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| BRUTE_FORCE_WINDOW_MS | 900000 | 暴力破解检测时间窗口(毫秒) |
| BRUTE_FORCE_MAX_ATTEMPTS | 5 | 最大尝试次数 |
| BRUTE_FORCE_BLOCK_DURATION | 900000 | 阻止持续时间(毫秒) |

### 文件上传配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| UPLOAD_DIR | uploads | 上传目录 |
| MAX_FILE_SIZE | 10485760 | 最大文件大小(字节) |
| ALLOWED_FILE_TYPES | jpg,jpeg,png,gif,pdf,doc,docx | 允许的文件类型 |

## 高级配置

### 1. 多环境部署

对于多环境部署，可以使用环境特定的配置文件：

```bash
# 开发环境
cp .env.development .env.local

# 测试环境
cp .env.test .env.local

# 生产环境
cp .env.production .env.local
```

然后编辑 `.env.local` 文件，添加环境特定的敏感信息。

### 2. Docker环境变量

在Docker环境中，可以通过环境变量传递配置：

```bash
docker run -d \
  --name expense-sharing-system \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e DB_PASSWORD=your-db-password \
  -e JWT_SECRET=your-jwt-secret \
  expense-sharing-system
```

### 3. Kubernetes配置

在Kubernetes中，可以使用ConfigMap和Secret管理配置：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: expense-config
data:
  NODE_ENV: "production"
  PORT: "3000"
  DB_HOST: "postgres-service"
  DB_NAME: "expense_prod"
---
apiVersion: v1
kind: Secret
metadata:
  name: expense-secrets
type: Opaque
data:
  DB_PASSWORD: <base64-encoded-password>
  JWT_SECRET: <base64-encoded-jwt-secret>
```

## 总结

通过合理配置环境变量，可以确保应用在不同环境中正常运行，同时保持敏感信息的安全性。遵循本文档中的最佳实践，可以帮助您更好地管理应用配置。