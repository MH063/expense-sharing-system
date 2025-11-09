# 寝室费用分摊记账系统 - 后端服务

## 项目简介

寝室费用分摊记账系统是一个专为寝室或合租环境设计的费用管理应用，帮助室友们轻松记录、分摊和跟踪各种共同费用。本后端服务提供了完整的API接口，支持用户管理、寝室管理、费用记录、账单生成、统计分析和实时通信等功能。

## 功能特性

- **用户管理**: 用户注册、登录、个人信息管理
- **寝室管理**: 创建寝室、添加/移除成员、寝室信息管理
- **费用管理**: 记录各种费用、支持多种分摊方式（平均、自定义、百分比）
- **账单管理**: 生成账单、审核账单、确认支付
- **统计分析**: 个人和寝室的费用统计、趋势分析
- **实时通信**: WebSocket实时通知费用和账单变更
- **安全认证**: JWT令牌认证、权限控制
- **数据验证**: 完整的输入验证和错误处理

## 技术栈

- **后端框架**: Node.js + Express.js
- **数据库**: PostgreSQL (使用Sequelize ORM)
- **缓存**: Redis
- **认证**: JWT + 多因素认证(MFA)
- **日志**: Winston
- **测试**: Jest + Mocha
- **安全**: 暴力破解防护、速率限制、数据隔离
- **WebSocket**: 实时通信支持
- **文件上传**: Multer
- **二维码**: QR码生成与识别
- **支付优化**: 智能支付算法
- **监控**: 系统监控与指标收集

## 项目结构

