-- 创建记账系统开发环境数据库脚本
-- 此脚本用于创建记账系统开发环境所需的数据库

-- 注意：执行此脚本前需要确保已连接到postgres数据库或其他默认数据库

-- 删除已存在的开发数据库（谨慎使用，仅在开发环境中）
DROP DATABASE IF EXISTS expense_dev;

-- 创建开发环境数据库
CREATE DATABASE expense_dev WITH ENCODING 'UTF8';

-- 连接到新创建的数据库
\c expense_dev

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 数据库创建完成

-- 接下来执行初始化脚本
-- \i init-database.sql