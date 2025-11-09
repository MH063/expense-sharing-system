# 数据库表结构创建工具使用指南

## 概述

数据库表结构创建工具是一个用于安全连接数据库并执行SQL文件以创建所需数据表结构的工具。它提供了完整的数据库连接配置、SQL文件处理、执行日志管理、错误处理和结果报告功能。

## 功能特性

1. **数据库连接配置与验证**
   - 支持自定义数据库连接参数（主机地址、端口号、数据库名称、用户名、密码等）
   - 实现连接超时检测与重试机制
   - 验证数据库用户是否具备创建表、插入数据等必要操作权限

2. **SQL文件处理与验证**
   - 支持相对路径和绝对路径的SQL文件路径解析
   - 对SQL文件进行完整性校验，确保文件未损坏且内容完整
   - 执行SQL语法预检查，验证SQL语句的语法正确性

3. **执行过程与日志管理**
   - 实现详细的执行日志记录机制，记录连接状态、执行步骤、耗时、错误信息等
   - 支持分级日志（INFO/WARN/ERROR）并输出到控制台和日志文件
   - 实现SQL语句分批执行功能，支持事务管理，确保操作的原子性

4. **错误处理与异常管理**
   - 针对可能出现的数据库连接错误、权限不足问题、SQL执行异常等情况，实现具体的错误捕获和处理机制
   - 提供清晰的错误提示信息，包括错误类型、位置和可能的解决方案
   - 实现执行中断后的恢复机制或回滚策略

5. **执行结果确认与报告**
   - 在所有表格成功创建后，自动验证表结构和初始数据是否符合预期
   - 生成执行结果报告，包含成功创建的表数量、执行耗时、遇到的警告等信息
   - 提供明确的成功确认信息，确保用户能够清晰判断操作是否完成

## 安装与配置

### 依赖项

工具依赖以下Node.js包：
- `pg` - PostgreSQL客户端
- `winston` - 日志记录库

确保在项目中已安装这些依赖：
```bash
npm install pg winston
```

### 环境变量

工具支持通过环境变量配置数据库连接参数：
- `DB_HOST` - 数据库主机地址（默认：localhost）
- `DB_PORT` - 数据库端口号（默认：5432）
- `DB_USER` - 数据库用户名（默认：postgres）
- `DB_PASSWORD` - 数据库密码（默认：************）
- `DB_NAME` - 数据库名称（默认：expense_dev）

## 使用方法

### 命令行使用

#### 基本用法

```bash
node create-database-schema.js <SQL文件路径>
```

#### 完整参数示例

```bash
node create-database-schema.js \
  --host localhost \
  --port 5432 \
  --user postgres \
  --password mypassword \
  --database mydb \
  --log-level debug \
  --log-file ./my-schema-creation.log \
  --timeout 15000 \
  --max-retries 5 \
  ../db/init_postgres_v18.sql
```

#### 参数说明

- `--host <主机地址>` - 数据库主机地址（默认：localhost）
- `--port <端口号>` - 数据库端口号（默认：5432）
- `--user <用户名>` - 数据库用户名（默认：postgres）
- `--password <密码>` - 数据库密码（默认：123456789）
- `--database <数据库名>` - 数据库名称（默认：expense_dev）
- `--log-level <日志级别>` - 日志级别（error, warn, info, debug，默认：info）
- `--log-file <日志文件>` - 日志文件路径（默认：./database-schema-creator.log）
- `--timeout <毫秒>` - 连接超时时间（默认：10000）
- `--max-retries <次数>` - 最大重试次数（默认：3）
- `--help` - 显示帮助信息

### 编程接口使用

#### 基本用法

```javascript
const DatabaseSchemaCreator = require('./database-schema-creator');

// 创建实例
const creator = new DatabaseSchemaCreator();

// 执行表结构创建
creator.executeSchemaCreation('../db/init_postgres_v18.sql')
  .then(report => {
    console.log('执行结果:', report);
  })
  .catch(error => {
    console.error('执行失败:', error);
  });
```