```
Server-side/
├── config/                 # 配置文件
│   ├── brute-force-config.js # 暴力破解防护配置
│   ├── cache-config.js      # 缓存配置
│   ├── cors.js              # CORS配置
│   ├── db.js                # 数据库配置
│   ├── environment.js      # 环境变量配置
│   ├── logger.js            # 日志配置
│   ├── redis.js             # Redis配置
│   ├── secrets.js            # 密钥管理
│   ├── security.js          # 安全配置
│   └── websocket.js         # WebSocket配置
├── controllers/             # 控制器
│   ├── bill-controller.js   # 账单控制器
│   ├── dispute-controller.js # 争议控制器
│   ├── enhanced-audit-controller.js # 增强审计控制器
│   ├── expense-controller.js # 费用控制器
│   ├── expense-type-controller.js # 费用类型控制器
│   ├── invite-code-controller.js # 邀请码控制器
│   ├── monitoring-controller.js # 监控控制器
│   ├── notification-controller.js # 通知控制器
│   ├── notification-settings-controller.js # 通知设置控制器
│   ├── payment-controller.js # 支付控制器
│   ├── payment-optimization-controller.js # 支付优化控制器
│   ├── payment-transfer-controller.js # 支付转账控制器
│   ├── qr-code-controller.js # 二维码控制器
│   ├── review-controller.js # 审核控制器
│   ├── role-controller.js   # 角色控制器
│   ├── room-controller.js   # 寝室控制器
│   ├── special-payment-rules-controller.js # 特殊支付规则控制器
│   ├── stats-controller.js  # 统计控制器
│   ├── system-config-controller.js # 系统配置控制器
│   ├── user-controller.js   # 用户控制器
│   └── user-preferences-controller.js # 用户偏好控制器
├── middleware/             # 中间件
│   ├── auditLogger.js       # 审计日志中间件
│   ├── auth-middleware.js   # 认证中间件
│   ├── bruteForce.js        # 暴力破解防护中间件
│   ├── bruteForceRedis.js   # Redis暴力破解防护中间件
│   ├── cache-middleware.js  # 缓存中间件
│   ├── dataIsolation.js     # 数据隔离中间件
│   ├── enhanced-audit-logger.js # 增强审计日志中间件
│   ├── enhanced-cache-middleware.js # 增强缓存中间件
│   ├── enhanced-metrics.js  # 增强指标中间件
│   ├── error-handler.js     # 错误处理中间件
│   ├── metrics.js           # 指标中间件
│   ├── newResponseHandler.js # 新响应处理中间件
│   ├── permission-middleware.js # 权限中间件
│   ├── rateLimiter.js       # 速率限制中间件
│   ├── securityEnhancements.js # 安全增强中间件
│   ├── tokenHandler.js      # 令牌处理中间件
│   ├── tokenManager.js      # 令牌管理中间件
│   ├── upload.js            # 上传中间件
│   └── validation-middleware.js # 验证中间件
├── models/                 # 数据模型
│   ├── index.js             # 模型入口
│   ├── notification-model.js # 通知模型
│   ├── payment-transfer.js  # 支付转账模型
│   └── unified-models.js    # 统一模型
├── routes/                 # 路由
│   ├── abnormal-expense-routes.js # 异常费用路由
│   ├── admin-auth-routes.js # 管理员认证路由
│   ├── audit-log-examples.js # 审计日志示例
│   ├── auth-routes.js       # 认证路由
│   ├── bill-routes.js       # 账单路由
│   ├── brute-force-monitor.js # 暴力破解监控路由
│   ├── cache-routes.js      # 缓存路由
│   ├── cache-test-routes.js # 缓存测试路由
│   ├── dispute-routes.js    # 争议路由
│   ├── enhanced-audit-routes.js # 增强审计路由
│   ├── expense-routes.js    # 费用路由
│   ├── expense-type-routes.js # 费用类型路由
│   ├── file-routes.js       # 文件路由
│   ├── invite-code-routes.js # 邀请码路由
│   ├── leave-record-routes.js # 离校记录路由
│   ├── mfa-routes.js        # 多因素认证路由
│   ├── monitoring-routes.js # 监控路由
│   ├── notification-routes.js # 通知路由
│   ├── notification-settings-routes.js # 通知设置路由
│   ├── payment-optimization-routes.js # 支付优化路由
│   ├── payment-routes.js    # 支付路由
│   ├── payment-transfer-routes.js # 支付转账路由
│   ├── qr-code-routes.js    # 二维码路由
│   ├── review-routes.js     # 审核路由
│   ├── role-routes.js       # 角色路由
│   ├── room-routes.js       # 寝室路由
│   ├── special-payment-routes.js # 特殊支付路由
│   ├── stats-routes.js      # 统计路由
│   ├── stay-days-routes.js  # 居住天数路由
│   ├── system-config-routes.js # 系统配置路由
│   ├── user-preferences-routes.js # 用户偏好路由
│   ├── user-routes.js       # 用户路由
│   └── websocket-management-routes.js # WebSocket管理路由
├── services/               # 业务逻辑服务
│   ├── cache-service.js    # 缓存服务
│   ├── cache-warmup-service.js # 缓存预热服务
│   ├── database/           # 数据库服务
│   │   ├── base-service.js # 基础数据库服务
│   │   ├── bill-service.js # 账单服务
│   │   ├── dispute-service.js # 争议服务
│   │   ├── index.js        # 数据库服务入口
│   │   ├── notification-service.js # 通知服务
│   │   ├── notification-settings-service.js # 通知设置服务
│   │   ├── payment-service.js # 支付服务
│   │   ├── review-service.js # 审核服务
│   │   ├── room-service.js # 寝室服务
│   │   ├── user-preferences-service.js # 用户偏好服务
│   │   └── user-service.js  # 用户服务
│   ├── enhanced-audit-service.js # 增强审计服务
│   ├── enhanced-cache-service.js # 增强缓存服务
│   ├── enhanced-metrics.js  # 增强指标服务
│   ├── monitoring-service.js # 监控服务
│   ├── offline-payment-service.js # 离线支付服务
│   ├── password-service.js  # 密码服务
│   ├── payment-query-service.js # 支付查询服务
│   ├── payment-reminder-service.js # 支付提醒服务
│   ├── precision-calculator.js # 精度计算器
│   ├── presence-day-split-service.js # 居住天数分割服务
│   └── websocket-events.js # WebSocket事件服务
├── scripts/               # 脚本工具
│   ├── DATABASE_SCHEMA_CREATOR_GUIDE.md # 数据库表结构创建工具指南
│   ├── README.md          # 脚本说明文档
│   ├── automation-runner.js # 自动化运行器
│   ├── check-database-structure.js # 检查数据库结构
│   ├── check-database-tables.js # 检查数据库表
│   ├── check-users-table.js # 检查用户表
│   ├── create-database-schema.js # 创建数据库结构
│   ├── create-database-schema.js # 创建数据库结构
│   ├── create-qr-code-tables.js # 创建二维码表
│   ├── create-test-database.js # 创建测试数据库
│   ├── create-test-user.js # 创建测试用户
│   ├── database-schema-creator-examples.js # 数据库结构创建示例
│   ├── database-schema-creator.js # 数据库结构创建器
│   ├── docs-consistency-check.js # 文档一致性检查
│   ├── ensure-database-consistency.js # 确保数据库一致性
│   ├── fix-database-structure.js # 修复数据库结构
│   ├── init-database.js   # 初始化数据库
│   ├── reset-admin-password.js # 重置管理员密码
│   ├── run-payment-optimization-tests.js # 运行支付优化测试
│   ├── scheduler.js       # 调度器
│   ├── setup-leave-records.js # 设置离校记录
│   ├── sync-database-tables.js # 同步数据库表
│   └── zeabur-init.js     # Zeabur初始化
├── utils/                 # 工具函数
│   ├── date-utils.js      # 日期工具
│   ├── notification-service.js # 通知服务
│   ├── scheduler.js       # 调度器
│   └── totp.js           # 时间基础一次性密码
├── test/                  # 测试文件
│   ├── brute-force-protection.test.js # 暴力破解防护测试
│   ├── brute-force-test.js # 暴力破解测试
│   └── integration/       # 集成测试
│       └── brute-force-integration.test.js # 暴力破解集成测试
├── tests/                 # 测试套件
│   ├── contract.spec.md   # 合约规范
│   ├── fixtures/          # 测试夹具
│   │   └── 微信付款码.jpg # 微信付款码示例
│   ├── integration/       # 集成测试
│   │   ├── bill-controller-real-db.test.js # 账单控制器真实数据库测试
│   │   ├── bills-basic.test.js # 基础账单测试
│   │   ├── bills.test.js  # 账单测试
│   │   ├── brute-force-protection.test.js # 暴力破解防护测试
│   │   ├── disputes.test.js # 争议测试
│   │   ├── expense-types.test.js # 费用类型测试
│   │   ├── expenses-basic.test.js # 基础费用测试
│   │   ├── expenses.test.js # 费用测试
│   │   ├── files.test.js  # 文件测试
│   │   ├── minimal.test.js # 最小测试
│   │   ├── offline-payments.test.js # 离线支付测试
│   │   ├── payment-optimization-native.test.js # 原生支付优化测试
│   │   ├── payment-optimization.test.js # 支付优化测试
│   │   ├── payment-transfers.test.js # 支付转账测试
│   │   ├── payments-bill-flow.test.js # 支付账单流程测试
│   │   ├── qr-codes.test.js # 二维码测试
│   │   ├── reviews.test.js # 审核测试
│   │   ├── rooms.test.js  # 寝室测试
│   │   ├── simple-rooms.test.js # 简寝室测试
│   │   ├── simple.test.js # 简单测试
│   │   ├── stats.test.js  # 统计测试
│   │   ├── system-config.test.js # 系统配置测试
│   │   ├── user-api.test.js # 用户API测试
│   │   └── users.test.js  # 用户测试
│   ├── payment-optimization-test-suite-native.js # 原生支付优化测试套件
│   ├── payment-optimization-test-suite.js # 支付优化测试套件
│   ├── setup.js           # 测试设置
│   ├── setup/             # 测试设置
│   │   ├── jest.setup.js  # Jest设置
│   │   ├── load-env.js    # 加载环境变量
│   │   ├── native-test-database.js # 原生测试数据库
│   │   ├── test-database.js # 测试数据库
│   │   └── unified-test-database.js # 统一测试数据库
│   └── unit/              # 单元测试
│       ├── bill-controller.test.js # 账单控制器单元测试
│       ├── expense-controller.test.js # 费用控制器单元测试
│       ├── newResponseHandler.test.js # 新响应处理单元测试
│       ├── room-controller.test.js # 寝室控制器单元测试
│       ├── scheduler.test.js # 调度器单元测试
│       ├── stats-controller.test.js # 统计控制器单元测试
│       └── user-controller.test.js # 用户控制器单元测试
├── db/                    # 数据库相关
│   ├── README.md          # 数据库说明文档
│   ├── create-database-dev.sql # 开发环境数据库创建脚本
│   ├── create-database-prod.sql # 生产环境数据库创建脚本
│   ├── create-database-test.sql # 测试环境数据库创建脚本
│   ├── create-database.sql # 通用数据库创建脚本
│   └── init-database.sql  # 数据库初始化脚本
├── public/                # 公共资源
│   ├── index.html         # 索引页面
│   └── uploads/           # 上传文件目录
│       └── qr-codes/      # 二维码上传目录
├── uploads/               # 上传文件目录
├── temp-uploads/          # 临时上传文件目录
├── .env.development       # 开发环境变量
├── .env.example           # 环境变量示例
├── .env.production        # 生产环境变量
├── .env.test              # 测试环境变量
├── ENV_CONFIG_README.md   # 环境配置说明文档
├── create-databases.ps1   # 创建数据库PowerShell脚本
├── ensure-all-tables.js   # 确保所有表存在
├── jest.config.js         # Jest测试配置
├── package-lock.json      # 包锁定文件
├── package.json           # 项目依赖
├── reset-db-password.js   # 重置数据库密码
├── server.js              # 服务器入口文件
├── test-db-connection.js  # 测试数据库连接
└── winston.config.js      # Winston日志配置
```

