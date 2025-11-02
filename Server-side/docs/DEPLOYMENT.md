# 部署文档

## 概述

本文档描述了如何部署寝室费用分摊记账系统的后端服务。

## 系统要求

### 硬件要求

- **CPU**: 2核心或以上
- **内存**: 4GB或以上
- **存储**: 20GB或以上可用空间
- **网络**: 稳定的互联网连接

### 软件要求

- **操作系统**: Windows 10/11, Linux (Ubuntu 18.04+), macOS 10.15+
- **Node.js**: 16.x或更高版本
- **npm**: 8.x或更高版本
- **MySQL**: 8.0或更高版本
- **Redis**: 6.0或更高版本 (可选，用于缓存和会话管理)

## 环境准备

### 1. 安装Node.js

从[Node.js官网](https://nodejs.org/)下载并安装适合您操作系统的Node.js版本。

验证安装：
```bash
node --version
npm --version
```

### 2. 安装MySQL

#### Windows

1. 从[MySQL官网](https://dev.mysql.com/downloads/mysql/)下载MySQL安装程序
2. 运行安装程序，按照向导完成安装
3. 设置root用户密码
4. 配置MySQL服务

#### Linux (Ubuntu)

```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

#### macOS

```bash
brew install mysql
brew services start mysql
```

### 3. 安装Redis (可选)

#### Windows

1. 从[Redis官网](https://redis.io/download)下载Windows版本
2. 解压并运行redis-server.exe

#### Linux (Ubuntu)

```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### macOS

```bash
brew install redis
brew services start redis
```

## 数据库设置

### 1. 创建数据库

登录MySQL控制台：
```bash
mysql -u root -p
```

创建数据库：
```sql
CREATE DATABASE room_expense_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

创建数据库用户：
```sql
CREATE USER 'expense_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON room_expense_db.* TO 'expense_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. 导入数据库结构

```bash
mysql -u expense_user -p room_expense_db < database/schema.sql
```

## 应用部署

### 1. 获取源代码

```bash
git clone https://github.com/your-repo/room-expense-system.git
cd room-expense-system/Server-side
```

### 2. 安装依赖

```bash
npm install --production
```

### 3. 配置环境变量

创建`.env`文件：
```bash
cp .env.example .env
```

编辑`.env`文件，配置以下变量：
```env
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=room_expense_db
DB_USER=expense_user
DB_PASSWORD=your_password

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Redis配置 (可选)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log

# 文件上传配置
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=5242880

# CORS配置
CORS_ORIGIN=http://localhost:3001
```

### 4. 创建必要目录

```bash
mkdir -p logs uploads
```

### 5. 构建应用

```bash
npm run build
```

## 启动服务

### 开发模式

```bash
npm run dev
```

### 生产模式

#### 使用PM2 (推荐)

1. 安装PM2：
```bash
npm install -g pm2
```

2. 创建PM2配置文件 `ecosystem.config.js`：
```javascript
module.exports = {
  apps: [{
    name: 'room-expense-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
```

3. 启动应用：
```bash
pm2 start ecosystem.config.js
```

4. 查看状态：
```bash
pm2 status
```

5. 查看日志：
```bash
pm2 logs room-expense-api
```

#### 使用systemd (Linux)

1. 创建systemd服务文件 `/etc/systemd/system/room-expense-api.service`：
```ini
[Unit]
Description=Room Expense API
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/room-expense-system/Server-side
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=room-expense-api
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

2. 启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable room-expense-api
sudo systemctl start room-expense-api
```

3. 查看状态：
```bash
sudo systemctl status room-expense-api
```

4. 查看日志：
```bash
sudo journalctl -u room-expense-api -f
```

## 反向代理配置

### Nginx配置

创建Nginx配置文件 `/etc/nginx/sites-available/room-expense-api`：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/room-expense-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL配置 (Let's Encrypt)

1. 安装Certbot：
```bash
sudo apt install certbot python3-certbot-nginx
```

2. 获取SSL证书：
```bash
sudo certbot --nginx -d your-domain.com
```

3. 更新Nginx配置以支持HTTPS：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # 其他配置...
}
```

## 监控与日志

### 1. 应用监控

#### 使用PM2监控

```bash
pm2 monit
```

#### 使用健康检查端点

应用提供了健康检查端点：
```bash
curl http://localhost:3000/health
```

### 2. 日志管理

#### 日志轮转配置

创建logrotate配置文件 `/etc/logrotate.d/room-expense-api`：
```
/path/to/room-expense-system/Server-side/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 your_user your_user
    postrotate
        pm2 reload room-expense-api
    endscript
}
```

## 备份策略

### 1. 数据库备份

创建备份脚本 `backup-db.sh`：
```bash
#!/bin/bash

BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="room_expense_db"
DB_USER="expense_user"

mkdir -p $BACKUP_DIR

# 创建数据库备份
mysqldump -u $DB_USER -p $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# 压缩备份文件
gzip $BACKUP_DIR/db_backup_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete
```

设置定时任务：
```bash
crontab -e
```

添加以下行（每天凌晨2点执行备份）：
```
0 2 * * * /path/to/backup-db.sh
```

### 2. 应用文件备份

创建应用文件备份脚本 `backup-app.sh`：
```bash
#!/bin/bash

BACKUP_DIR="/path/to/backups"
APP_DIR="/path/to/room-expense-system/Server-side"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 创建应用文件备份
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C $APP_DIR .

# 删除30天前的备份
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +30 -delete
```

## 性能优化

### 1. 数据库优化

#### 添加索引

```sql
-- 用户表索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- 寝室表索引
CREATE INDEX idx_rooms_creator_id ON rooms(creator_id);

-- 费用表索引
CREATE INDEX idx_expenses_room_id ON expenses(room_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- 账单表索引
CREATE INDEX idx_bills_room_id ON bills(room_id);
CREATE INDEX idx_bills_created_by ON bills(created_by);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_due_date ON bills(due_date);

-- 费用分摊表索引
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);

-- 账单分摊表索引
CREATE INDEX idx_bill_splits_bill_id ON bill_splits(bill_id);
CREATE INDEX idx_bill_splits_user_id ON bill_splits(user_id);

-- 寝室成员表索引
CREATE INDEX idx_room_members_room_id ON room_members(room_id);
CREATE INDEX idx_room_members_user_id ON room_members(user_id);
```

#### 查询优化

- 使用适当的索引
- 避免SELECT *
- 使用LIMIT限制结果集
- 优化JOIN操作

### 2. 应用优化

#### 启用Gzip压缩

在Express中添加压缩中间件：
```javascript
const compression = require('compression');
app.use(compression());
```

#### 使用缓存

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10分钟缓存

// 缓存中间件
function cacheMiddleware(req, res, next) {
  const key = req.originalUrl;
  const cached = cache.get(key);
  
  if (cached) {
    return res.json(cached);
  }
  
  res.sendResponse = res.json;
  res.json = (body) => {
    cache.set(key, body);
    res.sendResponse(body);
  };
  
  next();
}
```

## 安全加固

### 1. 服务器安全

- 定期更新系统和软件包
- 配置防火墙，只开放必要端口
- 使用SSH密钥认证，禁用密码认证
- 禁用root登录
- 使用fail2ban防止暴力破解

### 2. 应用安全

- 使用HTTPS
- 设置安全HTTP头
- 实现请求速率限制
- 验证和清理所有输入
- 使用参数化查询防止SQL注入
- 实现CSP (Content Security Policy)

### 3. 数据库安全

- 使用强密码
- 限制数据库用户权限
- 定期备份数据
- 加密敏感数据

## 故障排除

### 1. 常见问题

#### 应用无法启动

检查以下几点：
- Node.js版本是否正确
- 依赖是否正确安装
- 环境变量是否正确设置
- 数据库连接是否正常
- 端口是否被占用

#### 数据库连接失败

检查以下几点：
- 数据库服务是否运行
- 连接参数是否正确
- 数据库用户是否有权限
- 防火墙是否阻止连接

#### 性能问题

检查以下几点：
- 数据库查询是否优化
- 是否有内存泄漏
- 服务器资源是否充足
- 是否有慢查询

### 2. 日志分析

查看应用日志：
```bash
tail -f logs/app.log
```

查看Nginx日志：
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

查看系统日志：
```bash
journalctl -u room-expense-api -f
```

## 更新与维护

### 1. 应用更新

1. 备份当前应用和数据库
2. 获取最新代码：
   ```bash
   git pull origin main
   ```
3. 安装新依赖：
   ```bash
   npm install --production
   ```
4. 运行数据库迁移（如果有）：
   ```bash
   npm run migrate
   ```
5. 重启应用：
   ```bash
   pm2 restart room-expense-api
   ```

### 2. 定期维护任务

- 每周检查日志文件大小
- 每月检查数据库性能
- 每季度检查安全更新
- 每年审查和更新备份策略

## 联系支持

如果在部署过程中遇到问题，请联系技术支持：

- 邮箱：support@example.com
- 文档：https://docs.example.com
- 问题追踪：https://github.com/your-repo/room-expense-system/issues