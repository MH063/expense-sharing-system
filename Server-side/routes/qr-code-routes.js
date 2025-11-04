const express = require('express');
const multer = require('multer');
const path = require('path');
const qrCodeController = require('../controllers/qr-code-controller');
const { authenticateToken } = require('../middleware/tokenManager');

const router = express.Router();

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../temp-uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // 只允许图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  },
  fileFilter: fileFilter
});

// 确保临时上传目录存在
const fs = require('fs');
const tempDir = path.join(__dirname, '../temp-uploads');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * 收款码管理路由
 * 所有路由都需要认证
 */

// 上传收款码
router.post('/upload', authenticateToken, upload.single('qr_image'), qrCodeController.uploadQrCode);

// 获取用户收款码列表
router.get('/', authenticateToken, qrCodeController.getUserQrCodes);

// 激活/停用收款码
router.patch('/:id/status', authenticateToken, qrCodeController.toggleQrCodeStatus);

// 设置默认收款码
router.patch('/:id/default', authenticateToken, qrCodeController.setDefaultQrCode);

// 删除收款码
router.delete('/:id', authenticateToken, qrCodeController.deleteQrCode);

// 获取用户的默认收款码
router.get('/default', authenticateToken, qrCodeController.getDefaultQrCode);

module.exports = router;