## 快速开始

### 环境要求

- **Node.js**: 16.x 或更高版本
- **PostgreSQL**: 14.x 或更高版本
- **Redis**: 6.x 或更高版本（可选，用于缓存和会话管理）
- **操作系统**: Windows 10/11, macOS, Linux
- **内存**: 最小 2GB RAM，推荐 4GB 或更多
- **存储**: 最小 1GB 可用空间

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd Server-side
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **环境配置**
   ```bash
   # 复制环境变量模板
   copy .env.example .env.development
   
   # 编辑环境变量文件，配置数据库连接等信息
   notepad .env.development
   ```

4. **数据库初始化**
   ```bash
   # 创建数据库
   npm run init:database:dev
   
   # 初始化表结构
   npm run init:tables
   ```

5. **启动服务**
   ```bash
   # 开发模式
   npm run dev
   
   # 生产模式
   npm start
   ```

6. **测试连接**
   ```bash
   # 测试数据库连接
   npm run test:db
   
   # 运行测试套件
   npm test
   ```

## API文档

API文档位于以下路由中：

- **基础API文档**: `http://localhost:4000/api/docs`
- **Swagger UI**: `http://localhost:4000/api-docs`
- **API测试页面**: `http://localhost:4000/api-test`

### 主要API端点

#### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/logout` - 用户登出
- `POST /api/auth/refresh` - 刷新令牌
- `POST /api/auth/mfa/setup` - 设置多因素认证
- `POST /api/auth/mfa/verify` - 验证多因素认证

