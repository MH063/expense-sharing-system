-- 修改费用分摊表结构，添加与按在寝天数分摊相关的字段

-- 添加在寝天数字段
ALTER TABLE expense_splits ADD COLUMN IF NOT EXISTS present_days INTEGER;

-- 添加分摊比例字段
ALTER TABLE expense_splits ADD COLUMN IF NOT EXISTS split_ratio DECIMAL(5,2);

-- 添加尾差调整字段
ALTER TABLE expense_splits ADD COLUMN IF NOT EXISTS rounding_adjustment DECIMAL(10,2) DEFAULT 0;

-- 添加字段注释
COMMENT ON COLUMN expense_splits.present_days IS '在寝天数，用于按天数分摊';
COMMENT ON COLUMN expense_splits.split_ratio IS '分摊比例，用于各种分摊方式';
COMMENT ON COLUMN expense_splits.rounding_adjustment IS '尾差调整金额，用于处理四舍五入导致的尾差';