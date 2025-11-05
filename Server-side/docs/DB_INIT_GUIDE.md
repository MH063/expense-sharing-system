# 多环境数据库初始化指南（PostgreSQL 18）

本指南说明如何在开发/测试/生产三套环境下创建独立数据库并导入统一初始化脚本。

## 目录与脚本
- 统一初始化脚本：`Server-side/db/init_postgres_v18.sql`
- 一键初始化全部环境：`Server-side/db/init_all_envs.sql`
- 单环境便捷脚本：
  - 开发：`Server-side/db/init_dev.sql`
  - 测试：`Server-side/db/init_test.sql`
  - 生产：`Server-side/db/init_prod.sql`

## 创建数据库并导入（推荐）
使用具备创建数据库权限的账号执行：
```bash
# Windows PowerShell 示例（需已安装 psql 并在 PATH 中）
psql -U postgres -h localhost -f "Server-side/db/init_all_envs.sql"
```
脚本会自动：
- 创建数据库：`expense_dev`, `expense_test`, `expense_prod`
- 依次导入统一 schema 和必要初始化数据（含示例管理员/角色/权限）

如只初始化单个环境：
```bash
# 以开发环境为例
psql -U postgres -h localhost -c "CREATE DATABASE expense_dev" || echo 已存在
psql -U postgres -h localhost -f "Server-side/db/init_dev.sql"
```

## 环境变量与连接
服务端已提供三套环境变量文件：
- `Server-side/.env.development`：`DB_NAME=expense_dev`
- `Server-side/.env.test`：`DB_DIALECT=postgres`，`DB_NAME=expense_test`
- `Server-side/.env.production`：`DB_NAME=expense_prod`

> 你可按需修改 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD`，并在生产开启 `DB_SSL=true`。

## 运行与验证
- 开发：`NODE_ENV=development npm run dev`
- 测试：`NODE_ENV=test npm test`
- 生产：`NODE_ENV=production npm start`

验证数据库连接（Node 端会打印连接信息），或直接使用 psql：
```bash
psql -U postgres -h localhost -d expense_dev -c "\dt"
```

## 种子数据
初始化脚本已包含：
- 管理端初始用户：`admin`（占位密码哈希）
- 系统角色：`super_admin`
- 最小权限集与角色权限绑定

如需更改初始口令，请更新 `init_postgres_v18.sql` 中 `admin_users.password_hash`。

## 注意事项
- 脚本使用 `\set ON_ERROR_STOP on` 与事务保护，失败会中止
- 重复执行具备幂等性（IF NOT EXISTS/ON CONFLICT DO NOTHING）
- 如远程数据库，请使用对应主机与凭据