#### 用户管理
- `GET /api/users` - 获取用户列表
- `GET /api/users/:id` - 获取用户详情
- `PUT /api/users/:id` - 更新用户信息
- `DELETE /api/users/:id` - 删除用户
- `GET /api/users/profile` - 获取当前用户信息
- `PUT /api/users/preferences` - 更新用户偏好

#### 寝室管理
- `GET /api/rooms` - 获取寝室列表
- `GET /api/rooms/:id` - 获取寝室详情
- `POST /api/rooms` - 创建寝室
- `PUT /api/rooms/:id` - 更新寝室信息
- `DELETE /api/rooms/:id` - 删除寝室

#### 费用管理
- `GET /api/expenses` - 获取费用列表
- `GET /api/expenses/:id` - 获取费用详情
- `POST /api/expenses` - 创建费用
- `PUT /api/expenses/:id` - 更新费用
- `DELETE /api/expenses/:id` - 删除费用

#### 账单管理
- `GET /api/bills` - 获取账单列表
- `GET /api/bills/:id` - 获取账单详情
- `POST /api/bills` - 创建账单
- `PUT /api/bills/:id` - 更新账单
- `DELETE /api/bills/:id` - 删除账单
- `POST /api/bills/:id/pay` - 支付账单

#### 支付管理
- `GET /api/payments` - 获取支付记录
- `GET /api/payments/:id` - 获取支付详情
- `POST /api/payments` - 创建支付
- `POST /api/payments/transfer` - 支付转账
- `GET /api/payments/optimization` - 支付优化建议

#### 统计分析
- `GET /api/stats/overview` - 获取概览统计
- `GET /api/stats/expenses` - 获取费用统计
- `GET /api/stats/payments` - 获取支付统计
- `GET /api/stats/room/:id` - 获取寝室统计

