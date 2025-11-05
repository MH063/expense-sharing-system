const express = require('express');
const router = express.Router();
const billController = require('../controllers/bill-controller');
const { authenticateToken, checkRole } = require('../middleware/tokenManager');
const { 
  billValidationRules, 
  handleValidationErrors 
} = require('../middleware/validation-middleware');
const multer = require('multer');
const path = require('path');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/receipts/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // 检查文件类型
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// 创建账单
router.post(
  '/',
  authenticateToken,
  billValidationRules.create,
  handleValidationErrors,
  billController.createBill
);

// 上传账单收据
router.post('/receipt', authenticateToken, upload.single('receipt'), billController.uploadReceipt);

// 获取账单列表
router.get('/', authenticateToken, billController.getBills);

// 获取账单详情
router.get('/:id', authenticateToken, billController.getBillById);

// 更新账单
router.put(
  '/:id',
  authenticateToken,
  billValidationRules.update,
  handleValidationErrors,
  billController.updateBill
);

// 删除账单
router.delete('/:id', authenticateToken, billController.deleteBill);

// 审核账单（寝室管理员）
router.post(
  '/:id/review',
  authenticateToken,
  billValidationRules.review,
  handleValidationErrors,
  billController.reviewBill
);

// 确认支付账单分摊
router.post('/:id/payment', authenticateToken, billController.confirmBillPayment);

// 重新计算账单分摊
router.put(
  '/:id/split',
  authenticateToken,
  handleValidationErrors,
  billController.recalculateBillSplit
);

// 记录还款和结算
router.post(
  '/:bill_id/settlements',
  authenticateToken,
  handleValidationErrors,
  billController.recordSettlement
);

// 获取账单结算记录
router.get('/:bill_id/settlements', authenticateToken, billController.getBillSettlements);

// 获取用户的账单统计
router.get('/stats/user', authenticateToken, billController.getUserBillStats);

// 获取寝室的账单统计
router.get('/stats/room', authenticateToken, billController.getRoomBillStats);

// 获取时间范围内的账单统计
router.get('/stats/date-range', authenticateToken, billController.getBillStatsByDateRange);

// 账单评论
router.post('/:id/comments', authenticateToken, billController.addBillComment);
router.get('/:id/comments', authenticateToken, billController.getBillComments);

// 账单分享（需要创建者或房间管理员）
router.post('/:id/share', authenticateToken, billController.createBillShare);
// 通过分享码获取账单（允许未认证访问，若需限制可加鉴权）
router.get('/share/:code', billController.getBillByShareCode);

module.exports = router;