# 数据库初始化说明

## 概述

本目录包含用于创建和初始化记账系统数据库的SQL脚本。系统提供了完整的数据库初始化流程，包括数据库创建、表结构初始化、数据验证等功能。

## 数据库文件说明

### 1. 数据库创建脚本

| 文件名 | 描述 | 使用场景 |
|--------|------|----------|
| [create-database-dev.sql](create-database-dev.sql) | 开发环境数据库创建脚本 | 开发环境初始化 |
| [create-database-test.sql](create-database-test.sql) | 测试环境数据库创建脚本 | 测试环境初始化 |
| [create-database-prod.sql](create-database-prod.sql) | 生产环境数据库创建脚本 | 生产环境初始化 |
| [create-database.sql](create-database.sql) | 通用数据库创建脚本 | 自定义环境初始化 |

### 2. 数据库初始化脚本

| 文件名 | 描述 | 使用场景 |
|--------|------|----------|
| [init-database.sql](init-database.sql) | 数据库表结构和初始数据初始化脚本 | 所有环境表结构初始化 |

## 数据库初始化流程

### 1. 创建数据库

使用统一的初始化脚本创建不同环境的数据库：

```bash
# 开发环境
npm run init:database:dev

# 测试环境
npm run init:database:test

# 生产环境
npm run init:database:prod
```

这些命令会执行以下操作：
1. 根据环境参数选择对应的SQL脚本
2. 执行数据库创建脚本
3. 验证数据库是否创建成功
4. 提供下一步操作提示

### 2. 初始化表结构

使用数据库表结构创建工具初始化表结构：

```bash
# 开发环境
npm run schema:dev

# 测试环境
npm run schema:test

# 生产环境
npm run schema:prod
```

这些命令会执行以下操作：
1. 读取环境配置
2. 连接到对应数据库
3. 执行表结构创建脚本
4. 验证表结构是否创建成功
5. 生成详细的执行报告

### 3. 数据库结构验证

使用数据库结构检查工具验证数据库结构：

```bash
# 检查数据库结构
node scripts/check-database-structure.js

# 检查数据库表
node scripts/check-database-tables.js

# 检查用户表
node scripts/check-users-table.js
```

### 4. 数据库一致性保证

使用数据库一致性工具确保数据库结构一致：

```bash
# 确保数据库一致性
node scripts/ensure-database-consistency.js

# 同步数据库表
node scripts/sync-database-tables.js
```

## 数据库初始化脚本详解

### 1. init-database.js

统一的数据库初始化脚本，根据环境参数创建相应环境的数据库：

- 支持开发、测试、生产三种环境
- 自动选择对应的SQL脚本
- 提供详细的执行日志
- 验证数据库创建结果

### 2. create-database-schema.js

数据库表结构创建工具，提供完整的表结构创建功能：

- 支持命令行参数配置
- 提供详细的日志记录
- 支持表结构验证
- 生成详细的执行报告

### 3. database-schema-creator.js

数据库表结构创建核心类，提供底层功能：

- 支持多种数据库连接方式
- 提供表结构创建和验证
- 支持事务处理
- 提供错误处理和重试机制

## 环境配置

### 1. 环境变量配置

各环境的数据库连接信息配置在以下文件中：

| 环境 | 配置文件 | 数据库名称 |
|------|----------|------------|
| 开发环境 | [.env.development](../.env.development) | expense_dev |
| 测试环境 | [.env.test](../.env.test) | expense_test |
| 生产环境 | [.env.production](../.env.production) | expense_prod |

### 2. 本地配置覆盖

本地开发时，可以在项目根目录创建 `.env` 文件来覆盖默认配置：

```bash
# 本地环境配置示例
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_dev
DB_USER=postgres
DB_PASSWORD=your_real_password
DB_SSL=false
```

### 3. 环境变量加载顺序

系统按以下优先级顺序加载环境变量：

1. **命令行参数** (最高优先级)
   - 例如: `--log-level debug`, `--port 3001`

2. **本地环境变量文件** (`.env`)
   - 包含真实密码和本地特定配置
   - 不应提交到版本控制系统

3. **环境特定配置文件** (`.env.{NODE_ENV}`)
   - 例如: `.env.development`, `.env.production`, `.env.test`

4. **系统环境变量** (最低优先级)

## 数据库表结构

### 1. 核心表结构

系统包含以下核心表：

- **users** - 用户表
- **expenses** - 费用记录表
- **payments** - 支付记录表
- **balances** - 余额表
- **categories** - 费用分类表
- **groups** - 用户组表
- **user_groups** - 用户组成员表
- **settlements** - 结算记录表
- **notifications** - 通知表
- **audit_logs** - 审计日志表

### 2. 扩展表结构

系统还包含以下扩展表：

- **user_preferences** - 用户偏好设置表
- **payment_methods** - 支付方式表
- **recurring_expenses** - 周期性费用表
- **expense_attachments** - 费用附件表
- **qr_codes** - 二维码表
- **leave_records** - 离寝记录表
- **payment_optimization** - 支付优化表

## 数据库初始化最佳实践

### 1. 开发环境

1. 使用 `npm run init:database:dev` 创建开发数据库
2. 使用 `npm run schema:dev` 初始化表结构
3. 使用 `node scripts/create-test-user.js` 创建测试用户
4. 使用 `node scripts/setup-leave-records.js` 设置离寝记录

### 2. 测试环境

1. 使用 `npm run init:database:test` 创建测试数据库
2. 使用 `npm run schema:test` 初始化表结构
3. 使用 `npm run test` 运行测试套件
4. 使用 `npm run test:integration` 运行集成测试

### 3. 生产环境

1. 使用 `npm run init:database:prod` 创建生产数据库
2. 使用 `npm run schema:prod` 初始化表结构
3. 使用 `node scripts/reset-admin-password.js` 重置管理员密码
4. 配置定期备份和监控

## 故障排除

### 1. 数据库连接问题

如果遇到数据库连接问题：

1. 检查数据库服务是否正在运行
2. 验证数据库配置是否正确
3. 检查数据库用户名和密码是否正确
4. 确认数据库防火墙设置

### 2. 表结构创建问题

如果遇到表结构创建问题：

1. 检查SQL文件是否存在且格式正确
2. 验证数据库用户是否有创建表的权限
3. 检查数据库磁盘空间是否充足
4. 查看详细错误日志

### 3. 数据库初始化脚本问题

如果遇到数据库初始化脚本问题：

1. 检查Node.js版本是否兼容
2. 验证依赖包是否正确安装
3. 检查环境变量是否正确设置
4. 查看脚本执行日志

## 高级功能

### 1. 数据库结构检查

系统提供了多种数据库结构检查工具：

```bash
# 检查数据库结构
node scripts/check-database-structure.js

# 检查数据库表
node scripts/check-database-tables.js

# 检查用户表
node scripts/check-users-table.js
```

### 2. 数据库结构修复

如果发现数据库结构问题，可以使用修复工具：

```bash
# 修复数据库结构
node scripts/fix-database-structure.js

# 同步数据库表
node scripts/sync-database-tables.js
```

### 3. 数据库一致性保证

使用一致性工具确保数据库结构一致：

```bash
# 确保数据库一致性
node scripts/ensure-database-consistency.js
```

## 总结

通过合理使用数据库初始化脚本和工具，可以确保数据库结构的一致性和完整性。遵循本文档中的最佳实践，可以帮助您更好地管理和维护数据库。