#### 系统管理
- `GET /api/system/config` - 获取系统配置
- `PUT /api/system/config` - 更新系统配置
- `GET /api/system/health` - 系统健康检查
- `GET /api/system/metrics` - 系统指标

### API响应格式

所有API响应都遵循统一格式：

```json
{
  "success": true,
  "data": {
    // 实际数据内容
  },
  "message": "操作成功",
  "timestamp": "2023-11-01T12:00:00.000Z"
}
```

错误响应格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  },
  "timestamp": "2023-11-01T12:00:00.000Z"
}
```

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试套件
npm run test:unit         # 单元测试
npm run test:integration  # 集成测试
npm run test:api          # API测试
npm run test:security     # 安全测试

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npm test -- --testNamePattern="用户登录"
```

### 测试结构

测试文件位于以下目录：

- `tests/unit/` - 单元测试
  - 控制器测试
  - 服务测试
  - 工具函数测试

- `tests/integration/` - 集成测试
  - API端点测试
  - 数据库操作测试
  - 业务流程测试

- `test/` - 特定功能测试
  - 安全功能测试
  - 性能测试

### 测试数据

测试使用独立的测试数据库，配置在 `.env.test` 文件中。测试前会自动设置测试数据，测试后会清理。

### 测试覆盖率

项目目标测试覆盖率为：
- 语句覆盖率: 80%+
- 分支覆盖率: 75%+
- 函数覆盖率: 85%+
- 行覆盖率: 80%+

运行 `npm run test:coverage` 可查看详细的覆盖率报告。

## 部署

### 生产环境部署

1. **服务器准备**
   - 安装 Node.js 16.x+
   - 安装 PostgreSQL 14.x+
   - 安装 Redis 6.x+ (可选)
   - 配置防火墙规则

2. **应用部署**
   ```bash
   # 克隆代码
   git clone <repository-url>
   cd Server-side
   
   # 安装依赖
   npm ci --production
   
   # 配置环境变量
   cp .env.example .env.production
   # 编辑 .env.production 文件，设置生产环境配置
   ```

3. **数据库设置**
   ```bash
   # 创建生产数据库
   npm run init:database:prod
   
   # 初始化表结构
   npm run init:tables
   ```

4. **启动服务**
   ```bash
   # 使用PM2管理进程
   npm install -g pm2
   pm2 start ecosystem.config.js --env production
   
   # 或直接启动
   npm start
   ```

### Docker部署

1. **构建镜像**
   ```bash
   docker build -t expense-sharing-system .
   ```

2. **运行容器**
   ```bash
   docker run -d \
     --name expense-sharing-system \
     -p 3000:3000 \
     -e NODE_ENV=production \
     -e DB_HOST=your-db-host \
     -e DB_PASSWORD=your-db-password \
     expense-sharing-system
   ```

3. **使用Docker Compose**
   ```bash
   docker-compose up -d
   ```

### 环境变量配置

生产环境需要配置的关键环境变量：

```bash
NODE_ENV=production
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_prod
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Redis配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log

# 安全配置
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 监控与日志

- **应用日志**: 存储在 `logs/` 目录
- **错误监控**: 集成错误报告系统
- **性能监控**: 提供API性能指标
- **健康检查**: `/api/system/health` 端点

### 备份策略

- **数据库备份**: 每日自动备份
- **文件备份**: 定期备份上传文件
- **配置备份**: 版本控制管理配置文件

### 故障排除

常见问题及解决方案：

1. **数据库连接失败**
   - 检查数据库服务状态
   - 验证连接参数
   - 确认网络连通性

2. **端口占用**
   - 使用 `lsof -i :3000` 查看占用进程
   - 修改配置文件中的端口号

3. **权限问题**
   - 确保应用有足够权限访问文件系统
   - 检查数据库用户权限

4. **内存不足**
   - 调整Node.js内存限制
   - 优化数据库查询
   - 启用缓存机制

## 贡献指南

欢迎为项目贡献代码！请遵循以下步骤：

### 开发流程

1. **Fork 项目** 到您的GitHub账户
2. **创建功能分支**: `git checkout -b feature/amazing-feature`
3. **提交更改**: `git commit -m '添加某个功能'`
4. **推送分支**: `git push origin feature/amazing-feature`
5. **创建 Pull Request**

### 代码规范

- 使用 ESLint 和 Prettier 保持代码风格一致
- 遵循 JavaScript Standard Style
- 为新功能添加适当的测试
- 确保所有测试通过
- 更新相关文档

### 提交信息规范

使用约定式提交格式：

```
<类型>(<范围>): <描述>

