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

- **运行环境**: Node.js 16.x+
- **Web框架**: Express.js
- **数据库**: MySQL 8.0+
- **缓存**: Redis (可选)
- **认证**: JWT (JSON Web Tokens)
- **实时通信**: Socket.IO
- **测试框架**: Jest
- **日志管理**: Winston
- **API文档**: 自定义文档

## 项目结构

```
Server-side/
├── config/                 # 配置文件
│   ├── database.js         # 数据库配置
│   ├── auth.js             # 认证配置
│   └── index.js            # 配置入口
├── controllers/            # 控制器
│   ├── auth-controller.js  # 认证控制器
│   ├── user-controller.js  # 用户控制器
│   ├── room-controller.js  # 寝室控制器
│   ├── expense-controller.js # 费用控制器
│   ├── bill-controller.js  # 账单控制器
│   └── stats-controller.js # 统计控制器
├── middleware/             # 中间件
│   ├── auth.js             # 认证中间件
│   ├── validation.js       # 验证中间件
│   ├── error-handler.js    # 错误处理中间件
│   └── response.js         # 响应格式化中间件
├── models/                 # 数据模型
│   ├── User.js             # 用户模型
│   ├── Room.js             # 寝室模型
│   ├── Expense.js          # 费用模型
│   └── Bill.js             # 账单模型
├── routes/                 # 路由
│   ├── auth-routes.js      # 认证路由
│   ├── user-routes.js      # 用户路由
│   ├── room-routes.js      # 寝室路由
│   ├── expense-routes.js   # 费用路由
│   ├── bill-routes.js      # 账单路由
│   └── stats-routes.js     # 统计路由
├── services/               # 业务逻辑服务
│   ├── auth-service.js     # 认证服务
│   ├── user-service.js     # 用户服务
│   ├── room-service.js     # 寝室服务
│   ├── expense-service.js  # 费用服务
│   ├── bill-service.js     # 账单服务
│   ├── stats-service.js    # 统计服务
│   ├── websocket-events.js # WebSocket事件处理
│   └── websocket-manager.js # WebSocket管理
├── utils/                  # 工具函数
│   ├── logger.js           # 日志工具
│   ├── validator.js        # 验证工具
│   └── helpers.js          # 辅助函数
├── tests/                  # 测试文件
│   ├── unit/               # 单元测试
│   ├── integration/        # 集成测试
│   └── setup.js            # 测试设置
├── docs/                   # 文档
│   ├── API.md              # API文档
│   ├── DEPLOYMENT.md       # 部署文档
│   └── TECHNICAL_ISSUES.md # 技术问题记录
├── database/               # 数据库相关
│   ├── schema.sql          # 数据库结构
│   └── migrations/         # 数据库迁移
├── uploads/                # 文件上传目录
├── logs/                   # 日志目录
├── .env.example            # 环境变量示例
├── .gitignore              # Git忽略文件
├── jest.config.json        # Jest测试配置
├── package.json            # 项目依赖
└── server.js               # 服务器入口文件
```

## 快速开始

### 环境要求

- Node.js 16.x 或更高版本
- npm 8.x 或更高版本
- MySQL 8.0 或更高版本
- Redis 6.0 或更高版本 (可选)

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/your-repo/room-expense-system.git
cd room-expense-system/Server-side
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接和其他环境变量。

4. 创建数据库
```sql
CREATE DATABASE room_expense_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. 导入数据库结构
```bash
mysql -u your_username -p room_expense_db < database/schema.sql
```

6. 启动服务器
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3000` 启动。

## API文档

详细的API文档请参考 [API.md](docs/API.md)。

## 测试

运行测试：
```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监视模式运行测试
npm run test:watch
```

## 部署

详细的部署指南请参考 [DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 贡献指南

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 技术问题记录

开发过程中遇到的技术问题和解决方案请参考 [TECHNICAL_ISSUES.md](docs/TECHNICAL_ISSUES.md)。

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 项目维护者: [Your Name](mailto:your.email@example.com)
- 项目主页: [https://github.com/your-repo/room-expense-system](https://github.com/your-repo/room-expense-system)
- 问题反馈: [Issues](https://github.com/your-repo/room-expense-system/issues)

## 更新日志

### v1.0.0 (2023-XX-XX)

- 初始版本发布
- 实现基本的用户、寝室、费用和账单管理功能
- 添加JWT认证和权限控制
- 实现WebSocket实时通信
- 添加基本的统计分析功能
- 完成单元测试和集成测试
- 编写完整的API文档和部署文档

### v1.0.1 (2023-XX-XX)

- 修复bill-controller.test.js测试失败问题
- 提高测试覆盖率至55.45%
- 更新技术问题记录文档，添加测试相关问题和解决方案

---

## 致谢

感谢所有为本项目做出贡献的开发者和用户。