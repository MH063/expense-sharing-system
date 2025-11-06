const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const { roleAwareRateLimiter } = require('../middleware/rateLimiter');
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

router.post('/upload', authenticateToken, roleAwareRateLimiter('strict'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: '未接收到文件' });
  res.status(201).json({ success: true, file: { filename: req.file.filename, size: req.file.size } });
});

router.get('/', authenticateToken, roleAwareRateLimiter('loose'), async (req, res) => {
  const files = fs.readdirSync(uploadDir).map(name => ({ name }));
  res.status(200).json({ success: true, files });
});

router.delete('/:name', authenticateToken, roleAwareRateLimiter('strict'), async (req, res) => {
  const filePath = path.join(uploadDir, req.params.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: '文件不存在' });
  fs.unlinkSync(filePath);
  res.status(200).json({ success: true, message: '已删除' });
});

module.exports = router;
