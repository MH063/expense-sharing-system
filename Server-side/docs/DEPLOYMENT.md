# 部署文档

## 概述

本文档描述了如何部署寝室费用分摊记账系统的后端服务，包括支付优化功能的完整部署流程。

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
- **PostgreSQL**: 12.0或更高版本
- **Redis**: 6.0或更高版本 (用于分布式锁和缓存)

## 环境准备

### 1. 安装Node.js

从[Node.js官网](https://nodejs.org/)下载并安装适合您操作系统的Node.js版本。

验证安装：
```bash
node --version
npm --version
```

### 2. 安装PostgreSQL

#### Windows

1. 从[PostgreSQL官网](https://www.postgresql.org/download/windows/)下载PostgreSQL安装程序
2. 运行安装程序，按照向导完成安装
3. 设置postgres用户密码
4. 配置PostgreSQL服务

#### Linux (Ubuntu)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres psql
```

#### macOS

```bash
brew install postgresql
brew services start postgresql
```

### 3. 安装Redis

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

> 提示：已新增三环境一键初始化脚本与指南，详见 `Server-side/docs/DB_INIT_GUIDE.md`。

### 快速初始化（推荐）
```bash
psql -U postgres -h localhost -f "Server-side/db/init_all_envs.sql"
```
上述命令将创建 `expense_dev/expense_test/expense_prod` 并导入统一 schema。

### 手动初始化（单环境）
```bash
psql -U postgres -h localhost -c "CREATE DATABASE expense_dev" || echo 已存在
psql -U postgres -h localhost -f "Server-side/db/init_dev.sql"
```



### 1. 创建数据库

登录PostgreSQL控制台：
```bash
sudo -u postgres psql
```

创建数据库：
```sql
CREATE DATABASE room_expense_db;
```

创建数据库用户：
```sql
CREATE USER expense_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE room_expense_db TO expense_user;
\q
```

### 2. 导入数据库结构

```bash
psql -h localhost -U expense_user -d room_expense_db < database/schema.sql
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
DB_PORT=5432
DB_NAME=room_expense_db
DB_USER=expense_user
DB_PASSWORD=your_password

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# 支付优化配置
PAYMENT_SYNC_RETRY_LIMIT=5
PAYMENT_SYNC_RETRY_DELAY_BASE=1000
PAYMENT_SYNC_MAX_DELAY=60000
PAYMENT_REMINDER_ENABLED=true
PAYMENT_REMINDER_SCHEDULE=0 12 * * *
PAYMENT_SYNC_SCHEDULE=0 */2 * * *
PAYMENT_CLEANUP_SCHEDULE=0 2 * * *

# Redis配置（用于分布式锁和缓存）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 消息通知配置
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY_ID=your_sms_access_key
SMS_ACCESS_KEY_SECRET=your_sms_secret
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@example.com
EMAIL_PASS=your_email_password

# 文件上传配置
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log
PAYMENT_LOG_FILE=logs/payment.log

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

## 数据库初始化

支付优化功能需要额外的数据库表。请执行以下SQL脚本：

```sql
-- 创建支付记录表
CREATE TABLE IF NOT EXISTS payment_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  bill_id INTEGER NOT NULL REFERENCES bills(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'online',
  payment_time TIMESTAMP NOT NULL,
  transaction_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  note TEXT,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建支付记录索引
CREATE INDEX idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX idx_payment_records_bill_id ON payment_records(bill_id);
CREATE INDEX idx_payment_records_status ON payment_records(status);
CREATE INDEX idx_payment_records_sync_status ON payment_records(sync_status);
CREATE INDEX idx_payment_records_payment_time ON payment_records(payment_time);

-- 创建消息模板表
CREATE TABLE IF NOT EXISTS message_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'app',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认消息模板
INSERT INTO message_templates (name, title, content, channel) VALUES
('payment_reminder', '支付提醒', '您好，{{userName}}！您有一笔账单"{{billTitle}}"需要在{{dueDate}}前支付，金额为{{amount}}元。请及时支付以免产生逾期费用。', 'app'),
('payment_reminder_sms', '支付提醒', '【寝室记账】{{userName}}，您有账单"{{billTitle}}"需在{{dueDate}}前支付{{amount}}元。', 'sms'),
('payment_sync_success', '支付同步成功', '您的离线支付记录已成功同步，账单"{{billTitle}}"支付状态已更新。', 'app'),
('payment_sync_failed', '支付同步失败', '您的离线支付记录同步失败，请稍后重试或联系管理员。错误信息：{{errorMessage}}', 'app');

-- 创建通知记录表
CREATE TABLE IF NOT EXISTS notification_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  bill_id INTEGER REFERENCES bills(id),
  payment_id INTEGER REFERENCES payment_records(id),
  channel VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建通知记录索引
CREATE INDEX idx_notification_records_user_id ON notification_records(user_id);
CREATE INDEX idx_notification_records_status ON notification_records(status);
CREATE INDEX idx_notification_records_created_at ON notification_records(created_at);

-- 创建定时任务状态表
CREATE TABLE IF NOT EXISTS task_status (
  id SERIAL PRIMARY KEY,
  task_name VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'idle',
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认定时任务
INSERT INTO task_status (task_name, status) VALUES
('payment_reminder', 'idle'),
('payment_sync', 'idle'),
('payment_cleanup', 'idle');
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
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }, {
    name: 'payment-reminder',
    script: './utils/scheduler.js',
    instances: 1,
    cron: '0 12 * * *', // 每天12:00执行
    env: {
      NODE_ENV: 'production',
      TASK_TYPE: 'payment_reminder'
    },
    error_file: 'logs/payment-reminder-err.log',
    out_file: 'logs/payment-reminder-out.log',
    log_file: 'logs/payment-reminder.log'
  }, {
    name: 'payment-sync',
    script: './utils/scheduler.js',
    instances: 1,
    cron: '0 */2 * * *', // 每2小时执行一次
    env: {
      NODE_ENV: 'production',
      TASK_TYPE: 'payment_sync'
    },
    error_file: 'logs/payment-sync-err.log',
    out_file: 'logs/payment-sync-out.log',
    log_file: 'logs/payment-sync.log'
  }, {
    name: 'payment-cleanup',
    script: './utils/scheduler.js',
    instances: 1,
    cron: '0 2 * * *', // 每天凌晨2:00执行
    env: {
      NODE_ENV: 'production',
      TASK_TYPE: 'payment_cleanup'
    },
    error_file: 'logs/payment-cleanup-err.log',
    out_file: 'logs/payment-cleanup-out.log',
    log_file: 'logs/payment-cleanup.log'
  }]
};
```

3. 启动应用和定时任务：

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 使用系统服务

1. 创建systemd服务文件 `/etc/systemd/system/room-expense-api.service`：

```ini
[Unit]
Description=Room Expense API
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/path/to/your/app
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

2. 启动服务：

```bash
sudo systemctl start room-expense-api
sudo systemctl enable room-expense-api
```

## Redis配置

支付优化功能使用Redis实现分布式锁和缓存，请确保Redis服务正常运行：

1. 启动Redis服务：

```bash
# Linux
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Windows
redis-server.exe
```

2. 验证Redis连接：

```bash
redis-cli ping
```

## 日志配置

支付优化功能会产生大量日志，建议配置日志轮转：

1. 创建logrotate配置文件 `/etc/logrotate.d/room-expense-api`：

```bash
/path/to/your/app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 node node
    postrotate
        pm2 reload room-expense-api
    endscript
}
```

2. 测试logrotate配置：

```bash
logrotate -d /etc/logrotate.d/room-expense-api
```

## 验证部署

1. 检查API服务状态：

```bash
curl http://localhost:3000/api/health
```

2. 检查支付优化API：

```bash
# 获取账单收款码
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/payments/bill/1/qrcode

# 创建离线支付记录
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN" \
-d '{"billId": 1, "amount": 50.00, "paymentMethod": "offline", "note": "线下支付"}' \
http://localhost:3000/api/payments/offline
```

3. 检查定时任务状态：

```bash
pm2 list
```

## 监控和告警

建议设置以下监控和告警：

1. **支付同步失败率监控**：当支付同步失败率超过5%时发送告警
2. **定时任务执行状态监控**：当定时任务连续失败3次以上时发送告警
3. **Redis连接状态监控**：当Redis连接失败时发送告警
4. **磁盘空间监控**：当日志目录磁盘空间使用率超过80%时发送告警

## 性能优化建议

1. **数据库优化**：
   - 为支付记录表添加适当的索引
   - 定期清理过期的日志和临时数据
   - 考虑对历史数据进行归档

2. **缓存优化**：
   - 配置Redis缓存热点数据
   - 设置合理的缓存过期时间
   - 监控缓存命中率

3. **应用优化**：
   - 使用PM2集群模式提高并发处理能力
   - 配置适当的连接池大小
   - 启用gzip压缩减少网络传输

## 故障排查

1. **支付同步失败**：
   - 检查网络连接
   - 查看支付同步日志
   - 检查第三方支付接口状态

2. **定时任务未执行**：
   - 检查cron配置
   - 查看定时任务日志
   - 验证脚本执行权限

3. **性能问题**：
   - 检查数据库慢查询日志
   - 监控系统资源使用情况
   - 分析应用性能瓶颈

## 备份与恢复

### 数据库备份

```bash
# 创建备份
pg_dump -h localhost -U expense_user room_expense_db > backup.sql

# 恢复备份
psql -h localhost -U expense_user room_expense_db < backup.sql
```

### 应用备份

```bash
# 创建应用备份
tar -czf room-expense-api-backup.tar.gz /path/to/your/app

# 恢复应用备份
tar -xzf room-expense-api-backup.tar.gz -C /path/to/restore
```

## 升级指南

1. 备份当前应用和数据：

```bash
# 备份数据库
pg_dump -h localhost -U expense_user room_expense_db > backup_before_upgrade.sql

# 备份应用文件
tar -czf app-backup-before-upgrade.tar.gz /path/to/your/app
```

2. 停止应用：

```bash
pm2 stop all
```

3. 更新代码：

```bash
git pull origin main
npm install --production
npm run build
```

4. 运行数据库迁移（如果有）：

```bash
npm run migrate
```

5. 重启应用：

```bash
pm2 start ecosystem.config.js
```

6. 验证升级：

```bash
# 检查API状态
curl http://localhost:3000/api/health

# 检查新功能
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/payments/offline
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