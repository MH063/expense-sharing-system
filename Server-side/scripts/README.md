# 脚本工具集合

这个目录包含了用于数据库管理、测试和系统维护的各种脚本工具。

## 脚本分类

### 1. 数据库管理脚本

#### 数据库初始化
- **init-database.js**: 统一数据库初始化脚本，根据环境参数创建相应环境的数据库

#### 数据库表结构创建与检查
- **database-schema-creator.js**: 数据库表结构创建工具的核心实现
- **create-database-schema.js**: 数据库表结构创建工具的命令行接口
- **database-schema-creator-examples.js**: 数据库表结构创建工具的使用示例
- **DATABASE_SCHEMA_CREATOR_GUIDE.md**: 数据库表结构创建工具的使用指南

#### 数据库表结构检查与修复
- **check-database-structure.js**: 检查数据库表结构的脚本
- **check-database-tables.js**: 检查数据库表和视图的脚本
- **check-users-table.js**: 检查users表结构的脚本
- **ensure-database-consistency.js**: 确保数据库一致性的脚本
- **fix-database-structure.js**: 修复数据库表结构的脚本
- **sync-database-tables.js**: 同步数据库表结构的脚本

#### 数据库初始化与测试数据
- **create-test-database.js**: 创建测试数据库的脚本
- **create-test-user.js**: 创建测试用户的脚本
- **create-qr-code-tables.js**: 创建收款码相关表的脚本
- **setup-leave-records.js**: 设置离寝记录的脚本

#### 部署相关
- **zeabur-init.js**: Zeabur部署初始化脚本

### 2. 系统管理脚本

#### 用户管理
- **reset-admin-password.js**: 重置管理员密码的脚本

#### 测试与自动化
- **run-payment-optimization-tests.js**: 运行支付流程优化测试的脚本
- **automation-runner.js**: 自动化测试系统启动脚本
- **scheduler.js**: 自动化测试调度器

#### 文档一致性检查
- **docs-consistency-check.js**: 检查文档与服务器路由一致性的脚本

## 使用方法

### 1. 数据库初始化

#### 初始化数据库
```bash
cd "c:\\Users\\MH\\Desktop\\记账系统\\Server-side\\scripts"

# 开发环境
node init-database.js development

# 测试环境
node init-database.js test

# 生产环境
node init-database.js production
```

或者使用npm脚本：
```bash
# 开发环境
npm run init:database:dev

# 测试环境
npm run init:database:test

# 生产环境
npm run init:database:prod
```

### 2. 数据库表结构管理

#### 创建数据库表结构
```bash
# 开发环境
npm run schema:dev

# 测试环境
npm run schema:test

# 生产环境
npm run schema:prod
```

#### 检查数据库表结构
```bash
node check-database-structure.js
```

#### 修复数据库表结构
```bash
node fix-database-structure.js
```

#### 同步数据库表结构
```bash
node sync-database-tables.js
```

### 3. 数据库初始化与测试数据

#### 创建测试数据库
```bash
node create-test-database.js
```

#### 创建测试用户
```bash
node create-test-user.js
```

#### 创建收款码相关表
```bash
node create-qr-code-tables.js
```

#### 设置离寝记录
```bash
node setup-leave-records.js
```

### 4. 系统管理

#### 重置管理员密码
```bash
node reset-admin-password.js
```

#### 运行支付流程优化测试
```bash
node run-payment-optimization-tests.js
```

#### 启动自动化测试调度器
```bash
node scheduler.js
```

#### 运行完整自动化测试套件
```bash
node automation-runner.js
```

### 5. 文档一致性检查

#### 检查文档与服务器路由一致性
```bash
node docs-consistency-check.js
```

## 脚本详细说明

### 数据库初始化工具

- **init-database.js**: 统一数据库初始化脚本，根据环境参数创建相应环境的数据库
  - 支持开发、测试、生产三种环境
  - 自动选择对应的SQL脚本
  - 提供详细的执行日志
  - 验证数据库创建结果

### 数据库表结构创建工具

这些脚本用于创建和管理数据库表结构：

- **database-schema-creator.js**: 核心实现，提供数据库连接、SQL执行等功能
- **create-database-schema.js**: 命令行接口，支持多种参数配置
- **database-schema-creator-examples.js**: 使用示例，展示如何调用核心功能
- **DATABASE_SCHEMA_CREATOR_GUIDE.md**: 详细使用指南