#### 自定义配置

```javascript
const DatabaseSchemaCreator = require('./database-schema-creator');

// 创建实例，自定义配置
const creator = new DatabaseSchemaCreator({
  dbConfig: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'mypassword',
    database: 'mydb'
  },
  logLevel: 'debug',
  logFile: './my-schema-creation.log',
  connectionTimeout: 15000,
  maxRetries: 5
});

// 执行表结构创建
creator.executeSchemaCreation('../db/init_postgres_v18.sql')
  .then(report => {
    console.log('执行结果:', report);
  })
  .catch(error => {
    console.error('执行失败:', error);
  });
```

## 执行报告说明

执行完成后，工具会生成一个详细的执行报告，包含以下信息：

```javascript
{
  success: true,                    // 执行是否成功
  duration: {                       // 执行时间
    milliseconds: 12345,
    seconds: 12.35,
    formatted: "12秒"
  },
  tablesCreated: 25,                 // 创建的表数量
  tablesVerified: 25,                // 验证的表数量
  errors: [],                        // 错误列表
  warnings: [],                      // 警告列表
  startTime: "2023-01-01T10:00:00.000Z",  // 开始时间
  endTime: "2023-01-01T10:00:12.345Z"    // 结束时间
}
```

## 日志文件

工具会生成详细的日志文件，记录执行过程中的所有信息，包括：

- 数据库连接状态
- SQL文件验证结果
- SQL语句执行情况
- 错误和警告信息
- 性能指标

日志文件默认保存在当前工作目录下的`database-schema-creator.log`，可以通过`--log-file`参数自定义路径。

## 常见问题与解决方案

### 连接超时

**问题**: 连接数据库时出现超时错误。

**解决方案**:
1. 检查数据库服务是否正在运行
2. 确认数据库连接参数是否正确
3. 增加连接超时时间：`--timeout 20000`

### 权限不足

**问题**: 用户没有创建表或插入数据的权限。

**解决方案**:
1. 使用具有足够权限的数据库用户
2. 或者联系数据库管理员为当前用户分配必要的权限

### SQL文件错误

**问题**: SQL文件格式错误或包含语法错误。

**解决方案**:
1. 检查SQL文件路径是否正确
2. 验证SQL文件内容是否符合PostgreSQL语法规范
3. 使用`--log-level debug`获取更详细的错误信息

### 部分表已存在

**问题**: 执行过程中报告部分表已存在。

**解决方案**:
1. 工具会自动忽略"已存在"错误，这是正常行为
2. 如果需要完全重新创建表，请先手动删除现有表

## 示例场景

### 开发环境初始化

```bash
# 使用默认配置初始化开发环境数据库
node create-database-schema.js ../db/init_postgres_v18.sql
```

### 生产环境部署

```bash
# 使用生产环境配置初始化生产数据库
node create-database-schema.js \
  --host prod-db.example.com \
  --port 5432 \
  --user prod_user \
  --password secure_password \
  --database prod_expense_db \
  --log-level warn \
  ../db/init_postgres_v18.sql
```

### 调试模式

```bash
# 使用调试模式执行，获取详细日志
node create-database-schema.js \
  --log-level debug \
  --log-file ./debug-schema-creation.log \
  ../db/init_postgres_v18.sql
```

## 注意事项

1. **备份数据**: 在生产环境执行前，请确保已备份现有数据
2. **权限检查**: 确保数据库用户具有足够的权限
3. **SQL文件验证**: 执行前请验证SQL文件内容的正确性
4. **网络稳定性**: 确保网络连接稳定，避免执行过程中断
5. **日志监控**: 执行过程中请关注日志输出，及时发现并处理问题

## 技术支持

如果在使用过程中遇到问题，请：

1. 查看日志文件获取详细错误信息
2. 检查数据库连接配置是否正确
3. 确认SQL文件内容是否符合要求
4. 联系技术支持团队获取帮助