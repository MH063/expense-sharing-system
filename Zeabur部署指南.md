# Zeabur部署指南

本指南详细说明如何将记账系统部署到Zeabur云平台。

## 前置条件

1. 拥有Zeabur账户
2. 已创建GitHub仓库并推送代码
3. 已配置GitHub Actions（可选，用于自动部署）

## 部署步骤

### 1. 准备项目

确保项目已推送到GitHub仓库，并且包含以下关键文件：

- `.zeabur/deploy.json` - Zeabur部署配置
- `.zeabur/build.json` - 构建配置
- `Server-side/.env.production` - 生产环境配置
- `Server-side/Dockerfile` - Docker配置（可选）

### 2. 创建Zeabur服务

1. 登录Zeabur控制台
2. 点击"创建新服务"
3. 选择"从GitHub导入"
4. 选择您的记账系统仓库
5. 选择"Node.js"作为服务类型

### 3. 配置环境变量

在Zeabur控制台中设置以下环境变量：

#### 必需的环境变量

```
NODE_ENV=production
PORT=4000

# 数据库配置（Zeabur PostgreSQL服务）
DB_HOST=zeabur-db-host
DB_PORT=5432
DB_USER=zeabur-db-user
DB_PASSWORD=your_zeabur_db_password_here
DB_NAME=expense_prod
DB_SSL=true

# Redis配置（Zeabur Redis服务）
REDIS_HOST=zeabur-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your_zeabur_redis_password_here

# JWT配置（必须设置强密钥）
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secure-jwt-refresh-secret-key-min-32-chars
```

#### 可选的环境变量

```
# 日志配置
LOG_LEVEL=warn

# 安全配置
ENABLE_CORS_ALL=false
ENABLE_RATE_LIMITING=true
RATE_LIMIT_MAX=50

# 文件上传配置
MAX_FILE_SIZE=3
```

### 4. 配置数据库

1. 在Zeabur控制台中创建PostgreSQL服务
2. 创建Redis服务
3. 获取数据库连接信息并更新环境变量
4. 部署后，系统会自动创建数据库表结构

### 5. 配置域名（可选）

1. 在Zeabur控制台中添加自定义域名
2. 配置DNS记录指向Zeabur提供的IP地址
3. 启用SSL证书（Zeabur自动提供）

### 6. 部署验证

部署完成后，验证以下功能：

1. 访问 `https://your-domain.zeabur.app/api/health` 检查健康状态
2. 访问 `https://your-domain.zeabur.app` 检查前端应用
3. 测试用户注册和登录功能

## 部署配置详解

### deploy.json 配置

```json
{
  "name": "expense-sharing-system",
  "description": "寝室费用分摊记账系统",
  "type": "nodejs",
  "build": {
    "command": "cd Server-side && npm ci --only=production",
    "output": "Server-side"
  },
  "run": {
    "command": "cd Server-side && npm start",
    "workingDirectory": "Server-side"
  },
  "env": {
    "NODE_ENV": "production",
    "PORT": "4000"
  },
  "domains": [
    "expense-sharing-system.zeabur.app"
  ],
  "services": {
    "postgresql": {
      "version": "15",
      "plan": "starter"
    },
    "redis": {
      "version": "7",
      "plan": "starter"
    }
  },
  "healthCheck": {
    "path": "/api/health",
    "interval": 30,
    "timeout": 5,
    "retries": 3
  }
}
```

### build.json 配置

```json
{
  "buildCommand": "cd Server-side && npm ci --only=production",
  "outputDirectory": "Server-side",
  "installCommand": "cd Server-side && npm ci --only=production",
  "startCommand": "cd Server-side && npm start",
  "nodeVersion": "18",
  "environment": "production"
}
```

## 常见问题与解决方案

### 1. 部署失败

**问题**: 部署过程中出现构建错误

**解决方案**:
- 检查package.json中的依赖是否正确
- 确保所有依赖都在dependencies中，而不是devDependencies
- 检查环境变量是否正确设置

### 2. 数据库连接失败

**问题**: 应用无法连接到数据库

**解决方案**:
- 检查数据库服务是否已创建
- 验证数据库连接参数是否正确
- 确保数据库服务与应用服务在同一区域

### 3. 健康检查失败

**问题**: 健康检查端点返回错误

**解决方案**:
- 检查健康检查路由是否正确配置
- 确保所有依赖服务（数据库、Redis）正常运行
- 查看应用日志获取详细错误信息

### 4. 前端资源加载失败

**问题**: 前端页面无法正确加载

**解决方案**:
- 确保静态文件路径正确配置
- 检查CORS设置是否允许前端域名
- 验证前端构建文件是否存在

## 性能优化建议

1. **启用缓存**: 使用Redis缓存频繁访问的数据
2. **数据库优化**: 为常用查询添加索引
3. **CDN加速**: 使用Zeabur的CDN服务加速静态资源
4. **负载均衡**: 对于高流量应用，考虑使用负载均衡

## 监控与日志

1. **应用监控**: 使用Zeabur的监控功能跟踪应用性能
2. **日志管理**: 配置日志级别为`warn`或`error`减少日志量
3. **告警设置**: 设置关键指标告警，如错误率、响应时间等

## 安全建议

1. **强密码**: 使用强密码作为JWT密钥
2. **HTTPS**: 确保所有通信都通过HTTPS
3. **环境变量**: 不要在代码中硬编码敏感信息
4. **定期更新**: 定期更新依赖包以修复安全漏洞

## 备份策略

1. **数据库备份**: 定期备份PostgreSQL数据库
2. **代码备份**: 使用Git进行版本控制
3. **配置备份**: 保存环境变量和配置文件副本

## 扩展计划

随着用户增长，可以考虑以下扩展方案：

1. **服务拆分**: 将单体应用拆分为微服务
2. **数据库分片**: 对数据库进行水平分片
3. **多区域部署**: 在多个区域部署以提高可用性
4. **容器化**: 使用Docker容器化应用

## 总结

通过以上步骤，您可以成功将记账系统部署到Zeabur平台。Zeabur提供了简单易用的部署流程和丰富的服务集成，使您能够快速将应用推向生产环境。如有任何问题，请参考Zeabur官方文档或联系技术支持。