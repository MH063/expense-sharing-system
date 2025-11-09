-- 创建记账系统生产环境数据库脚本
-- 此脚本用于创建记账系统生产环境所需的数据库

-- 注意：执行此脚本前需要确保已连接到postgres数据库或其他默认数据库

-- 创建生产环境数据库（如果不存在）
SELECT 'CREATE DATABASE expense_prod WITH ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'expense_prod')\gexec

-- 连接到新创建的数据库
\c expense_prod

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 数据库创建完成

-- 接下来执行初始化脚本
-- \i init-database.sql