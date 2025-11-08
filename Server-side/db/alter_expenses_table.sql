-- 修改费用表结构，添加与按在寝天数分摊相关的字段

-- 添加费用计算方式字段
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS calculation_method VARCHAR(20) DEFAULT 'amount'; -- 'amount' 或 'reading'

-- 添加读数字段
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS last_reading DECIMAL(10,2);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS current_reading DECIMAL(10,2);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2);

-- 添加计费周期字段
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS billing_start_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS billing_end_date DATE;

-- 添加精度版本字段
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS precision_version INTEGER DEFAULT 1;

-- 添加舍入方法字段
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rounding_method VARCHAR(20) DEFAULT 'bankers'; -- 'bankers' 或 'standard'

-- 添加字段注释
COMMENT ON COLUMN expenses.calculation_method IS '费用计算方式：amount-固定金额，reading-读数计算';
COMMENT ON COLUMN expenses.last_reading IS '上次读数，用于读数计算方式';
COMMENT ON COLUMN expenses.current_reading IS '当前读数，用于读数计算方式';
COMMENT ON COLUMN expenses.unit_price IS '单价，用于读数计算方式';
COMMENT ON COLUMN expenses.billing_start_date IS '计费周期开始日期，用于按天数分摊';
COMMENT ON COLUMN expenses.billing_end_date IS '计费周期结束日期，用于按天数分摊';
COMMENT ON COLUMN expenses.precision_version IS '精度计算版本，用于兼容不同精度算法';
COMMENT ON COLUMN expenses.rounding_method IS '舍入方法：bankers-银行家舍入法，standard-标准四舍五入';