# 数据库初始化说明

## 概述

本目录包含用于创建和初始化记账系统数据库的SQL脚本。根据不同的运行环境（开发、测试、生产），我们提供了相应的数据库创建脚本。

## 数据库创建脚本

### 1. 开发环境
- **脚本文件**: [create-database-dev.sql](create-database-dev.sql)
- **数据库名称**: `expense_dev`
- **使用命令**: `npm run init:database:dev`

### 2. 测试环境
- **脚本文件**: [create-database-test.sql](create-database-test.sql)
- **数据库名称**: `expense_test`
- **使用命令**: `npm run init:database:test`

### 3. 生产环境
- **脚本文件**: [create-database-prod.sql](create-database-prod.sql)
- **数据库名称**: `expense_prod`
- **使用命令**: `npm run init:database:prod`

## 使用步骤

### 1. 创建数据库
```bash
# 开发环境
npm run init:database:dev

# 测试环境
npm run init:database:test

# 生产环境
npm run init:database:prod
```

### 2. 初始化表结构
```bash
# 开发环境
npm run schema:dev

# 测试环境
npm run schema:test

# 生产环境
npm run schema:prod
```

## 注意事项

1. 执行数据库创建脚本前，请确保已安装并启动PostgreSQL数据库服务
2. 确保当前用户具有创建数据库的权限（通常需要postgres用户权限）
3. 生产环境脚本采用安全的创建方式，不会删除已存在的数据库
4. 开发和测试环境脚本会删除已存在的同名数据库，请谨慎使用
5. 数据库创建完成后，请确保相应的环境配置文件（.env.development, .env.test, .env.production）已正确配置数据库连接信息

## 环境配置

各环境的数据库连接信息配置在以下文件中：
- 开发环境: [.env.development](../.env.development)
- 测试环境: [.env.test](../.env.test)
- 生产环境: [.env.production](../.env.production)

本地开发时，建议在项目根目录创建 `.env` 文件来覆盖默认配置，包含真实的数据库密码等敏感信息.
