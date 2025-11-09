-- 创建记账系统测试环境数据库脚本
-- 此脚本用于创建记账系统测试环境所需的数据库

-- 注意：执行此脚本前需要确保已连接到postgres数据库或其他默认数据库

-- 删除已存在的测试数据库（谨慎使用，仅在测试环境中）
DROP DATABASE IF EXISTS expense_test;

-- 创建测试环境数据库
CREATE DATABASE expense_test WITH ENCODING 'UTF8';

-- 连接到新创建的数据库
\c expense_test

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 数据库创建完成

-- 接下来执行初始化脚本
-- \i init-database.sql