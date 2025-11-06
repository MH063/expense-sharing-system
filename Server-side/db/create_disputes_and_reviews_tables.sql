-- 创建争议与评价表
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- open|in_review|resolved|rejected
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引与外键占位（实际项目中请确保bills/users存在并添加外键约束）
CREATE INDEX IF NOT EXISTS idx_disputes_bill_id ON disputes(bill_id);
CREATE INDEX IF NOT EXISTS idx_disputes_creator_id ON disputes(creator_id);
CREATE INDEX IF NOT EXISTS idx_reviews_bill_id ON reviews(bill_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
