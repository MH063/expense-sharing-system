-- 创建记账系统数据库脚本
-- 此脚本用于创建记账系统所需的数据库

-- 注意：执行此脚本前需要确保已连接到postgres数据库或其他默认数据库

-- 删除已存在的数据库（谨慎使用，仅在开发环境中）
DROP DATABASE IF EXISTS room_expense_db;

-- 创建数据库
CREATE DATABASE room_expense_db WITH ENCODING 'UTF8';

-- 连接到新创建的数据库
\c room_expense_db

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 数据库创建完成

-- 接下来执行初始化脚本
-- \i init-database.sql