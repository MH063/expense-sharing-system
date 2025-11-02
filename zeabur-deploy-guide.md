# Zeabur 部署指南

## 项目概述

寝室费用分摊记账系统是一个完整的全栈应用，包含：
- **后端服务**: Node.js + Express + PostgreSQL
- **前端用户端**: Vue 3 + Element Plus
- **管理后台**: Vue 3 + Element Plus

## Zeabur 部署配置

### 1. 项目结构
```
记账系统/
├── .zeabur/                    # Zeabur 部署配置
│   ├── build.json              # 构建配置
│   └── deploy.json            # 部署配置
├── Server-side/               # 后端服务
├── Client application/        # 前端用户端
├── Admin panel/              # 管理后台
└── package.json              # 根目录配置
```

### 2. 部署配置详情

#### build.json
```json
{
  "buildCommand": "npm run build:all",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "startCommand": "npm run start:prod"
}
```

#### deploy.json
```json
{
  "name": "expense-sharing-system",
  "description": "寝室费用分摊记账系统",
  "type": "nodejs",
  "build": {
    "command": "npm install",
    "output": "Server-side"
  },
  "env": {
    "NODE_ENV": "production",
    "PORT": "4000"
  },
  "domains": [
    "expense-sharing-system.zeabur.app"
  ]
}
```

## 部署步骤

### 1. 准备工作

1. **确保代码已推送到 GitHub**
   ```bash
   git add .
   git commit -m "准备Zeabur部署"
   git push origin main
   ```

2. **注册 Zeabur 账户**
   - 访问 https://zeabur.com
   - 使用 GitHub 账户登录

### 2. 在 Zeabur 中部署

1. **创建新项目**
   - 登录 Zeabur 控制台
   - 点击 "Create Project"
   - 输入项目名称: `expense-sharing-system`

2. **连接 GitHub 仓库**
   - 点击 "Connect GitHub"
   - 授权 Zeabur 访问你的 GitHub 账户
   - 选择包含记账系统的仓库

3. **添加数据库服务**
   - 在项目页面点击 "Add Service"
   - 选择 "PostgreSQL" 服务
   - 等待数据库服务创建完成

4. **配置环境变量**
   - 在项目设置中找到 "Environment Variables"
   - 添加以下变量：

   ```env
   # 数据库配置（使用Zeabur提供的值）
   DB_HOST=your-postgres-host.zeabur.com
   DB_PORT=5432
   DB_USER=your-database-user
   DB_PASSWORD=your-database-password
   DB_NAME=prod_expense_system
   
   # 应用配置
   NODE_ENV=production
   PORT=4000
   JWT_SECRET=your-secure-jwt-secret-key-change-this
   
   # Redis配置（可选）
   REDIS_HOST=your-redis-host.zeabur.com
   REDIS_PORT=6379
   ```

### 3. 自动部署流程

Zeabur 会自动执行以下步骤：

1. **安装依赖**: `npm install`
2. **构建前端**: `npm run build:all`
3. **启动服务**: `npm run start:prod`

## 部署后验证

### 1. 检查服务状态
访问以下端点验证部署：

- **主页**: https://expense-sharing-system.zeabur.app/
- **健康检查**: https://expense-sharing-system.zeabur.app/health
- **用户端**: https://expense-sharing-system.zeabur.app/client
- **管理后台**: https://expense-sharing-system.zeabur.app/admin

### 2. 健康检查响应
正常响应应该包含：
```json
{
  "status": "OK",
  "environment": "production",
  "database": "Connected",
  "websocket": {...},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 数据库初始化

首次部署后，需要初始化数据库：

### 方法1: 自动初始化（推荐）
系统会自动执行数据库初始化脚本。

### 方法2: 手动初始化
如果需要手动初始化：

1. **连接到数据库**
   ```sql
   -- 创建数据库
   CREATE DATABASE prod_expense_system;
   
   -- 执行初始化脚本
   \i scripts/init-prod-database.sql
   ```

2. **或使用脚本**
   ```bash
   cd Server-side
   npm run zeabur:init
   ```

## 环境变量说明

### 必需的环境变量
| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| DB_HOST | 数据库主机 | your-postgres-host.zeabur.com |
| DB_PORT | 数据库端口 | 5432 |
| DB_USER | 数据库用户 | your-database-user |
| DB_PASSWORD | 数据库密码 | your-database-password |
| DB_NAME | 数据库名称 | prod_expense_system |
| JWT_SECRET | JWT密钥 | 强密码字符串 |

### 可选的环境变量
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| REDIS_HOST | Redis主机 | localhost |
| REDIS_PORT | Redis端口 | 6379 |

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查环境变量是否正确
   - 确认数据库服务已启动
   - 检查网络连接

2. **前端资源404**
   - 确认前端构建成功
   - 检查静态文件路径配置

3. **端口冲突**
   - 确保PORT环境变量未被占用

### 日志查看
在 Zeabur 控制台查看部署日志：
- 项目页面 → 服务 → 日志

## 更新部署

当代码更新时：

1. 推送代码到 GitHub
2. Zeabur 会自动重新部署
3. 或手动触发重新部署

## 成本估算

Zeabur 提供免费额度：
- 计算资源: 免费额度充足
- 数据库: PostgreSQL 有免费套餐
- 网络流量: 免费额度足够日常使用

## 安全建议

1. **使用强密码**
   - JWT_SECRET 使用复杂字符串
   - 数据库密码定期更换

2. **环境变量保护**
   - 敏感信息只存储在环境变量中
   - 不要提交到代码仓库

3. **定期备份**
   - 定期备份数据库
   - 重要数据多重备份

## 联系方式

如有部署问题，请联系：
- 项目维护者
- Zeabur 官方支持