[可选的正文]

[可选的脚注]
```

类型包括：
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(auth): 添加多因素认证功能

- 实现TOTP验证
- 添加备用恢复码
- 更新用户设置界面

Closes #123
```

### 代码审查

所有代码更改都需要经过代码审查：

1. 确保代码符合项目规范
2. 验证功能正确性
3. 检查测试覆盖率
4. 评估性能影响
5. 确认文档更新

### 问题报告

使用GitHub Issues报告问题：

1. 检查是否已有类似问题
2. 使用适当的标签
3. 提供详细的问题描述
4. 包含复现步骤
5. 附上相关日志或截图

### 安全问题

对于安全相关问题，请勿公开报告，发送邮件至：security@example.com

## 技术问题记录

### 已知问题

1. **支付优化算法在极端情况下的性能问题**
   - 问题描述：当寝室人数超过20人时，支付优化算法响应时间较长
   - 解决方案：计划在v1.2.0中实现分批处理算法
   - 临时解决方案：限制寝室最大人数为15人

2. **WebSocket连接在移动网络下不稳定**
   - 问题描述：在移动网络环境下，WebSocket连接容易断开
   - 解决方案：添加自动重连机制和心跳检测
   - 状态：已修复，将在v1.1.2中发布

3. **Redis缓存雪崩问题**
   - 问题描述：大量缓存同时过期导致数据库压力激增
   - 解决方案：实现缓存过期时间随机化和预热机制
   - 状态：已修复，将在v1.1.1中发布

### 常见问题解答

1. **如何重置管理员密码？**
   ```bash
   node scripts/reset-admin-password.js
   ```

2. **如何手动备份数据库？**
   ```bash
   pg_dump -U username -d database_name > backup.sql
   ```

3. **如何查看应用日志？**
   ```bash
   # 实时查看日志
   tail -f logs/app.log
   
   # 查看错误日志
   tail -f logs/error.log
   ```

4. **如何优化数据库性能？**
   - 定期执行 `VACUUM ANALYZE` 命令
   - 为常用查询字段添加索引
   - 考虑使用连接池

### 性能优化建议

1. **数据库优化**
   - 使用连接池减少连接开销
   - 为常用查询添加适当索引
   - 考虑读写分离

2. **缓存优化**
   - 合理设置缓存过期时间
   - 使用多级缓存策略
   - 实现缓存预热

3. **API优化**
   - 实现分页减少数据传输
   - 使用压缩减少响应大小
   - 优化查询减少数据库访问

### 安全注意事项

1. **定期更新依赖**
   ```bash
   npm audit
   npm audit fix
   ```

2. **使用HTTPS**
   - 在生产环境强制使用HTTPS
   - 配置适当的HTTP头

3. **输入验证**
   - 验证所有用户输入
   - 使用参数化查询防止SQL注入

4. **日志安全**
   - 避免在日志中记录敏感信息
   - 实现日志轮转防止磁盘空间耗尽

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

### 许可证摘要

- ✅ 商业使用
- ✅ 修改
- ✅ 分发
- ✅ 私人使用
- ⚠️ 需要包含许可证和版权声明
- ❌ 需要承担软件的责任
- ❌ 提供担保

## 联系方式

- 项目维护者: [Your Name](mailto:your.email@example.com)
- 项目主页: [https://github.com/your-username/expense-sharing-system](https://github.com/your-username/expense-sharing-system)
- 问题反馈: [GitHub Issues](https://github.com/your-username/expense-sharing-system/issues)

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新详情。

---

## 致谢

感谢以下开源项目和贡献者：

- [Node.js](https://nodejs.org/) - JavaScript运行时
- [Express.js](https://expressjs.com/) - Web应用框架
- [PostgreSQL](https://www.postgresql.org/) - 关系型数据库
- [Sequelize](https://sequelize.org/) - ORM框架
- [Jest](https://jestjs.io/) - 测试框架
- [Winston](https://github.com/winstonjs/winston) - 日志库
- [Socket.IO](https://socket.io/) - 实时通信库

## Star History

如果这个项目对您有帮助，请给我们一个 ⭐️！