# 数据库表初始化说明

## 概述

本目录包含了记账系统数据库表初始化的相关脚本，用于在所有环境（开发、测试、生产）中创建必要的数据库表结构。

## 文件说明

- `init_postgres_v18.sql` - PostgreSQL数据库表结构定义脚本，包含所有表、枚举类型、索引等
- `init_dev.sql` - 开发环境数据库初始化脚本
- `init_test.sql` - 测试环境数据库初始化脚本
- `init_prod.sql` - 生产环境数据库初始化脚本
- `ensure-all-tables.js` - Node.js脚本，用于确保所有环境的数据库表都已创建
- `init-database.bat` - Windows批处理脚本，方便在Windows环境下执行数据库初始化

## 使用方法

### 方法1：使用Node.js脚本（推荐）

1. 确保已安装Node.js和PostgreSQL
2. 确保PostgreSQL服务正在运行
3. 在Server-side目录下执行以下命令：

```bash
# 初始化所有环境
node ensure-all-tables.js all

# 仅初始化开发环境
node ensure-all-tables.js dev

# 仅初始化测试环境
node ensure-all-tables.js test

# 仅初始化生产环境
node ensure-all-tables.js prod
```

### 方法2：使用Windows批处理脚本（仅限Windows）

1. 双击运行 `init-database.bat` 文件
2. 或在命令行中执行：
   ```bash
   init-database.bat [all|dev|test|prod]
   ```

### 方法3：使用psql命令行工具

1. 设置密码环境变量：
   ```bash
   set PGPASSWORD=123456789
   ```

2. 执行初始化脚本：
   ```bash
   # 开发环境
   psql -h localhost -p 5432 -U postgres -d expense_dev -f "Server-side/db/init_postgres_v18.sql"
   
   # 测试环境
   psql -h localhost -p 5432 -U postgres -d expense_test -f "Server-side/db/init_postgres_v18.sql"
   
   # 生产环境
   psql -h localhost -p 5432 -U postgres -d expense_prod -f "Server-side/db/init_postgres_v18.sql"
   ```

## 数据库配置

默认的数据库配置如下：

- 主机: localhost
- 端口: 5432
- 用户名: postgres
- 密码: 123456789
- 数据库名:
  - 开发环境: expense_dev
  - 测试环境: expense_test
  - 生产环境: expense_prod

如果需要修改这些配置，请编辑 `.env` 文件或修改 `ensure-all-tables.js` 脚本中的环境配置。

## 验证数据库表

执行完初始化脚本后，可以使用以下命令验证数据库表是否已创建：

```bash
# 设置密码环境变量
set PGPASSWORD=123456789

# 检查开发环境
psql -h localhost -p 5432 -U postgres -d expense_dev -c "\dt"

# 检查测试环境
psql -h localhost -p 5432 -U postgres -d expense_test -c "\dt"

# 检查生产环境
psql -h localhost -p 5432 -U postgres -d expense_prod -c "\dt"
```

每个环境应该显示47个表。

## 注意事项

1. 执行脚本前请确保PostgreSQL服务正在运行
2. 确保数据库用户有创建数据库和表的权限
3. 如果数据库已存在，脚本不会重新创建，只会执行表结构初始化
4. 脚本执行过程中会显示详细的日志信息，可用于排查问题

## 故障排除

如果遇到问题，请检查：

1. PostgreSQL服务是否正在运行
2. 数据库连接参数是否正确
3. 数据库用户是否有足够的权限
4. SQL脚本路径是否正确

如果问题仍然存在，请查看脚本输出的错误信息，或联系开发人员获取帮助。