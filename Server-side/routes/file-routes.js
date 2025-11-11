const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const { roleAwareRateLimiter } = require('../middleware/rateLimiter');
const { checkFileContent, strictFileTypeValidation, advancedFileContentCheck } = require('../middleware/fileSecurity');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeName);
  }
});
const upload = multer({ storage });

router.post('/upload', authenticateToken, roleAwareRateLimiter('strict'), checkFileContent, strictFileTypeValidation, advancedFileContentCheck, upload.single('file'), async (req, res) => {
  if (!req.file) return res.clientError('未接收到文件');
  res.success(201, '文件上传成功', { filename: req.file.filename, size: req.file.size });
});

router.get('/', authenticateToken, roleAwareRateLimiter('loose'), async (req, res) => {
  const files = fs.readdirSync(uploadDir).map(name => ({ name }));
  res.success(200, '获取文件列表成功', files);
});

router.delete('/:name', authenticateToken, roleAwareRateLimiter('strict'), async (req, res) => {
  const filePath = path.join(uploadDir, req.params.name);
  if (!fs.existsSync(filePath)) return res.notFound('文件不存在');
  fs.unlinkSync(filePath);
  res.success(200, '文件删除成功');
});

module.exports = router;