### 数据库表结构检查与修复工具

这些脚本用于检查和修复数据库表结构问题：

- **check-database-structure.js**: 检查表结构是否与SQL文件一致
- **check-database-tables.js**: 检查表和视图是否存在
- **check-users-table.js**: 专门检查users表结构
- **ensure-database-consistency.js**: 确保数据库一致性
- **fix-database-structure.js**: 修复表结构问题
- **sync-database-tables.js**: 同步不同环境的表结构

### 数据库初始化与测试数据工具

这些脚本用于初始化数据库和创建测试数据：

- **create-test-database.js**: 创建测试数据库
- **create-test-user.js**: 创建测试用户
- **create-qr-code-tables.js**: 创建收款码相关表
- **setup-leave-records.js**: 设置离寝记录

### 系统管理工具

这些脚本用于系统管理：

- **reset-admin-password.js**: 重置管理员密码
- **run-payment-optimization-tests.js**: 运行支付流程优化测试
- **automation-runner.js**: 自动化测试系统启动脚本
- **scheduler.js**: 自动化测试调度器
- **docs-consistency-check.js**: 检查文档与服务器路由一致性

## 新增脚本功能说明

### 1. init-database.js

统一的数据库初始化脚本，根据环境参数创建相应环境的数据库：

```bash
# 语法
node init-database.js [环境]

# 示例
node init-database.js development
node init-database.js test
node init-database.js production
```

功能特点：
- 支持开发、测试、生产三种环境
- 自动选择对应的SQL脚本
- 提供详细的执行日志
- 验证数据库创建结果
- 提供下一步操作提示

### 2. setup-leave-records.js

设置离寝记录的脚本：

```bash
# 语法
node setup-leave-records.js [选项]

# 示例
node setup-leave-records.js
node setup-leave-records.js --user-id 1 --start-date 2023-01-01 --end-date 2023-01-31
```

功能特点：
- 支持命令行参数配置
- 支持批量创建离寝记录
- 提供详细的执行日志
- 验证数据有效性

### 3. run-payment-optimization-tests.js

运行支付流程优化测试的脚本：

```bash
# 语法
node run-payment-optimization-tests.js [选项]

# 示例
node run-payment-optimization-tests.js
node run-payment-optimization-tests.js --verbose
node run-payment-optimization-tests.js --test-id 123
```

功能特点：
- 支持多种测试场景
- 提供详细的测试报告
- 支持测试结果导出
- 支持自定义测试参数

## 注意事项

1. 运行数据库相关脚本前，请确保数据库服务已启动
2. 修改数据库结构前，建议先备份数据
3. 运行测试脚本前，请确保相关服务已启动
4. 使用Zeabur部署脚本时，请确保环境变量已正确配置
5. 环境变量加载顺序：确保本地 .env 文件中的真实密码优先级高于环境特定配置文件中的占位符密码

## 故障排除

### 1. 数据库连接失败
- 检查数据库服务是否启动
- 检查数据库连接配置是否正确
- 确认数据库用户权限
- 验证环境变量是否正确设置

### 2. 脚本执行失败
- 查看错误日志了解具体原因
- 检查依赖是否正确安装
- 确认文件路径是否正确
- 验证Node.js版本是否兼容

### 3. 测试失败
- 检查相关服务是否正常运行
- 查看测试日志了解具体错误
- 确认测试环境是否正确配置
- 验证测试数据是否正确

## 技术支持

如有问题，请查看日志文件或联系系统管理员。

## 扩展功能

1. **添加新的数据库管理脚本**：在scripts目录中添加新的脚本文件
2. **添加新的系统管理工具**：根据需要添加新的管理脚本
3. **集成更多测试功能**：在现有测试脚本基础上添加新的测试场景
4. **自定义脚本功能**：根据具体需求修改现有脚本或创建新脚本

## 最佳实践

1. **脚本开发**：
   - 使用清晰的函数和变量命名
   - 添加详细的注释和文档
   - 实现错误处理和日志记录
   - 支持命令行参数配置

2. **脚本测试**：
   - 编写单元测试和集成测试
   - 在不同环境中验证脚本功能
   - 定期检查脚本兼容性

3. **脚本维护**：
   - 定期更新脚本以适应系统变化
   - 维护详细的变更日志
   - 提供清晰的使用文档